/**
 * Universal Voice AI Platform - OpenAI LLM Provider
 * 
 * Implementation of the LlmProvider interface for OpenAI.
 */

import {
  LlmProvider,
  LlmMessage,
  LlmFunction,
  LlmCompletionOptions,
  LlmCompletionResult,
  StreamingLlmResult,
  ProviderConfig,
  ProviderHealth,
} from './base';
import logger from '../../utils/logger';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
    finish_reason: string | null;
  }>;
}

export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai';
  private config: ProviderConfig;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 60000,
      ...config,
    };
    
    if (!config.apiKey) {
      throw new Error('OpenAI requires an API key');
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });
      
      if (response.ok) {
        return {
          status: 'healthy',
          latencyMs: Date.now() - startTime,
          lastCheckedAt: new Date(),
        };
      } else {
        return {
          status: 'degraded',
          latencyMs: Date.now() - startTime,
          lastCheckedAt: new Date(),
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        lastCheckedAt: new Date(),
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // List Models
  // ============================================================================

  async listModels(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    maxTokens: number;
    pricing: {
      input: number;
      output: number;
    };
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json() as { data: Array<{ id: string }> };
      
      // Filter and map relevant models
      const modelInfo: Record<string, { name: string; maxTokens: number; inputPrice: number; outputPrice: number }> = {
        'gpt-4': { name: 'GPT-4', maxTokens: 8192, inputPrice: 30, outputPrice: 60 },
        'gpt-4-turbo': { name: 'GPT-4 Turbo', maxTokens: 128000, inputPrice: 10, outputPrice: 30 },
        'gpt-4o': { name: 'GPT-4o', maxTokens: 128000, inputPrice: 5, outputPrice: 15 },
        'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', maxTokens: 16385, inputPrice: 0.5, outputPrice: 1.5 },
        'gpt-3.5-turbo-16k': { name: 'GPT-3.5 Turbo 16K', maxTokens: 16385, inputPrice: 1, outputPrice: 2 },
      };
      
      return data.data
        .filter((m) => m.id.startsWith('gpt-'))
        .map((m) => {
          const info = modelInfo[m.id] || { name: m.id, maxTokens: 4096, inputPrice: 0, outputPrice: 0 };
          return {
            id: m.id,
            name: info.name,
            maxTokens: info.maxTokens,
            pricing: {
              input: info.inputPrice,
              output: info.outputPrice,
            },
          };
        });
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to list OpenAI models');
      throw error;
    }
  }

  // ============================================================================
  // Complete (Non-Streaming)
  // ============================================================================

  async complete(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
    logger.debug(
      { model: options.model, messageCount: options.messages.length },
      'Creating OpenAI completion'
    );
    
    const requestBody: Record<string, unknown> = {
      model: options.model,
      messages: options.messages.map(this.mapMessageToOpenAI),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: false,
    };
    
    if (options.functions && options.functions.length > 0) {
      requestBody.functions = options.functions.map(this.mapFunctionToOpenAI);
      requestBody.function_call = options.functionCall || 'auto';
    }
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI completion error: ${error}`);
    }
    
    const data = await response.json() as {
      id: string;
      model: string;
      choices: Array<{
        message: OpenAIMessage;
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
    
    const choice = data.choices[0];
    
    return {
      id: data.id,
      model: data.model,
      message: this.mapMessageFromOpenAI(choice.message),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
      functionCall: choice.message.function_call
        ? {
            name: choice.message.function_call.name,
            arguments: JSON.parse(choice.message.function_call.arguments),
          }
        : undefined,
    };
  }

  // ============================================================================
  // Complete (Streaming)
  // ============================================================================

  async completeStream(
    options: LlmCompletionOptions,
    onChunk: (chunk: StreamingLlmResult) => void,
    onError: (error: Error) => void
  ): Promise<{
    id: string;
    model: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    logger.debug(
      { model: options.model, messageCount: options.messages.length },
      'Creating streaming OpenAI completion'
    );
    
    const requestBody: Record<string, unknown> = {
      model: options.model,
      messages: options.messages.map(this.mapMessageToOpenAI),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: true,
    };
    
    if (options.functions && options.functions.length > 0) {
      requestBody.functions = options.functions.map(this.mapFunctionToOpenAI);
      requestBody.function_call = options.functionCall || 'auto';
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI streaming error: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      let completionId = '';
      let model = '';
      let promptTokens = 0;
      let completionTokens = 0;
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const chunk: OpenAIStreamChunk = JSON.parse(line.slice(6));
              
              if (!completionId) completionId = chunk.id;
              if (!model) model = chunk.model;
              
              const choice = chunk.choices[0];
              if (!choice) continue;
              
              if (choice.delta.content) {
                completionTokens++;
              }
              
              onChunk({
                id: chunk.id,
                model: chunk.model,
                delta: {
                  content: choice.delta.content,
                  functionCall: choice.delta.function_call,
                },
                finishReason: choice.finish_reason
                  ? this.mapFinishReason(choice.finish_reason)
                  : undefined,
              });
            } catch (error) {
              logger.debug({ error: (error as Error).message, line }, 'Failed to parse stream chunk');
            }
          }
        }
      }
      
      // Estimate prompt tokens
      promptTokens = options.messages.reduce(
        (sum, m) => sum + this.countTokens(m.content, options.model),
        0
      );
      
      return {
        id: completionId,
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };
    } catch (error) {
      onError(error as Error);
      throw error;
    }
  }

  // ============================================================================
  // Count Tokens
  // ============================================================================

  countTokens(text: string, _model: string): number {
    // Rough estimation: ~4 characters per token for English text
    // For production, use a proper tokenizer like tiktoken
    return Math.ceil(text.length / 4);
  }

  // ============================================================================
  // Get Model
  // ============================================================================

  async getModel(modelId: string): Promise<{
    id: string;
    name: string;
    maxTokens: number;
    contextWindow: number;
  } | null> {
    const modelInfo: Record<string, { name: string; maxTokens: number; contextWindow: number }> = {
      'gpt-4': { name: 'GPT-4', maxTokens: 8192, contextWindow: 8192 },
      'gpt-4-turbo': { name: 'GPT-4 Turbo', maxTokens: 4096, contextWindow: 128000 },
      'gpt-4o': { name: 'GPT-4o', maxTokens: 4096, contextWindow: 128000 },
      'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', maxTokens: 4096, contextWindow: 16385 },
    };
    
    const info = modelInfo[modelId];
    if (!info) return null;
    
    return {
      id: modelId,
      name: info.name,
      maxTokens: info.maxTokens,
      contextWindow: info.contextWindow,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapMessageToOpenAI(message: LlmMessage): OpenAIMessage {
    return {
      role: message.role,
      content: message.content,
      name: message.name,
      function_call: message.functionCall,
    };
  }

  private mapMessageFromOpenAI(message: OpenAIMessage): LlmMessage {
    return {
      role: message.role,
      content: message.content,
      name: message.name,
      functionCall: message.function_call,
    };
  }

  private mapFunctionToOpenAI(func: LlmFunction): {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  } {
    return {
      name: func.name,
      description: func.description,
      parameters: func.parameters,
    };
  }

  private mapFinishReason(reason: string): 'stop' | 'length' | 'function_call' | 'content_filter' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'function_call':
        return 'function_call';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}

// Register the provider
import { providerRegistry } from './base';
providerRegistry.registerLlm('openai', OpenAIProvider);
