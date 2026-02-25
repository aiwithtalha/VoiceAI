/**
 * Universal Voice AI Platform - Workspace Context Middleware
 * 
 * Extracts workspace ID from request and validates user access.
 * Attaches workspace context to the request for downstream handlers.
 */

import { Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { WorkspaceContextRequest, WorkspaceRole, ApiError, ErrorCode } from '../types';

// ============================================================================
// Workspace ID Extraction
// ============================================================================

/**
 * Extract workspace ID from various request sources
 * Priority: Header > Query param > Body > Path param
 */
function extractWorkspaceId(req: WorkspaceContextRequest): string | null {
  // Check header first (X-Workspace-Id)
  const headerId = req.headers['x-workspace-id'];
  if (typeof headerId === 'string' && headerId) {
    return headerId;
  }
  
  // Check query parameter
  const queryId = req.query.workspaceId;
  if (typeof queryId === 'string' && queryId) {
    return queryId;
  }
  
  // Check body
  const bodyId = req.body?.workspaceId;
  if (typeof bodyId === 'string' && bodyId) {
    return bodyId;
  }
  
  // Check path parameters (for routes like /workspaces/:workspaceId/...)
  const paramsId = req.params?.workspaceId;
  if (typeof paramsId === 'string' && paramsId) {
    return paramsId;
  }
  
  return null;
}

// ============================================================================
// Mock Database Functions
// ============================================================================

// In a real implementation, these would use Prisma client
// For now, we'll create placeholder functions that would be replaced

interface WorkspaceMemberData {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

/**
 * Get workspace member record for a user
 * This is a placeholder - in production, use Prisma
 */
async function getWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberData | null> {
  // TODO: Replace with actual Prisma query
  // const member = await prisma.workspaceMember.findFirst({
  //   where: { workspaceId, userId },
  // });
  
  // Placeholder implementation
  return null;
}

/**
 * Check if workspace exists
 * This is a placeholder - in production, use Prisma
 */
async function workspaceExists(workspaceId: string): Promise<boolean> {
  // TODO: Replace with actual Prisma query
  // const workspace = await prisma.workspace.findUnique({
  //   where: { id: workspaceId },
  // });
  // return !!workspace;
  
  // Placeholder implementation
  return false;
}

// ============================================================================
// Workspace Middleware
// ============================================================================

/**
 * Workspace Context Middleware
 * 
 * Extracts workspace ID from request and validates that the authenticated
 * user has access to the workspace. Attaches workspaceId and workspaceRole
 * to the request object.
 * 
 * Usage:
 *   router.get('/resources', authenticateJwt, workspaceMiddleware, getResources);
 */
export async function workspaceMiddleware(
  req: WorkspaceContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    // Ensure user is authenticated
    if (!req.user) {
      logger.warn({ requestId }, 'Workspace middleware requires authentication');
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
      return;
    }
    
    const workspaceId = extractWorkspaceId(req);
    
    if (!workspaceId) {
      logger.debug({ requestId }, 'Workspace ID not provided in request');
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Workspace ID is required. Provide it via X-Workspace-Id header, query parameter, or request body.',
        },
      });
      return;
    }
    
    // Validate workspace ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workspaceId)) {
      logger.debug({ requestId, workspaceId }, 'Invalid workspace ID format');
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid workspace ID format',
        },
      });
      return;
    }
    
    // Check if workspace exists
    const exists = await workspaceExists(workspaceId);
    if (!exists) {
      logger.debug({ requestId, workspaceId }, 'Workspace not found');
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Workspace not found',
        },
      });
      return;
    }
    
    // Get user's role in the workspace
    const member = await getWorkspaceMember(workspaceId, req.user.userId);
    
    if (!member) {
      logger.warn(
        { requestId, workspaceId, userId: req.user.userId },
        'User is not a member of the workspace'
      );
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: 'You do not have access to this workspace',
        },
      });
      return;
    }
    
    // Attach workspace context to request
    req.workspaceId = workspaceId;
    req.workspaceRole = member.role;
    
    logger.debug(
      { requestId, workspaceId, userId: req.user.userId, role: member.role },
      'Workspace context attached'
    );
    
    next();
  } catch (error) {
    logger.error(
      { requestId, error: (error as Error).message },
      'Workspace middleware error'
    );
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to process workspace context',
      },
    });
  }
}

/**
 * Optional Workspace Middleware
 * 
 * Attaches workspace context if workspace ID is provided and user has access,
 * but doesn't require it. Useful for endpoints that can work with or without
 * a specific workspace context.
 */
export async function optionalWorkspaceMiddleware(
  req: WorkspaceContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    // If user is not authenticated, skip workspace context
    if (!req.user) {
      return next();
    }
    
    const workspaceId = extractWorkspaceId(req);
    
    if (!workspaceId) {
      return next();
    }
    
    // Try to get workspace member (silently fail if not found)
    const member = await getWorkspaceMember(workspaceId, req.user.userId);
    
    if (member) {
      req.workspaceId = workspaceId;
      req.workspaceRole = member.role;
      
      logger.debug(
        { requestId, workspaceId, role: member.role },
        'Optional workspace context attached'
      );
    }
    
    next();
  } catch (error) {
    // Silently fail for optional middleware
    logger.debug(
      { requestId, error: (error as Error).message },
      'Optional workspace middleware error (ignored)'
    );
    next();
  }
}

/**
 * Require Active Workspace Middleware
 * 
 * Ensures the workspace is active (not suspended or deleted).
 * Must be used after workspaceMiddleware.
 */
export async function requireActiveWorkspace(
  req: WorkspaceContextRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.workspaceId) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Workspace context required',
        },
      });
      return;
    }
    
    // TODO: Check if workspace is active in database
    // const workspace = await prisma.workspace.findUnique({
    //   where: { id: req.workspaceId },
    // });
    //
    // if (!workspace || workspace.status !== 'active') {
    //   res.status(403).json({
    //     success: false,
    //     error: {
    //       code: ErrorCode.FORBIDDEN,
    //       message: 'Workspace is not active',
    //     },
    //   });
    //   return;
    // }
    
    next();
  } catch (error) {
    logger.error(
      { requestId, error: (error as Error).message },
      'Active workspace check error'
    );
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to verify workspace status',
      },
    });
  }
}

/**
 * Workspace Parameter Middleware
 * 
 * For routes with :workspaceId parameter, extracts and validates
 * the workspace ID before the route handler.
 */
export function workspaceParamMiddleware(
  req: WorkspaceContextRequest,
  res: Response,
  next: NextFunction,
  workspaceId: string
): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspaceId)) {
    logger.debug({ requestId, workspaceId }, 'Invalid workspace ID format in parameter');
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid workspace ID format',
      },
    });
    return;
  }
  
  next();
}
