/**
 * Universal Voice AI Platform - Assistants Routes
 * 
 * Express routes for assistant CRUD, publishing, versioning, and templates.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../middleware/auth';
import { workspaceMiddleware } from '../middleware/workspace';
import { requireWorkspaceAdmin } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { WorkspaceContextRequest } from '../types';
import {
  createAssistantService,
  updateAssistantService,
  getAssistant,
  listAssistants,
  deleteAssistantService,
  publishAssistant,
  unpublishAssistant,
  createNewVersion,
  getAssistantVersionHistory,
  rollbackToVersion,
  listTemplates,
  getTemplate,
  createAssistantFromTemplate,
} from '../services/assistants';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const voiceConfigSchema = z.object({
  provider: z.enum(['elevenlabs', 'openai', 'google', 'aws', 'azure', 'playht']).optional(),
  voiceId: z.string().optional(),
  speed: z.number().min(0.5).max(2).optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
});

const llmConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'azure', 'cohere', 'mistral']).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4096).optional(),
  systemPrompt: z.string().max(10000).optional(),
});

const sttConfigSchema = z.object({
  provider: z.enum(['deepgram', 'assemblyai', 'google', 'aws', 'azure', 'openai']).optional(),
  language: z.string().optional(),
  model: z.string().optional(),
});

const telephonyConfigSchema = z.object({
  provider: z.enum(['twilio', 'vonage', 'plivo', 'telnyx']).optional(),
  greetingMessage: z.string().max(500).optional(),
  voicemailMessage: z.string().max(500).optional().nullable(),
  maxCallDuration: z.number().min(60).max(7200).optional(),
});

const assistantConfigSchema = z.object({
  voice: voiceConfigSchema.optional(),
  llm: llmConfigSchema.optional(),
  stt: sttConfigSchema.optional(),
  telephony: telephonyConfigSchema.optional(),
  tools: z.array(z.string()).optional(),
  variables: z.record(z.string()).optional(),
});

const createAssistantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  templateId: z.string().optional(),
  config: assistantConfigSchema.optional(),
});

const updateAssistantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  config: assistantConfigSchema.optional(),
});

const createVersionSchema = z.object({
  config: assistantConfigSchema,
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /assistants
 * List all assistants for the workspace
 */
router.get(
  '/',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const assistants = await listAssistants(req.workspaceId!);
    
    res.status(200).json({
      success: true,
      data: assistants,
    });
  })
);

/**
 * POST /assistants
 * Create a new assistant
 */
router.post(
  '/',
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
    
    const input = createAssistantSchema.parse(req.body);
    const assistant = await createAssistantService(
      req.workspaceId!,
      req.user.userId,
      input
    );
    
    res.status(201).json({
      success: true,
      data: assistant,
    });
  })
);

/**
 * GET /assistants/templates
 * List available assistant templates
 */
router.get(
  '/templates',
  authenticateJwt,
  asyncHandler(async (_req, res: Response) => {
    const templates = await listTemplates();
    
    res.status(200).json({
      success: true,
      data: templates,
    });
  })
);

/**
 * GET /assistants/templates/:templateId
 * Get a specific template
 */
router.get(
  '/templates/:templateId',
  authenticateJwt,
  asyncHandler(async (req, res: Response) => {
    const template = await getTemplate(req.params.templateId);
    
    res.status(200).json({
      success: true,
      data: template,
    });
  })
);

/**
 * POST /assistants/from-template
 * Create an assistant from a template
 */
router.post(
  '/from-template',
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
    
    const { templateId, name } = z.object({
      templateId: z.string(),
      name: z.string().min(1).max(100),
    }).parse(req.body);
    
    const assistant = await createAssistantFromTemplate(
      req.workspaceId!,
      req.user.userId,
      templateId,
      name
    );
    
    res.status(201).json({
      success: true,
      data: assistant,
    });
  })
);

/**
 * GET /assistants/:assistantId
 * Get assistant details
 */
router.get(
  '/:assistantId',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const assistant = await getAssistant(req.params.assistantId);
    
    res.status(200).json({
      success: true,
      data: assistant,
    });
  })
);

/**
 * PATCH /assistants/:assistantId
 * Update an assistant
 */
router.patch(
  '/:assistantId',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const input = updateAssistantSchema.parse(req.body);
    const assistant = await updateAssistantService(req.params.assistantId, input);
    
    res.status(200).json({
      success: true,
      data: assistant,
    });
  })
);

/**
 * DELETE /assistants/:assistantId
 * Delete an assistant
 */
router.delete(
  '/:assistantId',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    await deleteAssistantService(req.params.assistantId);
    
    res.status(200).json({
      success: true,
      data: { message: 'Assistant deleted successfully' },
    });
  })
);

/**
 * POST /assistants/:assistantId/publish
 * Publish an assistant
 */
router.post(
  '/:assistantId/publish',
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
    
    const assistant = await publishAssistant(req.params.assistantId, req.user.userId);
    
    res.status(200).json({
      success: true,
      data: assistant,
    });
  })
);

/**
 * POST /assistants/:assistantId/unpublish
 * Unpublish an assistant
 */
router.post(
  '/:assistantId/unpublish',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const assistant = await unpublishAssistant(req.params.assistantId);
    
    res.status(200).json({
      success: true,
      data: assistant,
    });
  })
);

/**
 * POST /assistants/:assistantId/versions
 * Create a new version of an assistant
 */
router.post(
  '/:assistantId/versions',
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
    
    const input = createVersionSchema.parse(req.body);
    const assistant = await createNewVersion(
      req.params.assistantId,
      req.user.userId,
      input.config
    );
    
    res.status(201).json({
      success: true,
      data: assistant,
    });
  })
);

/**
 * GET /assistants/:assistantId/versions
 * Get version history for an assistant
 */
router.get(
  '/:assistantId/versions',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const versions = await getAssistantVersionHistory(req.params.assistantId);
    
    res.status(200).json({
      success: true,
      data: versions,
    });
  })
);

/**
 * POST /assistants/:assistantId/rollback
 * Rollback to a specific version
 */
router.post(
  '/:assistantId/rollback',
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
    
    const { version } = z.object({ version: z.number().min(1) }).parse(req.body);
    const assistant = await rollbackToVersion(
      req.params.assistantId,
      version,
      req.user.userId
    );
    
    res.status(200).json({
      success: true,
      data: assistant,
    });
  })
);

/**
 * POST /assistants/:assistantId/clone
 * Clone an assistant
 */
router.post(
  '/:assistantId/clone',
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
    
    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);
    
    // Get the original assistant
    const original = await getAssistant(req.params.assistantId);
    
    // Create a new assistant with the same config
    const cloned = await createAssistantService(
      req.workspaceId!,
      req.user.userId,
      {
        name,
        description: original.description,
        config: original.config,
      }
    );
    
    res.status(201).json({
      success: true,
      data: cloned,
    });
  })
);

export default router;
