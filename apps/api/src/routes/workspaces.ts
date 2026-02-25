/**
 * Universal Voice AI Platform - Workspace Routes
 * 
 * Express routes for workspace CRUD operations and management.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../middleware/auth';
import { workspaceMiddleware, workspaceParamMiddleware } from '../middleware/workspace';
import { requireWorkspaceRoles, requireWorkspaceAdmin } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { WorkspaceContextRequest, WorkspaceRole, WorkspaceSettings } from '../types';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

const updateWorkspaceSettingsSchema = z.object({
  timezone: z.string().optional(),
  defaultLanguage: z.string().optional(),
  callRecordingEnabled: z.boolean().optional(),
  transcriptionEnabled: z.boolean().optional(),
  webhookUrl: z.string().url().optional().nullable(),
});

// ============================================================================
// Mock Service Functions
// ============================================================================

// In production, these would be in services/workspaces.ts
// For now, we'll create placeholder implementations

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  ownerId: string;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

const workspaces: Map<string, Workspace> = new Map();
const workspaceMembers: Map<string, Array<{ userId: string; role: WorkspaceRole }>> = new Map();

async function createWorkspace(
  userId: string,
  data: { name: string; slug: string; description?: string }
): Promise<Workspace> {
  // Check if slug is taken
  for (const ws of workspaces.values()) {
    if (ws.slug === data.slug) {
      throw new Error('Workspace slug already exists');
    }
  }
  
  const workspace: Workspace = {
    id: `ws_${Date.now()}`,
    name: data.name,
    slug: data.slug,
    description: data.description,
    ownerId: userId,
    settings: {
      timezone: 'UTC',
      defaultLanguage: 'en-US',
      callRecordingEnabled: true,
      transcriptionEnabled: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  workspaces.set(workspace.id, workspace);
  workspaceMembers.set(workspace.id, [{ userId, role: WorkspaceRole.OWNER }]);
  
  return workspace;
}

async function getWorkspacesForUser(userId: string): Promise<Workspace[]> {
  const userWorkspaces: Workspace[] = [];
  
  for (const [workspaceId, members] of workspaceMembers.entries()) {
    if (members.some((m) => m.userId === userId)) {
      const workspace = workspaces.get(workspaceId);
      if (workspace) {
        userWorkspaces.push(workspace);
      }
    }
  }
  
  return userWorkspaces;
}

async function getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
  return workspaces.get(workspaceId) || null;
}

async function updateWorkspace(
  workspaceId: string,
  data: Partial<Workspace>
): Promise<Workspace> {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  const updated = { ...workspace, ...data, updatedAt: new Date() };
  workspaces.set(workspaceId, updated);
  return updated;
}

async function deleteWorkspace(workspaceId: string): Promise<void> {
  workspaces.delete(workspaceId);
  workspaceMembers.delete(workspaceId);
}

async function getUserRoleInWorkspace(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const members = workspaceMembers.get(workspaceId);
  if (!members) return null;
  
  const member = members.find((m) => m.userId === userId);
  return member?.role || null;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /workspaces
 * List all workspaces for the current user
 */
router.get(
  '/',
  authenticateJwt,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    
    const userWorkspaces = await getWorkspacesForUser(req.user.userId);
    
    res.status(200).json({
      success: true,
      data: userWorkspaces,
    });
  })
);

/**
 * POST /workspaces
 * Create a new workspace
 */
router.post(
  '/',
  authenticateJwt,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    
    const input = createWorkspaceSchema.parse(req.body);
    const workspace = await createWorkspace(req.user.userId, input);
    
    res.status(201).json({
      success: true,
      data: workspace,
    });
  })
);

/**
 * GET /workspaces/:workspaceId
 * Get workspace details
 */
router.get(
  '/:workspaceId',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const workspace = await getWorkspaceById(req.params.workspaceId);
    
    if (!workspace) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: workspace,
    });
  })
);

/**
 * PATCH /workspaces/:workspaceId
 * Update workspace details
 */
router.patch(
  '/:workspaceId',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const input = updateWorkspaceSchema.parse(req.body);
    const workspace = await updateWorkspace(req.params.workspaceId, input);
    
    res.status(200).json({
      success: true,
      data: workspace,
    });
  })
);

/**
 * DELETE /workspaces/:workspaceId
 * Delete a workspace
 */
router.delete(
  '/:workspaceId',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceRoles(WorkspaceRole.OWNER),
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    await deleteWorkspace(req.params.workspaceId);
    
    res.status(200).json({
      success: true,
      data: { message: 'Workspace deleted successfully' },
    });
  })
);

/**
 * GET /workspaces/:workspaceId/settings
 * Get workspace settings
 */
router.get(
  '/:workspaceId/settings',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const workspace = await getWorkspaceById(req.params.workspaceId);
    
    if (!workspace) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: workspace.settings,
    });
  })
);

/**
 * PATCH /workspaces/:workspaceId/settings
 * Update workspace settings
 */
router.patch(
  '/:workspaceId/settings',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const input = updateWorkspaceSettingsSchema.parse(req.body);
    
    const workspace = await getWorkspaceById(req.params.workspaceId);
    if (!workspace) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
      return;
    }
    
    const updatedSettings = { ...workspace.settings, ...input };
    const updated = await updateWorkspace(req.params.workspaceId, {
      settings: updatedSettings,
    });
    
    res.status(200).json({
      success: true,
      data: updated.settings,
    });
  })
);

/**
 * GET /workspaces/:workspaceId/members
 * List workspace members
 */
router.get(
  '/:workspaceId/members',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const members = workspaceMembers.get(req.params.workspaceId) || [];
    
    // TODO: Fetch user details for each member from user service
    const membersWithDetails = members.map((member) => ({
      userId: member.userId,
      role: member.role,
      // In production, include user details (name, email, avatar)
    }));
    
    res.status(200).json({
      success: true,
      data: membersWithDetails,
    });
  })
);

// Param middleware for workspaceId validation
router.param('workspaceId', workspaceParamMiddleware);

export default router;
