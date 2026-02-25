/**
 * Universal Voice AI Platform - Logger Utility
 * 
 * Structured logging with Pino for high-performance JSON logging in production
 * and pretty printing in development.
 */

import pino from 'pino';
import { config } from '../config';

/**
 * Create Pino logger instance with appropriate configuration
 * based on environment and settings.
 */
const logger = pino({
  level: config.logging.level,
  
  // Pretty print in development
  transport: config.server.isDevelopment && config.logging.format === 'pretty'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          messageFormat: '{msg}',
        },
      }
    : undefined,

  // Base properties for all logs
  base: {
    env: config.server.env,
    service: 'voice-ai-api',
    version: process.env.npm_package_version || '0.1.0',
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'apiSecret',
      'credentials',
      '*.credentials',
      'config.providers.*.apiKey',
    ],
    remove: true,
  },

  // Custom serializers for common objects
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Request context logger - creates a child logger with request-specific context
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId,
  });
}

/**
 * Workspace context logger - creates a child logger with workspace context
 */
export function createWorkspaceLogger(workspaceId: string, userId?: string) {
  return logger.child({
    workspaceId,
    userId,
  });
}

/**
 * Call context logger - creates a child logger for call-related operations
 */
export function createCallLogger(callId: string, workspaceId?: string, assistantId?: string) {
  return logger.child({
    callId,
    workspaceId,
    assistantId,
  });
}

/**
 * Log HTTP request with appropriate level based on status code
 */
export function logHttpRequest(
  req: {
    method: string;
    url: string;
    ip?: string;
    userAgent?: string;
  },
  res: {
    statusCode: number;
  },
  durationMs: number,
  requestId: string,
  userId?: string
): void {
  const logData = {
    requestId,
    userId,
    req: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.userAgent,
    },
    res: {
      statusCode: res.statusCode,
    },
    durationMs,
  };

  // Log at appropriate level based on status code
  if (res.statusCode >= 500) {
    logger.error(logData, 'HTTP request failed');
  } else if (res.statusCode >= 400) {
    logger.warn(logData, 'HTTP request error');
  } else {
    logger.info(logData, 'HTTP request completed');
  }
}

/**
 * Log provider API calls for debugging and monitoring
 */
export function logProviderCall(
  provider: string,
  operation: string,
  durationMs: number,
  success: boolean,
  error?: Error
): void {
  const logData = {
    provider,
    operation,
    durationMs,
    success,
    error: error ? { message: error.message, code: (error as unknown as { code?: string }).code } : undefined,
  };

  if (success) {
    logger.debug(logData, `Provider call: ${provider}.${operation}`);
  } else {
    logger.warn(logData, `Provider call failed: ${provider}.${operation}`);
  }
}

/**
 * Log security events
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  severity: 'info' | 'warn' | 'error' = 'info'
): void {
  const logData = {
    event: `security.${event}`,
    ...details,
  };

  logger[severity](logData, `Security event: ${event}`);
}

/**
 * Log billing events
 */
export function logBillingEvent(
  event: string,
  workspaceId: string,
  details: Record<string, unknown>
): void {
  logger.info({
    event: `billing.${event}`,
    workspaceId,
    ...details,
  }, `Billing event: ${event}`);
}

export default logger;
