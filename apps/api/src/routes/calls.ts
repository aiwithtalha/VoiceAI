/**
 * Universal Voice AI Platform - Calls Routes
 * 
 * Express routes for call management, listing, transcripts, and recordings.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../middleware/auth';
import { workspaceMiddleware } from '../middleware/workspace';
import { callRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';
import { WorkspaceContextRequest, CallStatus, CallDirection } from '../types';
import {
  initiateOutboundCall,
  endCall,
  getCallTranscript,
  listCalls,
  getCall,
  getCallStats,
  handleCallFailure,
} from '../services/call';
import { hasSufficientCredits } from '../services/billing';
import { config } from '../config';
import logger from '../utils/logger';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const listCallsSchema = z.object({
  status: z.enum([
    'queued', 'ringing', 'in_progress', 'completed', 'busy', 'failed', 'no_answer', 'canceled', 'voicemail'
  ]).optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  assistantId: z.string().optional(),
  phoneNumberId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().transform(Number).default('50'),
  offset: z.string().transform(Number).default('0'),
});

const initiateCallSchema = z.object({
  toNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format. Must be E.164 format (e.g., +14155551234)'),
  fromNumberId: z.string(),
  assistantId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const endCallSchema = z.object({
  status: z.enum(['completed', 'failed', 'canceled']).optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /calls
 * List calls with filters
 */
router.get(
  '/',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const query = listCallsSchema.parse(req.query);
    
    const calls = await listCalls({
      workspaceId: req.workspaceId!,
      status: query.status as CallStatus,
      direction: query.direction as CallDirection,
      assistantId: query.assistantId,
      phoneNumberId: query.phoneNumberId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
    
    res.status(200).json({
      success: true,
      data: calls,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: calls.length, // In production, get actual count
      },
    });
  })
);

/**
 * POST /calls
 * Initiate an outbound call
 */
router.post(
  '/',
  authenticateJwt,
  workspaceMiddleware,
  callRateLimiter,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const input = initiateCallSchema.parse(req.body);
    
    // Check if workspace has sufficient credits
    const hasCredits = await hasSufficientCredits(
      req.workspaceId!,
      config.call.minimumWalletBalanceCents
    );
    
    if (!hasCredits) {
      res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient wallet balance. Please add credits to continue.',
        },
      });
      return;
    }
    
    const result = await initiateOutboundCall({
      workspaceId: req.workspaceId!,
      assistantId: input.assistantId,
      toNumber: input.toNumber,
      fromNumberId: input.fromNumberId,
      metadata: input.metadata,
    });
    
    res.status(201).json({
      success: true,
      data: {
        call: result.call,
        sessionToken: result.sessionToken,
      },
    });
  })
);

/**
 * GET /calls/stats
 * Get call statistics for the workspace
 */
router.get(
  '/stats',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const stats = await getCallStats(req.workspaceId!);
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /calls/:callId
 * Get call details
 */
router.get(
  '/:callId',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const call = await getCall(req.params.callId);
    
    if (!call || call.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Call not found' },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: call,
    });
  })
);

/**
 * GET /calls/:callId/transcript
 * Get call transcript
 */
router.get(
  '/:callId/transcript',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const call = await getCall(req.params.callId);
    
    if (!call || call.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Call not found' },
      });
      return;
    }
    
    const transcript = await getCallTranscript(req.params.callId);
    
    if (!transcript) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transcript not available' },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: transcript,
    });
  })
);

/**
 * GET /calls/:callId/recording
 * Get call recording URL
 */
router.get(
  '/:callId/recording',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const call = await getCall(req.params.callId);
    
    if (!call || call.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Call not found' },
      });
      return;
    }
    
    if (!call.recordingUrl) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording not available' },
      });
      return;
    }
    
    // In production, generate a signed URL for the recording
    res.status(200).json({
      success: true,
      data: {
        recordingUrl: call.recordingUrl,
        duration: call.recordingDuration,
      },
    });
  })
);

/**
 * POST /calls/:callId/end
 * End an active call
 */
router.post(
  '/:callId/end',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const call = await getCall(req.params.callId);
    
    if (!call || call.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Call not found' },
      });
      return;
    }
    
    if (call.status !== CallStatus.IN_PROGRESS && call.status !== CallStatus.RINGING) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Call is not active' },
      });
      return;
    }
    
    const input = endCallSchema.parse(req.body);
    const endedCall = await endCall({
      callId: req.params.callId,
      status: input.status as CallStatus,
    });
    
    res.status(200).json({
      success: true,
      data: endedCall,
    });
  })
);

/**
 * POST /calls/:callId/fail
 * Mark a call as failed and refund credits if applicable
 * Internal endpoint for handling call failures
 */
router.post(
  '/:callId/fail',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const call = await getCall(req.params.callId);
    
    if (!call || call.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Call not found' },
      });
      return;
    }
    
    const { reason, deductAmount } = z.object({
      reason: z.string(),
      deductAmount: z.number().optional(),
    }).parse(req.body);
    
    const failedCall = await handleCallFailure(req.params.callId, reason, deductAmount);
    
    res.status(200).json({
      success: true,
      data: failedCall,
    });
  })
);

/**
 * GET /calls/:callId/analysis
 * Get call analysis (sentiment, summary, etc.)
 */
router.get(
  '/:callId/analysis',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const call = await getCall(req.params.callId);
    
    if (!call || call.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Call not found' },
      });
      return;
    }
    
    const transcript = await getCallTranscript(req.params.callId);
    
    // Generate analysis from transcript
    const analysis = {
      sentiment: transcript?.sentiment || {
        overall: 'neutral',
        score: 0,
        segments: [],
      },
      summary: transcript?.summary || 'Summary not available',
      keyTopics: [],
      actionItems: [],
      duration: call.duration,
      cost: call.cost,
    };
    
    res.status(200).json({
      success: true,
      data: analysis,
    });
  })
);

export default router;
