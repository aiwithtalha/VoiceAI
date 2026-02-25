/**
 * Universal Voice AI Platform - Rate Limiting Middleware
 * 
 * Configurable rate limiting for different endpoint types and user tiers.
 * Uses express-rate-limit with custom key generators and handlers.
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';
import logger from '../utils/logger';
import { ErrorCode, AuthenticatedRequest } from '../types';

// ============================================================================
// Key Generators
// ============================================================================

/**
 * Generate rate limit key based on user ID or IP address
 */
function generateKey(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  
  // Use user ID if authenticated
  if (authReq.user?.userId) {
    return authReq.user.userId;
  }
  
  // Use API key if present
  const apiKey = req.headers['x-api-key'];
  if (typeof apiKey === 'string') {
    return `apikey:${apiKey.substring(0, 8)}`;
  }
  
  // Fall back to IP address
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Generate rate limit key for workspace-scoped endpoints
 */
function generateWorkspaceKey(req: Request): string {
  const workspaceId = req.headers['x-workspace-id'] || req.params.workspaceId;
  
  if (workspaceId) {
    return `ws:${workspaceId}`;
  }
  
  return generateKey(req);
}

// ============================================================================
// Standard Response Handler
// ============================================================================

/**
 * Standard rate limit exceeded response
 */
function handleLimitReached(req: Request, res: Response): void {
  const retryAfter = res.getHeader('Retry-After');
  
  logger.warn(
    {
      key: (req as unknown as { rateLimit: { key: string } }).rateLimit?.key,
      path: req.path,
      ip: req.ip,
    },
    'Rate limit exceeded'
  );
  
  res.status(429).json({
    success: false,
    error: {
      code: ErrorCode.RATE_LIMITED,
      message: 'Too many requests. Please try again later.',
      details: {
        retryAfter: retryAfter ? parseInt(retryAfter as string, 10) : 60,
      },
    },
  });
}

// ============================================================================
// Rate Limit Configurations
// ============================================================================

/**
 * General API rate limiter
 * Applied to all API routes by default
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: generateKey,
  handler: handleLimitReached,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/healthz';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use email or IP for auth endpoints
    const email = req.body?.email;
    if (email) {
      return `auth:${email.toLowerCase()}`;
    }
    return `auth:${req.ip || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, path: req.path, email: req.body?.email },
      'Auth rate limit exceeded - possible brute force attack'
    );
    
    res.status(429).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMITED,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
        details: {
          retryAfter: 900, // 15 minutes in seconds
        },
      },
    });
  },
});

/**
 * OTP rate limiter
 * Limits OTP sending to prevent abuse
 */
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 OTP requests per hour per phone number
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phoneNumber = req.body?.phoneNumber;
    if (phoneNumber) {
      return `otp:${phoneNumber}`;
    }
    return `otp:${req.ip || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, phoneNumber: req.body?.phoneNumber },
      'OTP rate limit exceeded'
    );
    
    res.status(429).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMITED,
        message: 'Too many OTP requests. Please try again after 1 hour.',
        details: {
          retryAfter: 3600, // 1 hour in seconds
        },
      },
    });
  },
});

/**
 * Webhook rate limiter
 * Applied to webhook receiving endpoints
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 webhooks per minute per source
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use webhook endpoint ID or IP
    const endpointId = req.params.endpointId || req.headers['x-webhook-endpoint-id'];
    if (endpointId) {
      return `webhook:${endpointId}`;
    }
    return `webhook:${req.ip || 'unknown'}`;
  },
  handler: handleLimitReached,
});

/**
 * Call initiation rate limiter
 * Prevents spam call attempts
 */
export const callRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 calls per minute per workspace
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateWorkspaceKey,
  handler: (req, res) => {
    const workspaceId = req.headers['x-workspace-id'] || req.params.workspaceId;
    
    logger.warn(
      { workspaceId, ip: req.ip },
      'Call rate limit exceeded'
    );
    
    res.status(429).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMITED,
        message: 'Too many call requests. Please try again later.',
        details: {
          retryAfter: 60,
        },
      },
    });
  },
});

/**
 * Workspace-scoped rate limiter
 * Limits requests per workspace
 */
export const workspaceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute per workspace
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateWorkspaceKey,
  handler: handleLimitReached,
});

/**
 * API key rate limiter
 * Separate limits for API key authentication
 */
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute per API key
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'];
    if (typeof apiKey === 'string') {
      return `api:${apiKey.substring(0, 16)}`;
    }
    return `api:${req.ip || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip },
      'API key rate limit exceeded'
    );
    
    res.status(429).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMITED,
        message: 'API rate limit exceeded. Please upgrade your plan or try again later.',
        details: {
          retryAfter: 60,
        },
      },
    });
  },
});

/**
 * Billing rate limiter
 * Limits billing-related operations
 */
export const billingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 billing operations per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: handleLimitReached,
});

// ============================================================================
// Custom Rate Limiter Factory
// ============================================================================

interface CustomRateLimitOptions {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Create a custom rate limiter with specific configuration
 */
export function createRateLimiter(options: CustomRateLimitOptions = {}) {
  const {
    windowMs = config.rateLimit.windowMs,
    max = config.rateLimit.maxRequests,
    keyPrefix = 'custom',
    skipSuccessfulRequests = false,
  } = options;
  
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const baseKey = generateKey(req);
      return `${keyPrefix}:${baseKey}`;
    },
    handler: handleLimitReached,
    skipSuccessfulRequests,
  });
}

// ============================================================================
// Rate Limit Status Endpoint
// ============================================================================

/**
 * Get current rate limit status for a request
 * Returns remaining requests and reset time
 */
export function getRateLimitStatus(req: Request): {
  limit: number;
  remaining: number;
  resetTime: Date | null;
} {
  const rateLimitInfo = (req as unknown as { rateLimit?: { limit: number; remaining: number; resetTime: Date } }).rateLimit;
  
  if (!rateLimitInfo) {
    return {
      limit: config.rateLimit.maxRequests,
      remaining: config.rateLimit.maxRequests,
      resetTime: null,
    };
  }
  
  return {
    limit: rateLimitInfo.limit,
    remaining: rateLimitInfo.remaining,
    resetTime: rateLimitInfo.resetTime,
  };
}
