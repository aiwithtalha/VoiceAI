/**
 * Universal Voice AI Platform - Authentication Middleware
 * 
 * JWT token verification, API key authentication, and request authorization.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyApiKey as verifyApiKeyHash } from '../utils/jwt';
import { config } from '../config';
import logger from '../utils/logger';
import { AuthenticatedRequest, ApiError, ErrorCode, WorkspaceContextRequest } from '../types';

// ============================================================================
// JWT Authentication Middleware
// ============================================================================

/**
 * Extract JWT token from Authorization header
 * Supports both "Bearer <token>" and plain token formats
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  // Check for Bearer token format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check for token-only format (for backward compatibility)
  return authHeader;
}

/**
 * Extract API key from X-API-Key header
 */
function extractApiKey(req: Request): string | null {
  const apiKeyHeader = req.headers['x-api-key'];
  
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }
  
  return null;
}

/**
 * JWT Authentication Middleware
 * Verifies the access token and attaches user info to the request
 */
export function authenticateJwt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const token = extractBearerToken(req);
    
    if (!token) {
      logger.debug({ requestId }, 'Missing authorization header');
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authorization header is required',
        },
      });
      return;
    }
    
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      logger.debug({ requestId }, 'Invalid or expired token');
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Invalid or expired token',
        },
      });
      return;
    }
    
    // Attach user info to request
    req.user = decoded;
    
    logger.debug(
      { requestId, userId: decoded.userId },
      'User authenticated via JWT'
    );
    
    next();
  } catch (error) {
    logger.error(
      { requestId, error: (error as Error).message },
      'Authentication error'
    );
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Optional JWT Authentication Middleware
 * Attaches user info if token is present and valid, but doesn't require it
 */
export function optionalAuthenticateJwt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);
  
  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

// ============================================================================
// API Key Authentication Middleware
// ============================================================================

// In-memory cache for API key lookups (in production, use Redis)
const apiKeyCache = new Map<string, { workspaceId: string; permissions: string[]; expiresAt: number }>();

/**
 * API Key Authentication Middleware
 * Verifies the API key and attaches workspace context to the request
 * 
 * Note: This is a simplified implementation. In production, you would:
 * - Use Redis for caching API key lookups
 * - Implement proper rate limiting per API key
 * - Log API key usage for analytics
 */
export async function authenticateApiKey(
  req: WorkspaceContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const apiKey = extractApiKey(req);
    
    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'API key is required',
        },
      });
      return;
    }
    
    // Check cache first
    const cached = apiKeyCache.get(apiKey);
    if (cached && cached.expiresAt > Date.now()) {
      req.workspaceId = cached.workspaceId;
      // req.apiKeyPermissions = cached.permissions;
      logger.debug({ requestId, workspaceId: cached.workspaceId }, 'API key authenticated from cache');
      next();
      return;
    }
    
    // In a real implementation, you would:
    // 1. Hash the API key
    // 2. Look up in database
    // 3. Verify the key is not revoked or expired
    // 4. Update last used timestamp
    
    // For now, we'll return an error indicating API key auth is not fully implemented
    logger.warn({ requestId }, 'API key authentication not fully implemented');
    res.status(501).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'API key authentication is not fully implemented',
      },
    });
  } catch (error) {
    logger.error({ requestId, error: (error as Error).message }, 'API key authentication error');
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'API key authentication failed',
      },
    });
  }
}

/**
 * Combined Authentication Middleware
 * Tries JWT first, then falls back to API key
 */
export async function authenticate(
  req: WorkspaceContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req);
  const apiKey = extractApiKey(req);
  
  // Try JWT authentication first
  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      req.user = decoded;
      return next();
    }
  }
  
  // Fall back to API key authentication
  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }
  
  // No authentication provided
  res.status(401).json({
    success: false,
    error: {
      code: ErrorCode.UNAUTHORIZED,
      message: 'Authentication required. Provide either a Bearer token or API key.',
    },
  });
}

// ============================================================================
// Authorization Middleware
// ============================================================================

/**
 * Require specific roles for workspace access
 * Must be used after workspaceMiddleware
 */
export function requireWorkspaceRoles(...allowedRoles: string[]) {
  return (req: WorkspaceContextRequest, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    const userRole = req.workspaceRole;
    
    if (!userRole) {
      logger.warn({ requestId }, 'Workspace role not found in request');
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'Workspace access required',
        },
      });
      return;
    }
    
    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        { requestId, userRole, allowedRoles },
        'User role not authorized for this action'
      );
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have permission to perform this action',
        },
      });
      return;
    }
    
    next();
  };
}

/**
 * Require workspace ownership
 * Shortcut for requireWorkspaceRoles('owner')
 */
export function requireWorkspaceOwner(
  req: WorkspaceContextRequest,
  res: Response,
  next: NextFunction
): void {
  return requireWorkspaceRoles('owner')(req, res, next);
}

/**
 * Require workspace admin or owner
 * Shortcut for requireWorkspaceRoles('owner', 'admin')
 */
export function requireWorkspaceAdmin(
  req: WorkspaceContextRequest,
  res: Response,
  next: NextFunction
): void {
  return requireWorkspaceRoles('owner', 'admin')(req, res, next);
}
