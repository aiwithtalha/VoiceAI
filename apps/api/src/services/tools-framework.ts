/**
 * Tools Framework Service
 * 
 * Core service for executing predefined and custom tools in the Voice AI Platform.
 * Handles tool validation, execution, logging, and result formatting.
 * 
 * @module services/tools-framework
 */

import { z } from 'zod';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { predefinedTools } from '../data/predefined-tools';
import { executeCustomTool } from './custom-tools';
import { prisma } from '../lib/prisma';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Context passed to tool executions containing call and workspace information
 */
export interface ToolExecutionContext {
  /** Unique call identifier */
  callId: string;
  /** Workspace/tenant identifier */
  workspaceId: string;
  /** Agent configuration ID */
  agentId: string;
  /** Phone number of the caller */
  callerPhone?: string;
  /** Current conversation session ID */
  sessionId: string;
  /** User ID of the authenticated caller (if known) */
  userId?: string;
  /** Collected information during the call */
  collectedData: Record<string, any>;
  /** Integration tokens for external services */
  integrationTokens: Record<string, string>;
}

/**
 * Result of a tool execution
 */
export interface ToolExecutionResult {
  /** Whether the execution was successful */
  success: boolean;
  /** Tool output data */
  data?: any;
  /** Error message if execution failed */
  error?: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Timestamp of execution */
  timestamp: Date;
}

/**
 * Tool execution log entry
 */
export interface ToolExecutionLog {
  id: string;
  callId: string;
  workspaceId: string;
  toolId: string;
  toolType: 'predefined' | 'custom';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  duration: number;
  success: boolean;
  createdAt: Date;
}

// ============================================================================
// Input Validation Schemas
// ============================================================================

const TransferCallInputSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  warmTransfer: z.boolean().default(false),
});

const EndCallInputSchema = z.object({
  reason: z.string().min(1).max(500),
});

const SendSMSInputSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  message: z.string().min(1).max(1600),
});

const BookAppointmentInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  name: z.string().min(1).max(200),
  email: z.string().email('Invalid email address'),
  duration: z.number().min(15).max(240).optional().default(30),
  description: z.string().max(1000).optional(),
});

const CollectInfoInputSchema = z.object({
  field: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_]+$/, 'Field name must be alphanumeric with underscores'),
  value: z.string().min(1).max(5000),
});

const APIRequestInputSchema = z.object({
  url: z.string().url('Invalid URL format'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.record(z.string()).optional().default({}),
  body: z.record(z.any()).optional(),
  timeout: z.number().min(1000).max(30000).optional().default(10000),
  retries: z.number().min(0).max(3).optional().default(1),
});

/** Map of tool IDs to their Zod validation schemas */
const toolValidationSchemas: Record<string, z.ZodSchema> = {
  transfer_call: TransferCallInputSchema,
  end_call: EndCallInputSchema,
  send_sms: SendSMSInputSchema,
  book_appointment: BookAppointmentInputSchema,
  collect_info: CollectInfoInputSchema,
  api_request: APIRequestInputSchema,
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates tool input against its schema
 * 
 * @param toolId - The identifier of the tool being executed
 * @param input - The raw input data to validate
 * @returns Validated and typed input data
 * @throws Error if validation fails
 */
export function validateToolInput(toolId: string, input: unknown): Record<string, any> {
  const schema = toolValidationSchemas[toolId];
  
  if (!schema) {
    // For custom tools, validation is handled separately
    if (toolId.startsWith('custom_')) {
      return input as Record<string, any>;
    }
    throw new Error(`Unknown tool: ${toolId}`);
  }

  const result = schema.safeParse(input);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Input validation failed: ${errors}`);
  }

  return result.data;
}

// ============================================================================
// Tool Execution Functions
// ============================================================================

/**
 * Main entry point for executing any tool
 * 
 * @param toolId - The tool identifier (predefined or custom)
 * @param input - Tool input parameters
 * @param context - Execution context with call/workspace info
 * @returns Tool execution result
 */
export async function executeTool(
  toolId: string,
  input: unknown,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const isCustomTool = toolId.startsWith('custom_');

  logger.info({ toolId, callId: context.callId }, 'Executing tool');

  try {
    // Validate input
    const validatedInput = validateToolInput(toolId, input);

    // Execute the appropriate tool
    let result: any;
    
    if (isCustomTool) {
      // Execute custom tool
      const customToolConfig = await getCustomToolConfig(toolId, context.workspaceId);
      result = await executeCustomTool(customToolConfig, validatedInput, context);
    } else {
      // Execute predefined tool
      result = await executePredefinedTool(toolId, validatedInput, context);
    }

    const duration = Date.now() - startTime;

    // Log successful execution
    await logToolExecution({
      callId: context.callId,
      workspaceId: context.workspaceId,
      toolId,
      toolType: isCustomTool ? 'custom' : 'predefined',
      input: validatedInput,
      output: result,
      duration,
      success: true,
    });

    // Record metrics
    metrics.timing('tool.execution.duration', duration, {
      tool: toolId,
      workspace: context.workspaceId,
    });
    metrics.increment('tool.execution.success', {
      tool: toolId,
      workspace: context.workspaceId,
    });

    return {
      success: true,
      data: result,
      duration,
      timestamp: new Date(),
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({ 
      toolId, 
      callId: context.callId, 
      error: errorMessage 
    }, 'Tool execution failed');

    // Log failed execution
    await logToolExecution({
      callId: context.callId,
      workspaceId: context.workspaceId,
      toolId,
      toolType: isCustomTool ? 'custom' : 'predefined',
      input: input as Record<string, any>,
      error: errorMessage,
      duration,
      success: false,
    });

    // Record metrics
    metrics.increment('tool.execution.failure', {
      tool: toolId,
      workspace: context.workspaceId,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
      duration,
      timestamp: new Date(),
    };
  }
}

/**
 * Executes a predefined tool by ID
 * 
 * @param toolId - Predefined tool identifier
 * @param input - Validated input parameters
 * @param context - Execution context
 * @returns Tool execution output
 */
async function executePredefinedTool(
  toolId: string,
  input: Record<string, any>,
  context: ToolExecutionContext
): Promise<any> {
  switch (toolId) {
    case 'transfer_call':
      return executeTransferCall(input, context);
    case 'end_call':
      return executeEndCall(input, context);
    case 'send_sms':
      return executeSendSMS(input, context);
    case 'book_appointment':
      return executeBookAppointment(input, context);
    case 'collect_info':
      return executeCollectInfo(input, context);
    case 'api_request':
      return executeAPIRequest(input, context);
    default:
      throw new Error(`Unknown predefined tool: ${toolId}`);
  }
}

// ============================================================================
// Predefined Tool Implementations
// ============================================================================

/**
 * Transfer call to another number
 */
async function executeTransferCall(
  input: z.infer<typeof TransferCallInputSchema>,
  context: ToolExecutionContext
): Promise<any> {
  logger.info({ 
    callId: context.callId, 
    to: input.phoneNumber,
    warmTransfer: input.warmTransfer 
  }, 'Transferring call');

  // In production, this would integrate with your telephony provider
  // (Twilio, Vonage, etc.) to perform the actual transfer
  const transferResult = {
    transferred: true,
    destination: input.phoneNumber,
    warmTransfer: input.warmTransfer,
    transferId: `xfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  // Update call record with transfer information
  await prisma.call.update({
    where: { id: context.callId },
    data: {
      transferredTo: input.phoneNumber,
      transferType: input.warmTransfer ? 'warm' : 'cold',
      status: 'transferred',
    },
  });

  return transferResult;
}

/**
 * End the current call
 */
async function executeEndCall(
  input: z.infer<typeof EndCallInputSchema>,
  context: ToolExecutionContext
): Promise<any> {
  logger.info({ callId: context.callId, reason: input.reason }, 'Ending call');

  // Update call record
  await prisma.call.update({
    where: { id: context.callId },
    data: {
      status: 'ended',
      endReason: input.reason,
      endedAt: new Date(),
    },
  });

  return {
    ended: true,
    reason: input.reason,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send SMS message
 */
async function executeSendSMS(
  input: z.infer<typeof SendSMSInputSchema>,
  context: ToolExecutionContext
): Promise<any> {
  logger.info({ callId: context.callId, to: input.to }, 'Sending SMS');

  // Get workspace SMS configuration
  const workspace = await prisma.workspace.findUnique({
    where: { id: context.workspaceId },
    select: { smsProvider: true, smsFromNumber: true },
  });

  if (!workspace?.smsFromNumber) {
    throw new Error('SMS not configured for this workspace');
  }

  // In production, integrate with SMS provider (Twilio, etc.)
  const smsResult = {
    sent: true,
    messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    to: input.to,
    from: workspace.smsFromNumber,
    messageLength: input.message.length,
    segments: Math.ceil(input.message.length / 160),
    timestamp: new Date().toISOString(),
  };

  // Log SMS in database
  await prisma.smsLog.create({
    data: {
      callId: context.callId,
      workspaceId: context.workspaceId,
      to: input.to,
      from: workspace.smsFromNumber,
      message: input.message,
      messageId: smsResult.messageId,
      status: 'sent',
    },
  });

  return smsResult;
}

/**
 * Book calendar appointment
 */
async function executeBookAppointment(
  input: z.infer<typeof BookAppointmentInputSchema>,
  context: ToolExecutionContext
): Promise<any> {
  logger.info({ 
    callId: context.callId, 
    date: input.date,
    time: input.time 
  }, 'Booking appointment');

  // Check for Google Calendar integration
  const googleIntegration = await prisma.integration.findFirst({
    where: {
      workspaceId: context.workspaceId,
      provider: 'google',
      status: 'active',
    },
  });

  if (!googleIntegration) {
    throw new Error('Google Calendar integration not connected');
  }

  // Combine date and time
  const startDateTime = new Date(`${input.date}T${input.time}`);
  const endDateTime = new Date(startDateTime.getTime() + (input.duration || 30) * 60000);

  // In production, this would call Google Calendar API
  const appointmentResult = {
    booked: true,
    appointmentId: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    calendarEventId: `evt_${Math.random().toString(36).substr(2, 16)}`,
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
    attendee: {
      name: input.name,
      email: input.email,
    },
    description: input.description,
    timestamp: new Date().toISOString(),
  };

  // Store appointment in database
  await prisma.appointment.create({
    data: {
      callId: context.callId,
      workspaceId: context.workspaceId,
      appointmentId: appointmentResult.appointmentId,
      calendarEventId: appointmentResult.calendarEventId,
      startTime: startDateTime,
      endTime: endDateTime,
      attendeeName: input.name,
      attendeeEmail: input.email,
      description: input.description,
    },
  });

  return appointmentResult;
}

/**
 * Collect and store information
 */
async function executeCollectInfo(
  input: z.infer<typeof CollectInfoInputSchema>,
  context: ToolExecutionContext
): Promise<any> {
  logger.info({ 
    callId: context.callId, 
    field: input.field 
  }, 'Collecting information');

  // Store in collected data
  const updatedData = {
    ...context.collectedData,
    [input.field]: input.value,
  };

  // Update call session with collected data
  await prisma.callSession.update({
    where: { id: context.sessionId },
    data: {
      collectedData: updatedData,
    },
  });

  return {
    collected: true,
    field: input.field,
    value: input.value,
    allData: updatedData,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Make HTTP API request
 */
async function executeAPIRequest(
  input: z.infer<typeof APIRequestInputSchema>,
  context: ToolExecutionContext
): Promise<any> {
  logger.info({ 
    callId: context.callId, 
    url: input.url,
    method: input.method 
  }, 'Making API request');

  const fetchWithTimeout = (url: string, options: RequestInit, timeout: number): Promise<Response> => {
    return Promise.race([
      fetch(url, options),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  };

  let lastError: Error | null = null;
  const maxRetries = input.retries || 1;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        input.url,
        {
          method: input.method,
          headers: {
            'Content-Type': 'application/json',
            ...input.headers,
          },
          body: input.body ? JSON.stringify(input.body) : undefined,
        },
        input.timeout || 10000
      );

      const responseData = await response.json().catch(() => null);

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn({ 
          attempt: attempt + 1, 
          delay,
          error: lastError.message 
        }, 'API request failed, retrying');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('API request failed after all retries');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Retrieves custom tool configuration from database
 */
async function getCustomToolConfig(toolId: string, workspaceId: string): Promise<any> {
  const customToolId = toolId.replace('custom_', '');
  
  const tool = await prisma.customTool.findFirst({
    where: {
      id: customToolId,
      workspaceId,
    },
  });

  if (!tool) {
    throw new Error(`Custom tool not found: ${toolId}`);
  }

  return tool;
}

/**
 * Logs tool execution to database
 */
async function logToolExecution(logData: Omit<ToolExecutionLog, 'id' | 'createdAt'>): Promise<void> {
  try {
    await prisma.toolExecutionLog.create({
      data: {
        callId: logData.callId,
        workspaceId: logData.workspaceId,
        toolId: logData.toolId,
        toolType: logData.toolType,
        input: logData.input,
        output: logData.output,
        error: logData.error,
        duration: logData.duration,
        success: logData.success,
      },
    });
  } catch (error) {
    // Don't fail the tool execution if logging fails
    logger.error({ error, logData }, 'Failed to log tool execution');
  }
}

/**
 * Gets execution logs for a specific call
 */
export async function getCallToolExecutions(callId: string): Promise<ToolExecutionLog[]> {
  const logs = await prisma.toolExecutionLog.findMany({
    where: { callId },
    orderBy: { createdAt: 'asc' },
  });

  return logs.map(log => ({
    id: log.id,
    callId: log.callId,
    workspaceId: log.workspaceId,
    toolId: log.toolId,
    toolType: log.toolType as 'predefined' | 'custom',
    input: log.input as Record<string, any>,
    output: log.output as Record<string, any> | undefined,
    error: log.error || undefined,
    duration: log.duration,
    success: log.success,
    createdAt: log.createdAt,
  }));
}

/**
 * Gets available tools for a workspace (predefined + custom)
 */
export async function getAvailableTools(workspaceId: string): Promise<any[]> {
  const customTools = await prisma.customTool.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      description: true,
      inputSchema: true,
    },
  });

  const predefined = predefinedTools.map(tool => ({
    ...tool,
    isPredefined: true,
  }));

  const custom = customTools.map(tool => ({
    id: `custom_${tool.id}`,
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    isPredefined: false,
  }));

  return [...predefined, ...custom];
}

export default {
  executeTool,
  validateToolInput,
  getAvailableTools,
  getCallToolExecutions,
};
