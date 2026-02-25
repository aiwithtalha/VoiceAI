/**
 * Webhook Routes
 * 
 * API endpoints for managing webhooks:
 * - CRUD operations for webhooks
 * - Test webhook delivery
 * - View delivery history
 * 
 * @module routes/webhooks
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getDeliveryHistory,
  getDeliveryStats,
  regenerateSecret,
  WebhookEvent,
} from '../services/webhook-service';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  headers: z.record(z.string()).optional(),
  retryConfig: z.object({
    maxRetries: z.number().min(0).max(10).optional(),
    baseDelayMs: z.number().min(100).max(60000).optional(),
    maxDelayMs: z.number().min(1000).max(600000).optional(),
    retryableStatusCodes: z.array(z.number()).optional(),
  }).optional(),
});

const UpdateWebhookSchema = CreateWebhookSchema.partial();

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /webhooks
 * List all webhooks for the workspace
 */
router.get(
  '/',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;

    const webhooks = await prisma.webhook.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        headers: true,
        retryConfig: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get delivery stats for each webhook
    const webhooksWithStats = await Promise.all(
      webhooks.map(async (webhook) => {
        const stats = await getDeliveryStats(webhook.id);
        return {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.isActive,
          headers: webhook.headers,
          retryConfig: webhook.retryConfig,
          stats: {
            total: stats.total,
            delivered: stats.delivered,
            failed: stats.failed,
            pending: stats.pending,
            successRate: Math.round(stats.successRate * 100) / 100,
            averageLatency: stats.averageLatency,
          },
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt,
        };
      })
    );

    res.json({
      success: true,
      data: webhooksWithStats,
    });
  }
);

/**
 * POST /webhooks
 * Create a new webhook
 */
router.post(
  '/',
  requireAuth,
  requireWorkspace,
  validateRequest(CreateWebhookSchema),
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { name, url, events, headers, retryConfig } = req.body;

    logger.info({ workspaceId, webhookName: name }, 'Creating webhook');

    // Validate events
    const validEvents: WebhookEvent[] = [
      'call.started',
      'call.ended',
      'call.transferred',
      'appointment.booked',
      'appointment.cancelled',
      'sms.sent',
      'sms.delivered',
      'tool.executed',
      'recording.completed',
      'transcription.completed',
      'all',
    ];

    const invalidEvents = events.filter((e: string) => !validEvents.includes(e as WebhookEvent));
    if (invalidEvents.length > 0) {
      throw new ApiError(400, `Invalid events: ${invalidEvents.join(', ')}`);
    }

    const webhook = await createWebhook({
      workspaceId,
      name,
      url,
      events: events as WebhookEvent[],
      isActive: true,
      headers: headers || {},
      retryConfig: retryConfig || {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 300000,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        secret: webhook.secret, // Only shown once on creation
        createdAt: webhook.createdAt,
      },
      message: 'Webhook created successfully. Save the secret - it will not be shown again.',
    });
  }
);

/**
 * GET /webhooks/:id
 * Get a specific webhook
 */
router.get(
  '/:id',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;

    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        workspaceId,
      },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        headers: true,
        retryConfig: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!webhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    // Get delivery stats
    const stats = await getDeliveryStats(webhook.id);

    res.json({
      success: true,
      data: {
        ...webhook,
        stats: {
          total: stats.total,
          delivered: stats.delivered,
          failed: stats.failed,
          pending: stats.pending,
          successRate: Math.round(stats.successRate * 100) / 100,
          averageLatency: stats.averageLatency,
        },
      },
    });
  }
);

/**
 * PUT /webhooks/:id
 * Update a webhook
 */
router.put(
  '/:id',
  requireAuth,
  requireWorkspace,
  validateRequest(UpdateWebhookSchema),
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;
    const updateData = req.body;

    // Check if webhook exists and belongs to workspace
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existingWebhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    // Validate events if provided
    if (updateData.events) {
      const validEvents: WebhookEvent[] = [
        'call.started',
        'call.ended',
        'call.transferred',
        'appointment.booked',
        'appointment.cancelled',
        'sms.sent',
        'sms.delivered',
        'tool.executed',
        'recording.completed',
        'transcription.completed',
        'all',
      ];

      const invalidEvents = updateData.events.filter((e: string) => !validEvents.includes(e as WebhookEvent));
      if (invalidEvents.length > 0) {
        throw new ApiError(400, `Invalid events: ${invalidEvents.join(', ')}`);
      }
    }

    logger.info({ workspaceId, webhookId: id }, 'Updating webhook');

    const updatedWebhook = await updateWebhook(id, updateData);

    res.json({
      success: true,
      data: {
        id: updatedWebhook.id,
        name: updatedWebhook.name,
        url: updatedWebhook.url,
        events: updatedWebhook.events,
        isActive: updatedWebhook.isActive,
        updatedAt: updatedWebhook.updatedAt,
      },
      message: 'Webhook updated successfully',
    });
  }
);

/**
 * DELETE /webhooks/:id
 * Delete a webhook
 */
router.delete(
  '/:id',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;

    // Check if webhook exists and belongs to workspace
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existingWebhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    logger.info({ workspaceId, webhookId: id }, 'Deleting webhook');

    await deleteWebhook(id);

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  }
);

/**
 * POST /webhooks/:id/test
 * Test a webhook by sending a test event
 */
router.post(
  '/:id/test',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;

    // Check if webhook exists and belongs to workspace
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existingWebhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    logger.info({ workspaceId, webhookId: id }, 'Testing webhook');

    const result = await testWebhook(id);

    res.json({
      success: result.success,
      data: {
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        duration: result.duration,
        willRetry: result.willRetry,
      },
      error: result.error,
    });
  }
);

/**
 * GET /webhooks/:id/deliveries
 * Get delivery history for a webhook
 */
router.get(
  '/:id/deliveries',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;
    const { limit = '50', status } = req.query;

    // Check if webhook exists and belongs to workspace
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existingWebhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        webhookId: id,
        ...(status ? { status: status as string } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
      select: {
        id: true,
        event: true,
        status: true,
        httpStatus: true,
        errorMessage: true,
        attemptCount: true,
        nextRetryAt: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: deliveries,
    });
  }
);

/**
 * GET /webhooks/:id/deliveries/:deliveryId
 * Get details of a specific delivery
 */
router.get(
  '/:id/deliveries/:deliveryId',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id, deliveryId } = req.params;

    // Check if webhook exists and belongs to workspace
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existingWebhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    const delivery = await prisma.webhookDelivery.findFirst({
      where: {
        id: deliveryId,
        webhookId: id,
      },
    });

    if (!delivery) {
      throw new ApiError(404, 'Delivery not found');
    }

    res.json({
      success: true,
      data: {
        id: delivery.id,
        event: delivery.event,
        payload: delivery.payload,
        status: delivery.status,
        httpStatus: delivery.httpStatus,
        responseBody: delivery.responseBody,
        errorMessage: delivery.errorMessage,
        attemptCount: delivery.attemptCount,
        nextRetryAt: delivery.nextRetryAt,
        deliveredAt: delivery.deliveredAt,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
      },
    });
  }
);

/**
 * POST /webhooks/:id/regenerate-secret
 * Regenerate webhook signing secret
 */
router.post(
  '/:id/regenerate-secret',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;

    // Check if webhook exists and belongs to workspace
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existingWebhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    logger.info({ workspaceId, webhookId: id }, 'Regenerating webhook secret');

    const newSecret = await regenerateSecret(id);

    res.json({
      success: true,
      data: {
        secret: newSecret,
      },
      message: 'Webhook secret regenerated. Update your endpoint to use the new secret.',
    });
  }
);

/**
 * PATCH /webhooks/:id/toggle
 * Toggle webhook active status
 */
router.patch(
  '/:id/toggle',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;

    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!webhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    const updatedWebhook = await prisma.webhook.update({
      where: { id },
      data: {
        isActive: !webhook.isActive,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        id: updatedWebhook.id,
        isActive: updatedWebhook.isActive,
      },
      message: `Webhook ${updatedWebhook.isActive ? 'enabled' : 'disabled'}`,
    });
  }
);

/**
 * GET /webhooks/events
 * List available webhook events
 */
router.get(
  '/events',
  requireAuth,
  async (req: Request, res: Response) => {
    const events = [
      {
        id: 'call.started',
        name: 'Call Started',
        description: 'Triggered when a new call begins',
        payload: {
          callId: 'string',
          callerPhone: 'string',
          agentId: 'string',
          timestamp: 'string',
        },
      },
      {
        id: 'call.ended',
        name: 'Call Ended',
        description: 'Triggered when a call ends',
        payload: {
          callId: 'string',
          duration: 'number',
          endReason: 'string',
          timestamp: 'string',
        },
      },
      {
        id: 'call.transferred',
        name: 'Call Transferred',
        description: 'Triggered when a call is transferred',
        payload: {
          callId: 'string',
          transferredTo: 'string',
          transferType: 'string',
          timestamp: 'string',
        },
      },
      {
        id: 'appointment.booked',
        name: 'Appointment Booked',
        description: 'Triggered when an appointment is scheduled',
        payload: {
          appointmentId: 'string',
          callId: 'string',
          startTime: 'string',
          endTime: 'string',
          attendeeName: 'string',
          attendeeEmail: 'string',
        },
      },
      {
        id: 'appointment.cancelled',
        name: 'Appointment Cancelled',
        description: 'Triggered when an appointment is cancelled',
        payload: {
          appointmentId: 'string',
          callId: 'string',
          reason: 'string',
        },
      },
      {
        id: 'sms.sent',
        name: 'SMS Sent',
        description: 'Triggered when an SMS is sent',
        payload: {
          messageId: 'string',
          callId: 'string',
          to: 'string',
          messageLength: 'number',
        },
      },
      {
        id: 'sms.delivered',
        name: 'SMS Delivered',
        description: 'Triggered when an SMS is delivered',
        payload: {
          messageId: 'string',
          status: 'string',
          deliveredAt: 'string',
        },
      },
      {
        id: 'tool.executed',
        name: 'Tool Executed',
        description: 'Triggered when a tool is executed during a call',
        payload: {
          callId: 'string',
          toolId: 'string',
          toolType: 'string',
          success: 'boolean',
          duration: 'number',
        },
      },
      {
        id: 'recording.completed',
        name: 'Recording Completed',
        description: 'Triggered when call recording is ready',
        payload: {
          callId: 'string',
          recordingUrl: 'string',
          duration: 'number',
        },
      },
      {
        id: 'transcription.completed',
        name: 'Transcription Completed',
        description: 'Triggered when call transcription is ready',
        payload: {
          callId: 'string',
          transcription: 'string',
          confidence: 'number',
        },
      },
      {
        id: 'all',
        name: 'All Events',
        description: 'Subscribe to all webhook events',
        payload: {},
      },
    ];

    res.json({
      success: true,
      data: events,
    });
  }
);

/**
 * POST /webhooks/verify
 * Verify a webhook signature (for testing)
 */
router.post(
  '/verify',
  async (req: Request, res: Response) => {
    const { payload, signature, secret } = req.body;

    if (!payload || !signature || !secret) {
      throw new ApiError(400, 'payload, signature, and secret are required');
    }

    const { verifySignature } = await import('../services/webhook-service');
    const isValid = verifySignature(payload, signature, secret);

    res.json({
      success: true,
      data: {
        valid: isValid,
      },
    });
  }
);

export default router;
