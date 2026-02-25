/**
 * Tool Executor
 * Executes predefined and custom tools during conversations
 * Handles built-in tools (transfer_call, end_call, send_sms) and custom API tools
 */

import axios, { AxiosRequestConfig, Method } from 'axios';
import { 
  ToolDefinition, 
  ToolCall, 
  ToolResult,
  ToolParameter 
} from '../types';
import { Logger } from '../utils/logger';

const logger = new Logger('ToolExecutor');

export interface ToolExecutorCallbacks {
  onToolExecuted: (result: ToolResult) => void;
}

export class ToolExecutor {
  private tools: Map<string, ToolDefinition>;
  private callbacks: ToolExecutorCallbacks;
  private builtinTools: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  constructor(tools: ToolDefinition[], callbacks: ToolExecutorCallbacks) {
    this.tools = new Map();
    this.callbacks = callbacks;
    this.builtinTools = new Map();
    
    // Register tools
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
    
    // Register built-in tools
    this.registerBuiltinTools();
  }

  /**
   * Register built-in tools
   */
  private registerBuiltinTools(): void {
    // Transfer call tool
    this.builtinTools.set('transfer_call', this.executeTransferCall.bind(this));
    
    // End call tool
    this.builtinTools.set('end_call', this.executeEndCall.bind(this));
    
    // Send SMS tool
    this.builtinTools.set('send_sms', this.executeSendSMS.bind(this));
    
    // Schedule callback tool
    this.builtinTools.set('schedule_callback', this.executeScheduleCallback.bind(this));
    
    // Hold call tool
    this.builtinTools.set('hold_call', this.executeHoldCall.bind(this));
    
    // Record consent tool
    this.builtinTools.set('record_consent', this.executeRecordConsent.bind(this));
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const startTime = Date.now();
    
    logger.info('Executing tool', { 
      toolName: toolCall.name,
      toolCallId: toolCall.id 
    });

    try {
      // Get tool definition
      const tool = this.tools.get(toolCall.name);
      
      if (!tool) {
        throw new Error(`Unknown tool: ${toolCall.name}`);
      }

      // Validate arguments
      this.validateArguments(tool, toolCall.arguments);

      let result: unknown;

      // Execute based on tool type
      if (tool.type === 'builtin') {
        result = await this.executeBuiltinTool(toolCall.name, toolCall.arguments);
      } else {
        result = await this.executeCustomTool(tool, toolCall.arguments);
      }

      const executionTimeMs = Date.now() - startTime;

      const toolResult: ToolResult = {
        toolCallId: toolCall.id,
        name: toolCall.name,
        success: true,
        result,
        executionTimeMs
      };

      logger.info('Tool executed successfully', { 
        toolName: toolCall.name,
        executionTimeMs 
      });

      this.callbacks.onToolExecuted(toolResult);
      return toolResult;

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      
      logger.error('Tool execution failed', { 
        toolName: toolCall.name,
        error 
      });

      const toolResult: ToolResult = {
        toolCallId: toolCall.id,
        name: toolCall.name,
        success: false,
        result: null,
        error: (error as Error).message,
        executionTimeMs
      };

      this.callbacks.onToolExecuted(toolResult);
      return toolResult;
    }
  }

  /**
   * Validate tool arguments against parameter definitions
   */
  private validateArguments(
    tool: ToolDefinition, 
    args: Record<string, unknown>
  ): void {
    for (const param of tool.parameters) {
      if (param.required && !(param.name in args)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }

      if (param.name in args) {
        const value = args[param.name];
        
        // Type validation
        if (!this.validateType(value, param.type)) {
          throw new Error(
            `Invalid type for parameter ${param.name}: expected ${param.type}`
          );
        }

        // Enum validation
        if (param.enum && !param.enum.includes(String(value))) {
          throw new Error(
            `Invalid value for parameter ${param.name}: must be one of ${param.enum.join(', ')}`
          );
        }
      }
    }
  }

  /**
   * Validate value type
   */
  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Execute a built-in tool
   */
  private async executeBuiltinTool(
    name: string, 
    args: Record<string, unknown>
  ): Promise<unknown> {
    const handler = this.builtinTools.get(name);
    
    if (!handler) {
      throw new Error(`Built-in tool not found: ${name}`);
    }

    return await handler(args);
  }

  /**
   * Execute a custom tool via API call
   */
  private async executeCustomTool(
    tool: ToolDefinition, 
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!tool.endpoint) {
      throw new Error(`Custom tool missing endpoint: ${tool.name}`);
    }

    const method = (tool.method || 'POST').toUpperCase() as Method;
    const timeout = tool.timeoutMs || 10000;

    const config: AxiosRequestConfig = {
      method,
      url: tool.endpoint,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        ...tool.headers
      }
    };

    // Add arguments to request
    if (method === 'GET' || method === 'DELETE') {
      config.params = args;
    } else {
      config.data = args;
    }

    logger.debug('Calling custom tool endpoint', { 
      url: tool.endpoint,
      method,
      args 
    });

    const response = await axios(config);
    return response.data;
  }

  // ============================================================================
  // Built-in Tool Implementations
  // ============================================================================

  /**
   * Transfer call to another destination
   */
  private async executeTransferCall(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const destination = args.destination as string;
    
    if (!destination) {
      throw new Error('Destination is required for transfer_call');
    }

    logger.info('Executing transfer_call', { destination });

    // In production, this would integrate with Twilio to perform the transfer
    // For now, return a success response
    return {
      success: true,
      message: `Call will be transferred to ${destination}`,
      destination,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * End the current call
   */
  private async executeEndCall(
    args: Record<string, unknown>
  ): Promise<unknown> {
    logger.info('Executing end_call');

    return {
      success: true,
      message: 'Call will be ended',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send an SMS message
   */
  private async executeSendSMS(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const to = args.to as string;
    const message = args.message as string;
    
    if (!to) {
      throw new Error('Recipient phone number (to) is required for send_sms');
    }
    
    if (!message) {
      throw new Error('Message content is required for send_sms');
    }

    logger.info('Executing send_sms', { to, messageLength: message.length });

    // In production, this would integrate with Twilio to send the SMS
    return {
      success: true,
      message: 'SMS sent successfully',
      to,
      messageLength: message.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Schedule a callback
   */
  private async executeScheduleCallback(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const phoneNumber = args.phone_number as string;
    const scheduledTime = args.scheduled_time as string;
    const notes = args.notes as string | undefined;
    
    if (!phoneNumber) {
      throw new Error('Phone number is required for schedule_callback');
    }
    
    if (!scheduledTime) {
      throw new Error('Scheduled time is required for schedule_callback');
    }

    logger.info('Executing schedule_callback', { phoneNumber, scheduledTime });

    return {
      success: true,
      message: 'Callback scheduled successfully',
      phoneNumber,
      scheduledTime,
      notes,
      callbackId: `cb-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Put call on hold
   */
  private async executeHoldCall(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const duration = args.duration_seconds as number | undefined;
    const holdMusic = args.hold_music as string | undefined;

    logger.info('Executing hold_call', { duration, holdMusic });

    return {
      success: true,
      message: 'Call placed on hold',
      duration,
      holdMusic,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Record call consent
   */
  private async executeRecordConsent(
    args: Record<string, unknown>
  ): Promise<unknown> {
    const consentGiven = args.consent_given as boolean;
    const recordingEnabled = args.recording_enabled as boolean | undefined;

    logger.info('Executing record_consent', { consentGiven, recordingEnabled });

    return {
      success: true,
      message: `Call recording consent ${consentGiven ? 'granted' : 'denied'}`,
      consentGiven,
      recordingEnabled: recordingEnabled ?? consentGiven,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // Tool Management
  // ============================================================================

  /**
   * Register a new tool
   */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    logger.info('Tool registered', { toolName: tool.name });
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolName: string): void {
    this.tools.delete(toolName);
    logger.info('Tool unregistered', { toolName });
  }

  /**
   * Get a tool definition
   */
  getTool(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool is registered
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Convert tools to OpenAI function format
   */
  toOpenAIFunctions(): Array<{
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  }> {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: this.convertParametersToSchema(tool.parameters),
        required: tool.parameters.filter(p => p.required).map(p => p.name)
      }
    }));
  }

  /**
   * Convert parameter definitions to JSON schema
   */
  private convertParametersToSchema(
    parameters: ToolParameter[]
  ): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    
    for (const param of parameters) {
      const schema: any = {
        type: param.type,
        description: param.description
      };
      
      if (param.enum) {
        schema.enum = param.enum;
      }
      
      properties[param.name] = schema;
    }
    
    return properties;
  }
}

/**
 * Create a new tool executor
 */
export function createToolExecutor(
  tools: ToolDefinition[],
  callbacks: ToolExecutorCallbacks
): ToolExecutor {
  return new ToolExecutor(tools, callbacks);
}

/**
 * Predefined tool definitions for common use cases
 */
export const PREDEFINED_TOOLS: Record<string, ToolDefinition> = {
  transfer_call: {
    id: 'transfer_call',
    name: 'transfer_call',
    description: 'Transfer the current call to another phone number or extension',
    type: 'builtin',
    parameters: [
      {
        name: 'destination',
        type: 'string',
        description: 'Phone number or extension to transfer the call to',
        required: true
      },
      {
        name: 'reason',
        type: 'string',
        description: 'Reason for the transfer',
        required: false
      }
    ]
  },
  
  end_call: {
    id: 'end_call',
    name: 'end_call',
    description: 'End the current phone call',
    type: 'builtin',
    parameters: [
      {
        name: 'reason',
        type: 'string',
        description: 'Reason for ending the call',
        required: false
      }
    ]
  },
  
  send_sms: {
    id: 'send_sms',
    name: 'send_sms',
    description: 'Send an SMS message to a phone number',
    type: 'builtin',
    parameters: [
      {
        name: 'to',
        type: 'string',
        description: 'Phone number to send the SMS to',
        required: true
      },
      {
        name: 'message',
        type: 'string',
        description: 'Content of the SMS message',
        required: true
      }
    ]
  },
  
  schedule_callback: {
    id: 'schedule_callback',
    name: 'schedule_callback',
    description: 'Schedule a callback for a later time',
    type: 'builtin',
    parameters: [
      {
        name: 'phone_number',
        type: 'string',
        description: 'Phone number to call back',
        required: true
      },
      {
        name: 'scheduled_time',
        type: 'string',
        description: 'When to make the callback (ISO 8601 format)',
        required: true
      },
      {
        name: 'notes',
        type: 'string',
        description: 'Notes about the callback',
        required: false
      }
    ]
  },
  
  hold_call: {
    id: 'hold_call',
    name: 'hold_call',
    description: 'Place the caller on hold',
    type: 'builtin',
    parameters: [
      {
        name: 'duration_seconds',
        type: 'number',
        description: 'How long to keep on hold (0 for indefinite)',
        required: false
      },
      {
        name: 'hold_music',
        type: 'string',
        description: 'URL to hold music audio file',
        required: false
      }
    ]
  },
  
  record_consent: {
    id: 'record_consent',
    name: 'record_consent',
    description: 'Record whether the caller has consented to call recording',
    type: 'builtin',
    parameters: [
      {
        name: 'consent_given',
        type: 'boolean',
        description: 'Whether the caller has given consent',
        required: true
      },
      {
        name: 'recording_enabled',
        type: 'boolean',
        description: 'Whether recording should be enabled',
        required: false
      }
    ]
  }
};
