/**
 * Universal Voice AI Platform - Tools Service
 * 
 * Handles custom tool CRUD, predefined tools, and tool execution.
 */

import logger from '../utils/logger';
import { ApiError, ErrorCode, Tool, ToolType, ToolConfig, ToolExecution, PredefinedTool, ToolParameter } from '../types';

// ============================================================================
// Mock Database Functions
// ============================================================================

const tools: Map<string, Tool> = new Map();
const toolExecutions: Map<string, ToolExecution> = new Map();

async function findToolById(id: string): Promise<Tool | null> {
  return tools.get(id) || null;
}

async function findToolsByWorkspaceId(workspaceId: string): Promise<Tool[]> {
  const result: Tool[] = [];
  for (const tool of tools.values()) {
    if (tool.workspaceId === workspaceId && !tool.isPredefined) {
      result.push(tool);
    }
  }
  return result;
}

async function createTool(data: Partial<Tool>): Promise<Tool> {
  const tool: Tool = {
    id: `tool_${Date.now()}`,
    workspaceId: data.workspaceId,
    name: data.name!,
    description: data.description!,
    type: data.type!,
    isPredefined: false,
    isEnabled: data.isEnabled ?? true,
    config: data.config!,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: data.createdBy,
  };
  tools.set(tool.id, tool);
  return tool;
}

async function updateTool(id: string, data: Partial<Tool>): Promise<Tool> {
  const tool = tools.get(id);
  if (!tool) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Tool not found');
  }
  
  const updated = { ...tool, ...data, updatedAt: new Date() };
  tools.set(id, updated);
  return updated;
}

async function deleteTool(id: string): Promise<void> {
  tools.delete(id);
}

async function createToolExecution(data: Partial<ToolExecution>): Promise<ToolExecution> {
  const execution: ToolExecution = {
    id: `exec_${Date.now()}`,
    toolId: data.toolId!,
    callId: data.callId,
    status: 'pending',
    input: data.input!,
    startedAt: new Date(),
  };
  toolExecutions.set(execution.id, execution);
  return execution;
}

async function updateToolExecution(
  id: string,
  data: Partial<ToolExecution>
): Promise<ToolExecution> {
  const execution = toolExecutions.get(id);
  if (!execution) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Tool execution not found');
  }
  
  const updated = { ...execution, ...data };
  toolExecutions.set(id, updated);
  return updated;
}

// ============================================================================
// Predefined Tools Registry
// ============================================================================

const predefinedTools: Map<string, PredefinedTool> = new Map();

export function registerPredefinedTool(tool: PredefinedTool): void {
  predefinedTools.set(tool.id, tool);
}

export function getPredefinedTools(): PredefinedTool[] {
  return Array.from(predefinedTools.values());
}

export function getPredefinedToolById(id: string): PredefinedTool | null {
  return predefinedTools.get(id) || null;
}

// Initialize predefined tools
function initializePredefinedTools(): void {
  const tools: Omit<PredefinedTool, 'id'>[] = [
    {
      name: 'Calendar: Check Availability',
      description: 'Check availability in a calendar for a given time range',
      category: 'calendar',
      icon: 'calendar',
      parameters: [
        {
          name: 'startTime',
          type: 'string',
          description: 'Start time in ISO 8601 format',
          required: true,
        },
        {
          name: 'endTime',
          type: 'string',
          description: 'End time in ISO 8601 format',
          required: true,
        },
        {
          name: 'duration',
          type: 'number',
          description: 'Meeting duration in minutes',
          required: true,
        },
      ],
      config: {
        type: ToolType.CALENDAR,
        calendarProvider: 'google',
      },
    },
    {
      name: 'Calendar: Book Meeting',
      description: 'Book a meeting in the calendar',
      category: 'calendar',
      icon: 'calendar-plus',
      parameters: [
        {
          name: 'title',
          type: 'string',
          description: 'Meeting title',
          required: true,
        },
        {
          name: 'startTime',
          type: 'string',
          description: 'Start time in ISO 8601 format',
          required: true,
        },
        {
          name: 'endTime',
          type: 'string',
          description: 'End time in ISO 8601 format',
          required: true,
        },
        {
          name: 'attendees',
          type: 'array',
          description: 'List of attendee email addresses',
          required: false,
        },
        {
          name: 'description',
          type: 'string',
          description: 'Meeting description',
          required: false,
        },
      ],
      config: {
        type: ToolType.CALENDAR,
        calendarProvider: 'google',
      },
    },
    {
      name: 'CRM: Create Lead',
      description: 'Create a new lead in the CRM system',
      category: 'crm',
      icon: 'user-plus',
      parameters: [
        {
          name: 'name',
          type: 'string',
          description: 'Lead name',
          required: true,
        },
        {
          name: 'email',
          type: 'string',
          description: 'Lead email address',
          required: false,
        },
        {
          name: 'phone',
          type: 'string',
          description: 'Lead phone number',
          required: false,
        },
        {
          name: 'company',
          type: 'string',
          description: 'Company name',
          required: false,
        },
        {
          name: 'notes',
          type: 'string',
          description: 'Additional notes',
          required: false,
        },
      ],
      config: {
        type: ToolType.CRM,
        crmProvider: 'salesforce',
      },
    },
    {
      name: 'HTTP Request',
      description: 'Make an HTTP request to an external API',
      category: 'integration',
      icon: 'globe',
      parameters: [
        {
          name: 'url',
          type: 'string',
          description: 'Request URL',
          required: true,
        },
        {
          name: 'method',
          type: 'string',
          description: 'HTTP method (GET, POST, PUT, DELETE)',
          required: true,
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        },
        {
          name: 'headers',
          type: 'object',
          description: 'Request headers',
          required: false,
        },
        {
          name: 'body',
          type: 'object',
          description: 'Request body (for POST/PUT)',
          required: false,
        },
      ],
      config: {
        type: ToolType.HTTP,
        timeout: 30000,
        retryCount: 3,
      },
    },
    {
      name: 'Send Email',
      description: 'Send an email notification',
      category: 'notification',
      icon: 'mail',
      parameters: [
        {
          name: 'to',
          type: 'string',
          description: 'Recipient email address',
          required: true,
        },
        {
          name: 'subject',
          type: 'string',
          description: 'Email subject',
          required: true,
        },
        {
          name: 'body',
          type: 'string',
          description: 'Email body (HTML or plain text)',
          required: true,
        },
      ],
      config: {
        type: ToolType.WEBHOOK,
      },
    },
    {
      name: 'Send SMS',
      description: 'Send an SMS message',
      category: 'notification',
      icon: 'message-square',
      parameters: [
        {
          name: 'to',
          type: 'string',
          description: 'Recipient phone number',
          required: true,
        },
        {
          name: 'message',
          type: 'string',
          description: 'SMS message content',
          required: true,
        },
      ],
      config: {
        type: ToolType.WEBHOOK,
      },
    },
    {
      name: 'Database: Query',
      description: 'Execute a database query',
      category: 'database',
      icon: 'database',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'SQL query to execute',
          required: true,
        },
        {
          name: 'parameters',
          type: 'array',
          description: 'Query parameters',
          required: false,
        },
      ],
      config: {
        type: ToolType.DATABASE,
      },
    },
  ];
  
  for (const toolData of tools) {
    const tool: PredefinedTool = {
      ...toolData,
      id: `predef_${toolData.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    };
    registerPredefinedTool(tool);
  }
  
  logger.info({ count: tools.length }, 'Predefined tools initialized');
}

// Initialize on module load
initializePredefinedTools();

// ============================================================================
// Custom Tool CRUD
// ============================================================================

interface CreateToolInput {
  name: string;
  description: string;
  type: ToolType;
  config: ToolConfig;
}

/**
 * Create a custom tool
 */
export async function createCustomTool(
  workspaceId: string,
  userId: string,
  input: CreateToolInput
): Promise<Tool> {
  logger.info({ workspaceId, name: input.name }, 'Creating custom tool');
  
  // Validate tool configuration based on type
  validateToolConfig(input.type, input.config);
  
  const tool = await createTool({
    workspaceId,
    name: input.name,
    description: input.description,
    type: input.type,
    config: input.config,
    createdBy: userId,
  });
  
  logger.info({ toolId: tool.id }, 'Custom tool created successfully');
  return tool;
}

interface UpdateToolInput {
  name?: string;
  description?: string;
  config?: ToolConfig;
  isEnabled?: boolean;
}

/**
 * Update a custom tool
 */
export async function updateCustomTool(
  toolId: string,
  input: UpdateToolInput
): Promise<Tool> {
  logger.info({ toolId }, 'Updating custom tool');
  
  const tool = await findToolById(toolId);
  if (!tool) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Tool not found');
  }
  
  if (tool.isPredefined) {
    throw new ApiError(403, ErrorCode.FORBIDDEN, 'Cannot modify predefined tools');
  }
  
  if (input.config) {
    validateToolConfig(tool.type, input.config);
  }
  
  const updated = await updateTool(toolId, input);
  logger.info({ toolId }, 'Custom tool updated successfully');
  
  return updated;
}

/**
 * Get a tool by ID
 */
export async function getTool(toolId: string): Promise<Tool> {
  const tool = await findToolById(toolId);
  
  if (!tool) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Tool not found');
  }
  
  return tool;
}

/**
 * List custom tools for a workspace
 */
export async function listCustomTools(workspaceId: string): Promise<Tool[]> {
  return findToolsByWorkspaceId(workspaceId);
}

/**
 * Delete a custom tool
 */
export async function deleteCustomTool(toolId: string): Promise<void> {
  logger.info({ toolId }, 'Deleting custom tool');
  
  const tool = await findToolById(toolId);
  if (!tool) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Tool not found');
  }
  
  if (tool.isPredefined) {
    throw new ApiError(403, ErrorCode.FORBIDDEN, 'Cannot delete predefined tools');
  }
  
  await deleteTool(toolId);
  logger.info({ toolId }, 'Custom tool deleted successfully');
}

// ============================================================================
// Tool Validation
// ============================================================================

function validateToolConfig(type: ToolType, config: ToolConfig): void {
  switch (type) {
    case ToolType.HTTP:
      if (!config.url) {
        throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'HTTP tool requires a URL');
      }
      if (config.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)) {
        throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid HTTP method');
      }
      break;
      
    case ToolType.FUNCTION:
      if (!config.code) {
        throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Function tool requires code');
      }
      break;
      
    case ToolType.CALENDAR:
      if (!config.calendarProvider) {
        throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Calendar tool requires a provider');
      }
      break;
      
    case ToolType.CRM:
      if (!config.crmProvider) {
        throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'CRM tool requires a provider');
      }
      break;
  }
}

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Execute a tool (for testing purposes)
 */
export async function executeTool(
  toolId: string,
  input: Record<string, unknown>,
  callId?: string
): Promise<ToolExecution> {
  logger.info({ toolId, callId }, 'Executing tool');
  
  const tool = await findToolById(toolId);
  if (!tool) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Tool not found');
  }
  
  if (!tool.isEnabled) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Tool is disabled');
  }
  
  // Create execution record
  const execution = await createToolExecution({
    toolId,
    callId,
    input,
  });
  
  try {
    // Update status to running
    await updateToolExecution(execution.id, { status: 'running' });
    
    // Execute based on tool type
    let output: Record<string, unknown>;
    
    switch (tool.type) {
      case ToolType.HTTP:
        output = await executeHttpTool(tool.config, input);
        break;
        
      case ToolType.FUNCTION:
        output = await executeFunctionTool(tool.config, input);
        break;
        
      case ToolType.WEBHOOK:
        output = await executeWebhookTool(tool.config, input);
        break;
        
      default:
        // For other types, return mock output for testing
        output = { success: true, message: 'Tool executed successfully (mock)' };
    }
    
    // Update with success
    const completed = await updateToolExecution(execution.id, {
      status: 'completed',
      output,
      completedAt: new Date(),
      duration: Date.now() - execution.startedAt.getTime(),
    });
    
    logger.info({ executionId: execution.id }, 'Tool executed successfully');
    return completed;
    
  } catch (error) {
    // Update with failure
    const failed = await updateToolExecution(execution.id, {
      status: 'failed',
      error: (error as Error).message,
      completedAt: new Date(),
      duration: Date.now() - execution.startedAt.getTime(),
    });
    
    logger.error({ executionId: execution.id, error: (error as Error).message }, 'Tool execution failed');
    return failed;
  }
}

async function executeHttpTool(
  config: ToolConfig,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = config.url!;
  const method = config.method || 'GET';
  const headers = { ...config.headers, ...(input.headers as Record<string, string> || {}) };
  
  // Replace template variables in URL
  let finalUrl = url;
  for (const [key, value] of Object.entries(input)) {
    if (key !== 'headers' && key !== 'body') {
      finalUrl = finalUrl.replace(`{{${key}}}`, String(value));
    }
  }
  
  // Add query params
  if (config.queryParams) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(config.queryParams)) {
      params.append(key, value);
    }
    finalUrl += `?${params.toString()}`;
  }
  
  const response = await fetch(finalUrl, {
    method,
    headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  
  const responseData = await response.json().catch(() => ({}));
  
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseData,
  };
}

async function executeFunctionTool(
  config: ToolConfig,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // In production, this would execute in a sandboxed environment
  // For now, return a mock response
  return {
    success: true,
    input,
    code: config.code?.substring(0, 100) + '...',
    message: 'Function executed (sandbox not implemented)',
  };
}

async function executeWebhookTool(
  config: ToolConfig,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // In production, this would send a webhook with signature
  return {
    success: true,
    webhookUrl: config.webhookUrl,
    payload: input,
    message: 'Webhook sent (implementation pending)',
  };
}

// ============================================================================
// Predefined Tools
// ============================================================================

/**
 * List all predefined tools
 */
export function listPredefinedTools(): PredefinedTool[] {
  return getPredefinedTools();
}

/**
 * Get a predefined tool by ID
 */
export function getPredefinedTool(toolId: string): PredefinedTool {
  const tool = getPredefinedToolById(toolId);
  
  if (!tool) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Predefined tool not found');
  }
  
  return tool;
}
