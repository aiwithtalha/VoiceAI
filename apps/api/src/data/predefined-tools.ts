/**
 * Predefined Tools Definitions
 * 
 * This module defines all built-in tools available in the Voice AI Platform.
 * Each tool includes metadata, description, and JSON Schema for input validation.
 * 
 * @module data/predefined-tools
 */

import { JSONSchema7 } from 'json-schema';

/**
 * Represents a predefined tool definition
 */
export interface PredefinedTool {
  /** Unique tool identifier */
  id: string;
  /** Human-readable tool name */
  name: string;
  /** Detailed description of what the tool does */
  description: string;
  /** Category for grouping tools */
  category: ToolCategory;
  /** JSON Schema for input validation */
  inputSchema: JSONSchema7;
  /** Example inputs for documentation/testing */
  examples?: Record<string, any>[];
  /** Whether the tool requires specific integrations */
  requiredIntegrations?: string[];
  /** Rate limiting configuration */
  rateLimit?: {
    requests: number;
    windowSeconds: number;
  };
}

/**
 * Tool categories for organization
 */
export type ToolCategory = 
  | 'call-control'
  | 'communication'
  | 'calendar'
  | 'data-collection'
  | 'integration'
  | 'utility';

// ============================================================================
// Predefined Tool Definitions
// ============================================================================

/**
 * Transfer call to another phone number
 * Supports both cold transfers (immediate) and warm transfers (with introduction)
 */
export const transferCallTool: PredefinedTool = {
  id: 'transfer_call',
  name: 'Transfer Call',
  description: 'Transfer the current call to another phone number. Supports cold transfers (immediate handoff) and warm transfers (with introduction and confirmation).',
  category: 'call-control',
  inputSchema: {
    type: 'object',
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'The phone number to transfer the call to (E.164 format)',
        pattern: '^\\+?[1-9]\\d{1,14}$',
        examples: ['+14155551234'],
      },
      warmTransfer: {
        type: 'boolean',
        description: 'If true, the AI will introduce the caller before transferring. If false, the transfer is immediate (cold transfer).',
        default: false,
      },
    },
    required: ['phoneNumber'],
    additionalProperties: false,
  } as JSONSchema7,
  examples: [
    {
      phoneNumber: '+14155551234',
      warmTransfer: false,
    },
    {
      phoneNumber: '+14155555678',
      warmTransfer: true,
    },
  ],
};

/**
 * End the current call
 */
export const endCallTool: PredefinedTool = {
  id: 'end_call',
  name: 'End Call',
  description: 'Terminate the current call session with an optional reason for ending.',
  category: 'call-control',
  inputSchema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'The reason for ending the call (for logging purposes)',
        minLength: 1,
        maxLength: 500,
        examples: ['Call completed successfully', 'Customer requested to end', 'Issue resolved'],
      },
    },
    required: ['reason'],
    additionalProperties: false,
  } as JSONSchema7,
  examples: [
    {
      reason: 'Appointment successfully booked',
    },
    {
      reason: 'Customer satisfied with assistance',
    },
  ],
};

/**
 * Send SMS message to a phone number
 */
export const sendSMSTool: PredefinedTool = {
  id: 'send_sms',
  name: 'Send SMS',
  description: 'Send an SMS message to a specified phone number. Message will be sent from the workspace\'s configured phone number.',
  category: 'communication',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'The recipient phone number (E.164 format)',
        pattern: '^\\+?[1-9]\\d{1,14}$',
        examples: ['+14155551234'],
      },
      message: {
        type: 'string',
        description: 'The message content to send (max 1600 characters)',
        minLength: 1,
        maxLength: 1600,
        examples: ['Your appointment is confirmed for tomorrow at 2 PM.'],
      },
    },
    required: ['to', 'message'],
    additionalProperties: false,
  } as JSONSchema7,
  examples: [
    {
      to: '+14155551234',
      message: 'Thank you for calling! Your reference number is ABC123.',
    },
    {
      to: '+14155555678',
      message: 'Your appointment is confirmed for March 15, 2024 at 2:00 PM.',
    },
  ],
  requiredIntegrations: ['sms'],
  rateLimit: {
    requests: 10,
    windowSeconds: 60,
  },
};

/**
 * Book an appointment in the calendar
 */
export const bookAppointmentTool: PredefinedTool = {
  id: 'book_appointment',
  name: 'Book Appointment',
  description: 'Book an appointment in the connected calendar. Requires Google Calendar integration to be configured.',
  category: 'calendar',
  inputSchema: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'The appointment date in YYYY-MM-DD format',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        examples: ['2024-03-15'],
      },
      time: {
        type: 'string',
        description: 'The appointment start time in 24-hour HH:MM format',
        pattern: '^\\d{2}:\\d{2}$',
        examples: ['14:00', '09:30'],
      },
      name: {
        type: 'string',
        description: 'The full name of the person booking the appointment',
        minLength: 1,
        maxLength: 200,
        examples: ['John Smith'],
      },
      email: {
        type: 'string',
        description: 'The email address of the person booking the appointment',
        format: 'email',
        examples: ['john.smith@example.com'],
      },
      duration: {
        type: 'number',
        description: 'The appointment duration in minutes (default: 30)',
        minimum: 15,
        maximum: 240,
        default: 30,
        examples: [30, 60],
      },
      description: {
        type: 'string',
        description: 'Optional description or notes for the appointment',
        maxLength: 1000,
        examples: ['Initial consultation call'],
      },
    },
    required: ['date', 'time', 'name', 'email'],
    additionalProperties: false,
  } as JSONSchema7,
  examples: [
    {
      date: '2024-03-15',
      time: '14:00',
      name: 'John Smith',
      email: 'john.smith@example.com',
      duration: 30,
    },
    {
      date: '2024-03-20',
      time: '10:30',
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      duration: 60,
      description: 'Follow-up consultation',
    },
  ],
  requiredIntegrations: ['google_calendar'],
};

/**
 * Collect and store information during the call
 */
export const collectInfoTool: PredefinedTool = {
  id: 'collect_info',
  name: 'Collect Information',
  description: 'Store information collected during the call. This data is associated with the current call session and can be used later in the conversation or for post-call processing.',
  category: 'data-collection',
  inputSchema: {
    type: 'object',
    properties: {
      field: {
        type: 'string',
        description: 'The field name to store the information under (alphanumeric with underscores only)',
        pattern: '^[a-zA-Z0-9_]+$',
        minLength: 1,
        maxLength: 100,
        examples: ['customer_name', 'order_number', 'callback_number'],
      },
      value: {
        type: 'string',
        description: 'The value to store (max 5000 characters)',
        minLength: 1,
        maxLength: 5000,
        examples: ['John Smith', 'ORD-12345', '+14155551234'],
      },
    },
    required: ['field', 'value'],
    additionalProperties: false,
  } as JSONSchema7,
  examples: [
    {
      field: 'customer_name',
      value: 'John Smith',
    },
    {
      field: 'order_number',
      value: 'ORD-12345',
    },
    {
      field: 'preferred_contact_time',
      value: 'Afternoons after 2 PM',
    },
  ],
};

/**
 * Make an HTTP API request to an external service
 */
export const apiRequestTool: PredefinedTool = {
  id: 'api_request',
  name: 'API Request',
  description: 'Make an HTTP request to an external API. Supports GET, POST, PUT, PATCH, and DELETE methods with custom headers and request body.',
  category: 'integration',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The full URL to send the request to',
        format: 'uri',
        examples: ['https://api.example.com/v1/customers'],
      },
      method: {
        type: 'string',
        description: 'The HTTP method to use',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        examples: ['GET', 'POST'],
      },
      headers: {
        type: 'object',
        description: 'Optional custom headers to include in the request',
        additionalProperties: {
          type: 'string',
        },
        examples: [{ 'Authorization': 'Bearer token123', 'X-Custom-Header': 'value' }],
      },
      body: {
        type: 'object',
        description: 'Optional request body (for POST, PUT, PATCH requests)',
        additionalProperties: true,
        examples: [{ 'name': 'John', 'email': 'john@example.com' }],
      },
      timeout: {
        type: 'number',
        description: 'Request timeout in milliseconds (default: 10000, max: 30000)',
        minimum: 1000,
        maximum: 30000,
        default: 10000,
        examples: [5000, 10000, 15000],
      },
      retries: {
        type: 'number',
        description: 'Number of retry attempts on failure (default: 1, max: 3)',
        minimum: 0,
        maximum: 3,
        default: 1,
        examples: [0, 1, 2, 3],
      },
    },
    required: ['url', 'method'],
    additionalProperties: false,
  } as JSONSchema7,
  examples: [
    {
      url: 'https://api.example.com/v1/customers',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer token123',
      },
    },
    {
      url: 'https://api.example.com/v1/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
      },
      body: {
        customerId: 'cust_123',
        items: [{ productId: 'prod_456', quantity: 2 }],
      },
      timeout: 15000,
      retries: 2,
    },
  ],
  rateLimit: {
    requests: 30,
    windowSeconds: 60,
  },
};

// ============================================================================
// Tool Collections
// ============================================================================

/**
 * All predefined tools in the system
 */
export const predefinedTools: PredefinedTool[] = [
  transferCallTool,
  endCallTool,
  sendSMSTool,
  bookAppointmentTool,
  collectInfoTool,
  apiRequestTool,
];

/**
 * Get a tool by its ID
 */
export function getToolById(toolId: string): PredefinedTool | undefined {
  return predefinedTools.find(tool => tool.id === toolId);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): PredefinedTool[] {
  return predefinedTools.filter(tool => tool.category === category);
}

/**
 * Get all tool categories with their tools
 */
export function getToolsByCategoryMap(): Record<ToolCategory, PredefinedTool[]> {
  return predefinedTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<ToolCategory, PredefinedTool[]>);
}

/**
 * Get tools that require specific integrations
 */
export function getToolsRequiringIntegration(integrationId: string): PredefinedTool[] {
  return predefinedTools.filter(
    tool => tool.requiredIntegrations?.includes(integrationId)
  );
}

/**
 * Validate tool input against its schema
 * This is a lightweight validation for documentation purposes
 */
export function validateToolInputExample(
  toolId: string,
  input: unknown
): { valid: boolean; errors?: string[] } {
  const tool = getToolById(toolId);
  
  if (!tool) {
    return { valid: false, errors: [`Tool not found: ${toolId}`] };
  }

  const schema = tool.inputSchema;
  const errors: string[] = [];

  // Basic validation - in production, use a proper JSON Schema validator
  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const inputObj = input as Record<string, any>;
  const required = schema.required as string[] || [];

  for (const req of required) {
    if (!(req in inputObj)) {
      errors.push(`Missing required field: ${req}`);
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

export default {
  predefinedTools,
  getToolById,
  getToolsByCategory,
  getToolsByCategoryMap,
  getToolsRequiringIntegration,
  validateToolInputExample,
};
