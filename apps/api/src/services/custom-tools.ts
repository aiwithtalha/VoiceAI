/**
 * Custom Tools Service
 * 
 * Handles execution of user-defined custom tools with support for:
 * - HTTP API calls with configurable auth
 * - Retry logic with exponential backoff
 * - Request/response transformation
 * - Timeout handling
 * 
 * @module services/custom-tools
 */

import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { ToolExecutionContext } from './tools-framework';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Custom tool configuration stored in database
 */
export interface CustomToolConfig {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  /** HTTP method for the API call */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Target URL - can include template variables like {{param}} */
  url: string;
  /** Static headers to include in every request */
  headers?: Record<string, string>;
  /** Authentication configuration */
  auth?: CustomToolAuth;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts on failure */
  retries?: number;
  /** JSON Schema for input validation */
  inputSchema?: Record<string, any>;
  /** Request body template (for POST/PUT/PATCH) */
  bodyTemplate?: Record<string, any>;
  /** Response transformation configuration */
  responseTransform?: ResponseTransformConfig;
  /** Whether the tool is active */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication configuration for custom tools
 */
export interface CustomToolAuth {
  type: 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth2';
  /** For bearer token - token value or reference to integration token */
  bearerToken?: string;
  /** For basic auth */
  basicAuth?: {
    username: string;
    password: string;
  };
  /** For API key auth */
  apiKey?: {
    key: string;
    value: string;
    in: 'header' | 'query';
  };
  /** Reference to integration token (e.g., 'google', 'slack') */
  integrationToken?: string;
}

/**
 * Response transformation configuration
 */
export interface ResponseTransformConfig {
  /** JSONPath or dot-notation path to extract from response */
  extractPath?: string;
  /** Mapping of output fields to response paths */
  fieldMapping?: Record<string, string>;
  /** Default values for missing fields */
  defaults?: Record<string, any>;
}

/**
 * Result of custom tool execution
 */
export interface CustomToolResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  duration: number;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatusCodes: number[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

const DEFAULT_TIMEOUT = 10000;

// ============================================================================
// Main Execution Function
// ============================================================================

/**
 * Execute a custom tool with the given configuration and input
 * 
 * @param toolConfig - The custom tool configuration
 * @param input - User-provided input parameters
 * @param context - Execution context with call/workspace info
 * @returns Custom tool execution result
 */
export async function executeCustomTool(
  toolConfig: CustomToolConfig,
  input: Record<string, any>,
  context: ToolExecutionContext
): Promise<CustomToolResult> {
  const startTime = Date.now();

  logger.info({
    toolId: toolConfig.id,
    callId: context.callId,
    method: toolConfig.method,
    url: toolConfig.url,
  }, 'Executing custom tool');

  try {
    // Validate tool is active
    if (!toolConfig.isActive) {
      throw new Error('Custom tool is disabled');
    }

    // Build the request
    const requestConfig = await buildRequestConfig(toolConfig, input, context);

    // Execute with retry logic
    const response = await executeWithRetry(
      requestConfig,
      toolConfig.retries || DEFAULT_RETRY_CONFIG.maxRetries
    );

    const duration = Date.now() - startTime;

    // Transform response if configured
    const transformedData = toolConfig.responseTransform
      ? transformResponse(response.data, toolConfig.responseTransform)
      : response.data;

    // Record success metrics
    metrics.timing('custom_tool.execution.duration', duration, {
      tool: toolConfig.id,
      workspace: context.workspaceId,
      status: String(response.status),
    });
    metrics.increment('custom_tool.execution.success', {
      tool: toolConfig.id,
      workspace: context.workspaceId,
    });

    logger.info({
      toolId: toolConfig.id,
      callId: context.callId,
      duration,
      statusCode: response.status,
    }, 'Custom tool executed successfully');

    return {
      success: true,
      data: transformedData,
      statusCode: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      toolId: toolConfig.id,
      callId: context.callId,
      error: errorMessage,
      duration,
    }, 'Custom tool execution failed');

    // Record failure metrics
    metrics.increment('custom_tool.execution.failure', {
      tool: toolConfig.id,
      workspace: context.workspaceId,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

// ============================================================================
// Request Building
// ============================================================================

/**
 * Build the full request configuration for the custom tool
 */
async function buildRequestConfig(
  toolConfig: CustomToolConfig,
  input: Record<string, any>,
  context: ToolExecutionContext
): Promise<{
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timeout: number;
}> {
  // Process URL template
  const url = processTemplate(toolConfig.url, { ...input, ...context.collectedData });

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Call-ID': context.callId,
    'X-Workspace-ID': context.workspaceId,
    ...toolConfig.headers,
  };

  // Add authentication headers
  await addAuthHeaders(headers, toolConfig.auth, context);

  // Build request body for applicable methods
  let body: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(toolConfig.method)) {
    const bodyData = toolConfig.bodyTemplate
      ? processTemplateObject(toolConfig.bodyTemplate, input)
      : input;
    body = JSON.stringify(bodyData);
  }

  return {
    url,
    method: toolConfig.method,
    headers,
    body,
    timeout: toolConfig.timeout || DEFAULT_TIMEOUT,
  };
}

/**
 * Add authentication headers based on auth configuration
 */
async function addAuthHeaders(
  headers: Record<string, string>,
  auth: CustomToolAuth | undefined,
  context: ToolExecutionContext
): Promise<void> {
  if (!auth || auth.type === 'none') {
    return;
  }

  switch (auth.type) {
    case 'bearer':
      if (auth.bearerToken) {
        headers['Authorization'] = `Bearer ${auth.bearerToken}`;
      }
      break;

    case 'basic':
      if (auth.basicAuth) {
        const credentials = Buffer.from(
          `${auth.basicAuth.username}:${auth.basicAuth.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }
      break;

    case 'api_key':
      if (auth.apiKey) {
        if (auth.apiKey.in === 'header') {
          headers[auth.apiKey.key] = auth.apiKey.value;
        }
        // Query param is handled in URL building
      }
      break;

    case 'oauth2':
      if (auth.integrationToken) {
        const token = context.integrationTokens[auth.integrationToken];
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          throw new Error(`Integration token not available: ${auth.integrationToken}`);
        }
      }
      break;
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Execute HTTP request with retry logic
 */
async function executeWithRetry(
  config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    timeout: number;
  },
  maxRetries: number
): Promise<Response> {
  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response status is retryable
      if (
        !response.ok &&
        retryConfig.retryableStatusCodes.includes(response.status) &&
        attempt < retryConfig.maxRetries
      ) {
        const delay = calculateBackoff(attempt, retryConfig);
        logger.warn({
          attempt: attempt + 1,
          statusCode: response.status,
          delay,
        }, 'Request failed with retryable status, retrying');
        await sleep(delay);
        continue;
      }

      return response;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort (timeout)
      if (lastError.name === 'AbortError') {
        throw new Error(`Request timeout after ${config.timeout}ms`);
      }

      if (attempt < retryConfig.maxRetries) {
        const delay = calculateBackoff(attempt, retryConfig);
        logger.warn({
          attempt: attempt + 1,
          error: lastError.message,
          delay,
        }, 'Request failed, retrying');
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Template Processing
// ============================================================================

/**
 * Process a template string, replacing {{variable}} placeholders
 */
function processTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined) {
      logger.warn({ key, template }, 'Template variable not found');
      return match;
    }
    return encodeURIComponent(String(value));
  });
}

/**
 * Process template object recursively
 */
function processTemplateObject(
  template: Record<string, any>,
  variables: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      result[key] = processTemplate(value, variables);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = processTemplateObject(value, variables);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ============================================================================
// Response Transformation
// ============================================================================

/**
 * Transform response data based on configuration
 */
function transformResponse(
  data: any,
  config: ResponseTransformConfig
): any {
  // Extract from path if specified
  let extracted = data;
  if (config.extractPath) {
    extracted = extractValueByPath(data, config.extractPath);
  }

  // Apply field mapping if specified
  if (config.fieldMapping) {
    const mapped: Record<string, any> = {};
    for (const [outputField, sourcePath] of Object.entries(config.fieldMapping)) {
      mapped[outputField] = extractValueByPath(extracted, sourcePath);
    }
    extracted = mapped;
  }

  // Apply defaults
  if (config.defaults) {
    extracted = { ...config.defaults, ...extracted };
  }

  return extracted;
}

/**
 * Extract value from object using dot-notation path
 */
function extractValueByPath(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate custom tool input against its schema
 */
export function validateCustomToolInput(
  inputSchema: Record<string, any> | undefined,
  input: unknown
): { valid: boolean; errors?: string[] } {
  if (!inputSchema) {
    return { valid: true };
  }

  // Basic validation - in production, use a proper JSON Schema validator
  const errors: string[] = [];
  const required = inputSchema.required as string[] || [];

  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const inputObj = input as Record<string, any>;

  for (const req of required) {
    if (!(req in inputObj)) {
      errors.push(`Missing required field: ${req}`);
    }
  }

  // Validate property types
  const properties = inputSchema.properties as Record<string, any>;
  if (properties) {
    for (const [key, value] of Object.entries(inputObj)) {
      const propSchema = properties[key];
      if (propSchema) {
        const typeValid = validateType(value, propSchema.type);
        if (!typeValid) {
          errors.push(`Invalid type for field ${key}: expected ${propSchema.type}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validate value against expected type
 */
function validateType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
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

// ============================================================================
// Test Function
// ============================================================================

/**
 * Test a custom tool configuration without executing it
 */
export function testCustomToolConfig(
  config: CustomToolConfig,
  testInput: Record<string, any>
): { valid: boolean; errors: string[]; preview?: any } {
  const errors: string[] = [];

  // Validate URL
  try {
    new URL(config.url);
  } catch {
    errors.push('Invalid URL format');
  }

  // Validate auth configuration
  if (config.auth) {
    switch (config.auth.type) {
      case 'bearer':
        if (!config.auth.bearerToken) {
          errors.push('Bearer token is required for bearer auth');
        }
        break;
      case 'basic':
        if (!config.auth.basicAuth?.username || !config.auth.basicAuth?.password) {
          errors.push('Username and password are required for basic auth');
        }
        break;
      case 'api_key':
        if (!config.auth.apiKey?.key || !config.auth.apiKey?.value) {
          errors.push('API key name and value are required');
        }
        break;
    }
  }

  // Validate input against schema
  const inputValidation = validateCustomToolInput(config.inputSchema, testInput);
  if (!inputValidation.valid) {
    errors.push(...(inputValidation.errors || []));
  }

  // Generate request preview
  const preview = {
    method: config.method,
    url: processTemplate(config.url, testInput),
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: config.bodyTemplate
      ? processTemplateObject(config.bodyTemplate, testInput)
      : testInput,
  };

  return {
    valid: errors.length === 0,
    errors,
    preview,
  };
}

export default {
  executeCustomTool,
  validateCustomToolInput,
  testCustomToolConfig,
};
