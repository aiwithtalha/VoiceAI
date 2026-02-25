/**
 * Universal Voice AI Platform - Error Handling Middleware
 * 
 * Centralized error handling with proper HTTP responses and logging.
 * Handles API errors, validation errors, and unexpected errors.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';
import { ApiError, ErrorCode } from '../types';

// ============================================================================
// Error Response Types
// ============================================================================

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
  requestId: string;
}

// ============================================================================
// Error Handlers
// ============================================================================

/**
 * Format Zod validation errors into a readable format
 */
function formatZodError(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  
  return formatted;
}

/**
 * Determine if error is an operational error (expected) or programmer error
 */
function isOperationalError(error: Error): boolean {
  if (error instanceof ApiError) {
    return true;
  }
  
  // Zod validation errors are operational
  if (error instanceof ZodError) {
    return true;
  }
  
  // Syntax errors from JSON parsing are operational
  if (error instanceof SyntaxError && 'body' in error) {
    return true;
  }
  
  return false;
}

// ============================================================================
// Main Error Handler
// ============================================================================

/**
 * Global error handling middleware
 * 
 * This should be the last middleware in the Express app.
 * It catches all errors and returns appropriate HTTP responses.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  // Log the error
  if (isOperationalError(err)) {
    logger.warn(
      {
        requestId,
        error: err.message,
        code: (err as ApiError).code,
        path: req.path,
        method: req.method,
      },
      'Operational error'
    );
  } else {
    logger.error(
      {
        requestId,
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
      },
      'Unexpected error'
    );
  }
  
  // Build error response
  let statusCode = 500;
  let errorCode = ErrorCode.INTERNAL_ERROR;
  let message = 'An unexpected error occurred';
  let details: Record<string, unknown> | undefined;
  
  // Handle specific error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.code || ErrorCode.INTERNAL_ERROR;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = 'Validation failed';
    details = { fields: formatZodError(err) };
  } else if (err instanceof SyntaxError && 'body' in err) {
    // JSON parsing error
    statusCode = 400;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = 'Invalid JSON in request body';
  } else if (err.name === 'UnauthorizedError') {
    // JWT authentication error
    statusCode = 401;
    errorCode = ErrorCode.UNAUTHORIZED;
    message = 'Authentication required';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    // Database errors
    const prismaError = err as unknown as { code: string; meta?: Record<string, unknown> };
    
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        errorCode = ErrorCode.VALIDATION_ERROR;
        message = 'A record with this value already exists';
        details = { target: prismaError.meta?.target };
        break;
      case 'P2025':
        statusCode = 404;
        errorCode = ErrorCode.NOT_FOUND;
        message = 'Record not found';
        break;
      default:
        logger.error({ prismaErrorCode: prismaError.code }, 'Unhandled Prisma error');
    }
  }
  
  // Build response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      // Include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    requestId,
  };
  
  res.status(statusCode).json(response);
}

// ============================================================================
// 404 Handler
// ============================================================================

/**
 * Handle requests to undefined routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  logger.warn(
    {
      requestId,
      path: req.path,
      method: req.method,
    },
    'Route not found'
  );
  
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
    requestId,
  });
}

// ============================================================================
// Async Handler Wrapper
// ============================================================================

/**
 * Wrapper for async route handlers to catch errors
 * 
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => {
 *     // Your async code here
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Request ID Middleware
// ============================================================================

import { v4 as uuidv4 } from 'crypto';

/**
 * Generate or extract request ID from incoming request
 * Attaches request ID to request object and response headers
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check for existing request ID from load balancer or client
  const existingId = req.headers['x-request-id'];
  
  // Generate new ID if not present
  const requestId = typeof existingId === 'string' && existingId
    ? existingId
    : uuidv4();
  
  // Attach to request
  req.headers['x-request-id'] = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-Id', requestId);
  
  next();
}

// ============================================================================
// Logging Middleware
// ============================================================================

/**
 * Request logging middleware
 * Logs all incoming requests and their responses
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const startTime = Date.now();
  
  // Log request
  logger.debug(
    {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    'Incoming request'
  );
  
  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info(
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
        contentLength: res.get('content-length'),
      },
      'Request completed'
    );
  });
  
  next();
}

// ============================================================================
// Security Headers Middleware
// ============================================================================

/**
 * Additional security headers beyond what Helmet provides
 */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  
  next();
}
