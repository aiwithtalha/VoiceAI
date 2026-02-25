/**
 * Integration Routes
 * 
 * API endpoints for managing third-party integrations:
 * - List connected integrations
 * - Connect/disconnect Google OAuth
 * - Get integration status
 * 
 * @module routes/integrations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { googleIntegration } from '../integrations/google';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const GoogleConnectSchema = z.object({
  scopes: z.array(z.string()).optional(),
});

const GoogleCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /integrations
 * List all connected integrations for the workspace
 */
router.get(
  '/',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;

    const integrations = await prisma.integration.findMany({
      where: { workspaceId },
      select: {
        id: true,
        provider: true,
        status: true,
        connectedEmail: true,
        scope: true,
        tokenExpiry: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Format response
    const formattedIntegrations = integrations.map(integration => ({
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      connectedEmail: integration.connectedEmail,
      scopes: integration.scope,
      expiresAt: integration.tokenExpiry,
      metadata: integration.metadata,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    }));

    res.json({
      success: true,
      data: formattedIntegrations,
    });
  }
);

/**
 * GET /integrations/:provider/status
 * Get detailed status for a specific integration
 */
router.get(
  '/:provider/status',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { provider } = req.params;

    if (provider !== 'google') {
      throw new ApiError(400, 'Unsupported integration provider');
    }

    const status = await googleIntegration.getIntegrationStatus(workspaceId);

    res.json({
      success: true,
      data: status,
    });
  }
);

/**
 * POST /integrations/google/connect
 * Start Google OAuth flow
 */
router.post(
  '/google/connect',
  requireAuth,
  requireWorkspace,
  validateRequest(GoogleConnectSchema),
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { scopes } = req.body;

    logger.info({ workspaceId }, 'Starting Google OAuth flow');

    // Generate authorization URL
    const { url, state } = googleIntegration.generateAuthUrl(
      workspaceId,
      scopes
    );

    res.json({
      success: true,
      data: {
        authorizationUrl: url,
        state,
      },
    });
  }
);

/**
 * POST /integrations/google/callback
 * Handle Google OAuth callback
 */
router.post(
  '/google/callback',
  validateRequest(GoogleCallbackSchema),
  async (req: Request, res: Response) => {
    const { code, state } = req.body;

    try {
      const integration = await googleIntegration.handleAuthCallback(code, state);

      res.json({
        success: true,
        data: {
          id: integration.id,
          provider: integration.provider,
          status: integration.status,
          connectedEmail: integration.connectedEmail,
          scopes: integration.scope,
        },
        message: 'Google integration connected successfully',
      });
    } catch (error) {
      logger.error({ error, state }, 'Google OAuth callback failed');
      throw new ApiError(400, 'Failed to complete Google authorization');
    }
  }
);

/**
 * GET /integrations/google/calendars
 * List available Google Calendars
 */
router.get(
  '/google/calendars',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;

    const calendars = await googleIntegration.listCalendars(workspaceId);

    res.json({
      success: true,
      data: calendars,
    });
  }
);

/**
 * PUT /integrations/google/settings
 * Update Google integration settings
 */
router.put(
  '/google/settings',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { defaultCalendarId, timezone, defaultSheetId } = req.body;

    await googleIntegration.updateIntegrationMetadata(workspaceId, {
      calendarId: defaultCalendarId,
      timezone,
      defaultSheetId,
    });

    res.json({
      success: true,
      message: 'Integration settings updated',
    });
  }
);

/**
 * POST /integrations/google/calendar/availability
 * Get calendar availability
 */
router.post(
  '/google/calendar/availability',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const {
      startDate,
      endDate,
      durationMinutes = 30,
      timezone,
      workingHoursStart = 9,
      workingHoursEnd = 17,
    } = req.body;

    if (!startDate || !endDate) {
      throw new ApiError(400, 'startDate and endDate are required');
    }

    const availability = await googleIntegration.listAvailability(workspaceId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      durationMinutes,
      timezone,
      workingHoursStart,
      workingHoursEnd,
    });

    // Filter to only available slots
    const availableSlots = availability.filter(slot => slot.available);

    res.json({
      success: true,
      data: {
        slots: availableSlots,
        totalSlots: availability.length,
        availableCount: availableSlots.length,
      },
    });
  }
);

/**
 * POST /integrations/google/sheets/append
 * Append a row to a Google Sheet
 */
router.post(
  '/google/sheets/append',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { spreadsheetId, sheetName, rowData } = req.body;

    if (!spreadsheetId || !sheetName || !rowData) {
      throw new ApiError(400, 'spreadsheetId, sheetName, and rowData are required');
    }

    const result = await googleIntegration.appendRow(
      workspaceId,
      spreadsheetId,
      sheetName,
      rowData
    );

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to append row');
    }

    res.json({
      success: true,
      data: {
        rowNumber: result.rowNumber,
      },
    });
  }
);

/**
 * GET /integrations/google/sheets/read
 * Read data from a Google Sheet
 */
router.get(
  '/google/sheets/read',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { spreadsheetId, range } = req.query;

    if (!spreadsheetId || !range) {
      throw new ApiError(400, 'spreadsheetId and range are required');
    }

    const result = await googleIntegration.readSheet(
      workspaceId,
      spreadsheetId as string,
      range as string
    );

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to read sheet');
    }

    res.json({
      success: true,
      data: result.data,
    });
  }
);

/**
 * POST /integrations/google/sheets/create
 * Create a new Google Sheet
 */
router.post(
  '/google/sheets/create',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { title, sheetNames } = req.body;

    if (!title) {
      throw new ApiError(400, 'title is required');
    }

    const result = await googleIntegration.createSpreadsheet(
      workspaceId,
      title,
      sheetNames
    );

    if (!result.success) {
      throw new ApiError(500, result.error || 'Failed to create spreadsheet');
    }

    res.json({
      success: true,
      data: {
        spreadsheetId: result.spreadsheetId,
        url: result.url,
      },
    });
  }
);

/**
 * DELETE /integrations/:id
 * Disconnect an integration
 */
router.delete(
  '/:id',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;

    // Find the integration
    const integration = await prisma.integration.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!integration) {
      throw new ApiError(404, 'Integration not found');
    }

    // Handle provider-specific disconnection
    if (integration.provider === 'google') {
      await googleIntegration.disconnectIntegration(workspaceId);
    } else {
      // Generic disconnection for other providers
      await prisma.integration.delete({
        where: { id },
      });
    }

    res.json({
      success: true,
      message: 'Integration disconnected successfully',
    });
  }
);

/**
 * GET /integrations/providers
 * List available integration providers
 */
router.get(
  '/providers',
  requireAuth,
  async (req: Request, res: Response) => {
    const providers = [
      {
        id: 'google',
        name: 'Google Workspace',
        description: 'Connect Google Calendar and Google Sheets',
        icon: 'google',
        features: [
          'Calendar appointment booking',
          'Availability checking',
          'Spreadsheet data logging',
        ],
        authType: 'oauth2',
        setupRequired: !!(
          process.env.GOOGLE_CLIENT_ID && 
          process.env.GOOGLE_CLIENT_SECRET
        ),
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Send notifications to Slack channels',
        icon: 'slack',
        features: [
          'Call notifications',
          'Appointment alerts',
        ],
        authType: 'api_key',
        setupRequired: false, // Coming soon
        comingSoon: true,
      },
      {
        id: 'zapier',
        name: 'Zapier',
        description: 'Trigger Zapier workflows',
        icon: 'zapier',
        features: [
          'Workflow automation',
          'Third-party integrations',
        ],
        authType: 'webhook',
        setupRequired: false, // Coming soon
        comingSoon: true,
      },
    ];

    res.json({
      success: true,
      data: providers,
    });
  }
);

export default router;
