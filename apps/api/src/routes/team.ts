/**
 * Universal Voice AI Platform - Team Routes
 * 
 * Express routes for team member management and invitations.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../middleware/auth';
import { workspaceMiddleware } from '../middleware/workspace';
import { requireWorkspaceAdmin } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { WorkspaceContextRequest, WorkspaceRole } from '../types';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
});

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member']),
});

// ============================================================================
// Mock Service Functions
// ============================================================================

interface TeamMember {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  avatarUrl?: string;
  joinedAt: Date;
}

interface TeamInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

const teamMembers: Map<string, TeamMember[]> = new Map();
const invitations: Map<string, TeamInvitation> = new Map();

async function inviteTeamMember(
  workspaceId: string,
  invitedBy: string,
  data: { email: string; role: WorkspaceRole }
): Promise<TeamInvitation> {
  // Check if user is already a member
  const members = teamMembers.get(workspaceId) || [];
  const existingMember = members.find((m) => m.email === data.email);
  
  if (existingMember) {
    throw new Error('User is already a team member');
  }
  
  // Check for pending invitation
  for (const inv of invitations.values()) {
    if (inv.workspaceId === workspaceId && inv.email === data.email && !inv.acceptedAt) {
      throw new Error('Pending invitation already exists for this email');
    }
  }
  
  const invitation: TeamInvitation = {
    id: `inv_${Date.now()}`,
    workspaceId,
    email: data.email,
    role: data.role,
    invitedBy,
    token: `token_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: new Date(),
  };
  
  invitations.set(invitation.id, invitation);
  
  // TODO: Send invitation email
  // await sendInvitationEmail(invitation);
  
  return invitation;
}

async function getTeamMembers(workspaceId: string): Promise<TeamMember[]> {
  return teamMembers.get(workspaceId) || [];
}

async function getPendingInvitations(workspaceId: string): Promise<TeamInvitation[]> {
  const result: TeamInvitation[] = [];
  
  for (const inv of invitations.values()) {
    if (inv.workspaceId === workspaceId && !inv.acceptedAt && inv.expiresAt > new Date()) {
      result.push(inv);
    }
  }
  
  return result;
}

async function updateTeamMember(
  workspaceId: string,
  userId: string,
  data: { role: WorkspaceRole }
): Promise<TeamMember> {
  const members = teamMembers.get(workspaceId) || [];
  const memberIndex = members.findIndex((m) => m.userId === userId);
  
  if (memberIndex === -1) {
    throw new Error('Team member not found');
  }
  
  // Cannot change owner's role
  if (members[memberIndex].role === WorkspaceRole.OWNER) {
    throw new Error('Cannot change workspace owner\'s role');
  }
  
  members[memberIndex] = { ...members[memberIndex], role: data.role };
  teamMembers.set(workspaceId, members);
  
  return members[memberIndex];
}

async function removeTeamMember(workspaceId: string, userId: string): Promise<void> {
  const members = teamMembers.get(workspaceId) || [];
  const memberIndex = members.findIndex((m) => m.userId === userId);
  
  if (memberIndex === -1) {
    throw new Error('Team member not found');
  }
  
  // Cannot remove owner
  if (members[memberIndex].role === WorkspaceRole.OWNER) {
    throw new Error('Cannot remove workspace owner');
  }
  
  members.splice(memberIndex, 1);
  teamMembers.set(workspaceId, members);
}

async function cancelInvitation(workspaceId: string, invitationId: string): Promise<void> {
  const invitation = invitations.get(invitationId);
  
  if (!invitation || invitation.workspaceId !== workspaceId) {
    throw new Error('Invitation not found');
  }
  
  if (invitation.acceptedAt) {
    throw new Error('Cannot cancel already accepted invitation');
  }
  
  invitations.delete(invitationId);
}

async function acceptInvitation(token: string, userId: string): Promise<string> {
  // Find invitation by token
  let invitation: TeamInvitation | undefined;
  
  for (const inv of invitations.values()) {
    if (inv.token === token) {
      invitation = inv;
      break;
    }
  }
  
  if (!invitation) {
    throw new Error('Invalid invitation token');
  }
  
  if (invitation.acceptedAt) {
    throw new Error('Invitation already accepted');
  }
  
  if (invitation.expiresAt < new Date()) {
    throw new Error('Invitation has expired');
  }
  
  // Mark as accepted
  invitation.acceptedAt = new Date();
  invitations.set(invitation.id, invitation);
  
  // Add user to workspace
  const members = teamMembers.get(invitation.workspaceId) || [];
  members.push({
    id: `member_${Date.now()}`,
    workspaceId: invitation.workspaceId,
    userId,
    email: invitation.email,
    name: '', // Will be populated from user profile
    role: invitation.role,
    joinedAt: new Date(),
  });
  teamMembers.set(invitation.workspaceId, members);
  
  return invitation.workspaceId;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /teams/:workspaceId/members
 * List all team members in a workspace
 */
router.get(
  '/:workspaceId/members',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const members = await getTeamMembers(req.params.workspaceId);
    
    res.status(200).json({
      success: true,
      data: members,
    });
  })
);

/**
 * POST /teams/:workspaceId/invitations
 * Invite a new team member
 */
router.post(
  '/:workspaceId/invitations',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    
    const input = inviteMemberSchema.parse(req.body);
    const invitation = await inviteTeamMember(
      req.params.workspaceId,
      req.user.userId,
      {
        email: input.email,
        role: input.role as WorkspaceRole,
      }
    );
    
    res.status(201).json({
      success: true,
      data: invitation,
    });
  })
);

/**
 * GET /teams/:workspaceId/invitations
 * List pending invitations
 */
router.get(
  '/:workspaceId/invitations',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const pendingInvitations = await getPendingInvitations(req.params.workspaceId);
    
    res.status(200).json({
      success: true,
      data: pendingInvitations,
    });
  })
);

/**
 * POST /teams/invitations/accept
 * Accept a team invitation
 */
router.post(
  '/invitations/accept',
  authenticateJwt,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    
    const { token } = z.object({ token: z.string() }).parse(req.body);
    const workspaceId = await acceptInvitation(token, req.user.userId);
    
    res.status(200).json({
      success: true,
      data: { workspaceId, message: 'Invitation accepted successfully' },
    });
  })
);

/**
 * DELETE /teams/:workspaceId/invitations/:invitationId
 * Cancel a pending invitation
 */
router.delete(
  '/:workspaceId/invitations/:invitationId',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    await cancelInvitation(req.params.workspaceId, req.params.invitationId);
    
    res.status(200).json({
      success: true,
      data: { message: 'Invitation cancelled successfully' },
    });
  })
);

/**
 * PATCH /teams/:workspaceId/members/:userId
 * Update a team member's role
 */
router.patch(
  '/:workspaceId/members/:userId',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const input = updateMemberSchema.parse(req.body);
    const member = await updateTeamMember(
      req.params.workspaceId,
      req.params.userId,
      { role: input.role as WorkspaceRole }
    );
    
    res.status(200).json({
      success: true,
      data: member,
    });
  })
);

/**
 * DELETE /teams/:workspaceId/members/:userId
 * Remove a team member
 */
router.delete(
  '/:workspaceId/members/:userId',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    await removeTeamMember(req.params.workspaceId, req.params.userId);
    
    res.status(200).json({
      success: true,
      data: { message: 'Team member removed successfully' },
    });
  })
);

/**
 * POST /teams/:workspaceId/leave
 * Leave a workspace (for non-owners)
 */
router.post(
  '/:workspaceId/leave',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    
    // Cannot leave if you're the owner
    if (req.workspaceRole === WorkspaceRole.OWNER) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Workspace owner cannot leave. Transfer ownership or delete the workspace.',
        },
      });
      return;
    }
    
    await removeTeamMember(req.params.workspaceId, req.user.userId);
    
    res.status(200).json({
      success: true,
      data: { message: 'Left workspace successfully' },
    });
  })
);

export default router;
