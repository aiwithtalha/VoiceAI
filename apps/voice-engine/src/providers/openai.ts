/**
 * OpenAI LLM Provider
 * Streaming chat completions with GPT-4o-mini
 * Supports tool calling and function execution
 */

import OpenAI from 'openai';
import { 
  OpenAIMessage, 
  OpenAIToolCall,
  OpenAIFunctionDefinition,
  ModelConfig,
  ToolDefinition,
  AssistantConfig 
} from '../types';
import { Logger } from '../utils/logger';

const logger = new Logger('OpenAIProvider');

export interface OpenAICallbacks {
  onContent: (content: string) => void;
  onToolCall: (toolCall: OpenAIToolCall) => void;
  onComplete: (fullContent: string, toolCalls: OpenAIToolCall[]) => void;
  onError: (error: Error) => void;
}

export class OpenAIProvider {
  private client: OpenAI;
  private config: ModelConfig;
  private callbacks: OpenAICallbacks;
  private abortController: AbortController | null = null;
  private isStreaming = false;

  constructor(apiKey: string, config: ModelConfig, callbacks: OpenAICallbacks) {
    this.client = new OpenAI({ apiKey });
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Convert our tool definitions to OpenAI function format
   */
  private convertTools(tools: ToolDefinition[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: this.convertParameters(tool.parameters),
          required: tool.parameters.filter(p => p.required).map(p => p.name)
        }
      }
    }));
  }

  /**
   * Convert tool parameters to JSON schema
   */
  private convertParameters(parameters: ToolDefinition['parameters']): Record<string, any> {
    const properties: Record<string, any> = {};
    
    for (const param of parameters) {
      const prop: any = {
        type: param.type,
        description: param.description
      };
      
      if (param.enum) {
        prop.enum = param.enum;
      }
      
      if (param.default !== undefined) {
        prop.default = param.default;
      }
      
      properties[param.name] = prop;
    }
    
    return properties;
  }

  /**
   * Convert our message format to OpenAI format
   */
  private convertMessages(messages: OpenAIMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.tool_call_id!
        };
      }
      
      if (msg.role === 'assistant' && msg.toolCalls) {
        return {
          role: 'assistant',
          content: msg.content,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }))
        };
      }
      
      return {
        role: msg.role,
        content: msg.content,
        name: msg.name
      };
    });
  }

  /**
   * Stream a chat completion
   * @param messages Conversation history
   * @param tools Available tools for function calling
   */
  async streamCompletion(
    messages: OpenAIMessage[],
    tools: ToolDefinition[] = []
  ): Promise<void> {
    if (this.isStreaming) {
      logger.warn('Already streaming, aborting previous request');
      this.abort();
    }

    this.isStreaming = true;
    this.abortController = new AbortController();

    try {
      logger.info('Starting streaming completion', { 
        model: this.config.model,
        messageCount: messages.length,
        toolCount: tools.length
      });

      const openaiTools = tools.length > 0 ? this.convertTools(tools) : undefined;
      const openaiMessages = this.convertMessages(messages);

      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: openaiMessages,
        tools: openaiTools,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 150,
        top_p: this.config.topP ?? 1,
        frequency_penalty: this.config.frequencyPenalty ?? 0,
        presence_penalty: this.config.presencePenalty ?? 0,
        stream: true
      }, {
        signal: this.abortController.signal
      });

      let fullContent = '';
      const toolCalls: Map<number, OpenAIToolCall> = new Map();

      for await (const chunk of stream) {
        // Handle content
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          fullContent += delta.content;
          this.callbacks.onContent(delta.content);
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index;
            
            if (!toolCalls.has(index)) {
              toolCalls.set(index, {
                id: toolCallDelta.id || '',
                type: 'function',
                function: {
                  name: toolCallDelta.function?.name || '',
                  arguments: toolCallDelta.function?.arguments || ''
                }
              });
            } else {
              const existing = toolCalls.get(index)!;
              if (toolCallDelta.function?.name) {
                existing.function.name += toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                existing.function.arguments += toolCallDelta.function.arguments;
              }
            }
          }
        }

        // Check for finish reason
        if (chunk.choices[0]?.finish_reason) {
          logger.debug('Stream finished', { 
            reason: chunk.choices[0].finish_reason 
          });
        }
      }

      // Process completed tool calls
      const completedToolCalls: OpenAIToolCall[] = [];
      for (const [_, toolCall] of toolCalls) {
        // Validate and parse tool call arguments
        try {
          if (toolCall.function.arguments) {
            JSON.parse(toolCall.function.arguments); // Validate JSON
          }
          completedToolCalls.push(toolCall);
          this.callbacks.onToolCall(toolCall);
        } catch (error) {
          logger.error('Invalid tool call arguments', { toolCall, error });
        }
      }

      logger.info('Streaming completion finished', { 
        contentLength: fullContent.length,
        toolCallCount: completedToolCalls.length
      });

      this.callbacks.onComplete(fullContent, completedToolCalls);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.info('Stream aborted');
      } else {
        logger.error('Streaming completion error', { error });
        this.callbacks.onError(error as Error);
      }
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  /**
   * Send a non-streaming completion request
   * Useful for quick responses or tool execution results
   */
  async complete(
    messages: OpenAIMessage[],
    tools: ToolDefinition[] = []
  ): Promise<{ content: string; toolCalls: OpenAIToolCall[] }> {
    try {
      logger.info('Sending completion request', { 
        model: this.config.model,
        messageCount: messages.length 
      });

      const openaiTools = tools.length > 0 ? this.convertTools(tools) : undefined;
      const openaiMessages = this.convertMessages(messages);

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: openaiMessages,
        tools: openaiTools,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 150,
        top_p: this.config.topP ?? 1,
        frequency_penalty: this.config.frequencyPenalty ?? 0,
        presence_penalty: this.config.presencePenalty ?? 0,
        stream: false
      });

      const choice = response.choices[0];
      const content = choice.message.content || '';
      const rawToolCalls = choice.message.tool_calls || [];

      // Convert tool calls
      const toolCalls: OpenAIToolCall[] = rawToolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }));

      logger.info('Completion finished', { 
        contentLength: content.length,
        toolCallCount: toolCalls.length
      });

      return { content, toolCalls };

    } catch (error) {
      logger.error('Completion error', { error });
      throw error;
    }
  }

  /**
   * Abort the current streaming request
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isStreaming = false;
  }

  /**
   * Check if currently streaming
   */
  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Build system prompt from assistant configuration
   */
  static buildSystemPrompt(config: AssistantConfig): string {
    const parts: string[] = [];
    
    // Base system prompt
    parts.push(config.systemPrompt);
    
    // Add voice-specific instructions
    parts.push(`\nYou are speaking over the phone. Keep responses concise and natural.`);
    parts.push(`Use conversational language and avoid long explanations.`);
    parts.push(`If you need to transfer the call or send an SMS, use the appropriate tools.`);
    
    // Add tool usage instructions
    if (config.tools.length > 0) {
      parts.push(`\nAvailable tools:`);
      for (const tool of config.tools) {
        parts.push(`- ${tool.name}: ${tool.description}`);
      }
    }
    
    return parts.join('\n');
  }

  /**
   * Create initial messages with system prompt
   */
  static createInitialMessages(config: AssistantConfig): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: OpenAIProvider.buildSystemPrompt(config),
        timestamp: new Date()
      }
    ];
    
    // Add first message if configured
    if (config.firstMessage) {
      messages.push({
        role: 'assistant',
        content: config.firstMessage,
        timestamp: new Date()
      });
    }
    
    return messages;
  }
}

/**
 * Create a new OpenAI provider instance
 */
export function createOpenAIProvider(
  apiKey: string,
  config: ModelConfig,
  callbacks: OpenAICallbacks
): OpenAIProvider {
  return new OpenAIProvider(apiKey, config, callbacks);
}

/**
 * Parse tool call arguments safely
 */
export function parseToolCallArguments(toolCall: OpenAIToolCall): Record<string, any> {
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch (error) {
    logger.error('Failed to parse tool call arguments', { toolCall, error });
    return {};
  }
}
