/**
 * Universal Voice AI Platform - Phone Numbers Routes
 * 
 * Express routes for phone number management, purchasing, and assignment.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../middleware/auth';
import { workspaceMiddleware } from '../middleware/workspace';
import { requireWorkspaceAdmin } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { WorkspaceContextRequest, PhoneNumber, AvailableNumber, PhoneNumberCapabilities, ApiError, ErrorCode } from '../types';
import { hasSufficientCredits, deductCredits } from '../services/billing';
import { PrismaClient } from '@voice-ai/database';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Phone number monthly cost in cents
const PHONE_NUMBER_MONTHLY_COST = 100; // $1.00

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Search for available phone numbers from telephony providers
 */
async function getAvailableNumbers(
  country: string,
  areaCode?: string,
  capabilities?: string[]
): Promise<AvailableNumber[]> {
  // TODO: Integrate with Twilio/Vonage API to search available numbers
  // This is a mock implementation for development
  const mockNumbers: AvailableNumber[] = [
    {
      phoneNumber: areaCode ? `+1${areaCode}5550101` : '+14155550101',
      friendlyName: areaCode ? `(${areaCode}) 555-0101` : '(415) 555-0101',
      locality: 'San Francisco',
      region: 'CA',
      countryCode: country,
      capabilities: {
        voice: true,
        sms: true,
        mms: true,
        fax: false,
      },
      monthlyCost: PHONE_NUMBER_MONTHLY_COST,
    },
    {
      phoneNumber: areaCode ? `+1${areaCode}5550102` : '+14155550102',
      friendlyName: areaCode ? `(${areaCode}) 555-0102` : '(415) 555-0102',
      locality: 'San Francisco',
      region: 'CA',
      countryCode: country,
      capabilities: {
        voice: true,
        sms: true,
        mms: true,
        fax: false,
      },
      monthlyCost: PHONE_NUMBER_MONTHLY_COST,
    },
    {
      phoneNumber: areaCode ? `+1${areaCode}5550103` : '+14155550103',
      friendlyName: areaCode ? `(${areaCode}) 555-0103` : '(415) 555-0103',
      locality: 'San Francisco',
      region: 'CA',
      countryCode: country,
      capabilities: {
        voice: true,
        sms: true,
        mms: false,
        fax: false,
      },
      monthlyCost: 80, // Lower cost for SMS-only
    },
  ];
  
  // Filter by capabilities if specified
  if (capabilities && capabilities.length > 0) {
    return mockNumbers.filter(num => 
      capabilities.every(cap => num.capabilities[cap as keyof PhoneNumberCapabilities])
    );
  }
  
  return mockNumbers;
}

/**
 * Purchase a phone number for a workspace
 */
async function purchaseNumber(
  workspaceId: string,
  phoneNumber: string,
  provider: string
): Promise<PhoneNumber> {
  // TODO: Integrate with Twilio/Vonage API to purchase number
  // For now, create a database record
  
  logger.info(
    { workspaceId, phoneNumber, provider },
    'Purchasing phone number'
  );
  
  const dbPhoneNumber = await prisma.phoneNumber.create({
    data: {
      workspaceId,
      phoneNumber,
      provider: provider as any,
      providerNumberId: `provider_${Date.now()}`,
      isActive: true,
      capabilities: {
        voice: true,
        sms: true,
        mms: true,
        fax: false,
      },
      monthlyCost: PHONE_NUMBER_MONTHLY_COST,
    },
  });
  
  // Map to PhoneNumber type
  const purchased: PhoneNumber = {
    id: dbPhoneNumber.id,
    workspaceId: dbPhoneNumber.workspaceId,
    phoneNumber: dbPhoneNumber.phoneNumber,
    provider: dbPhoneNumber.provider as any,
    providerNumberId: dbPhoneNumber.providerNumberId,
    assistantId: dbPhoneNumber.agentId || undefined,
    isActive: dbPhoneNumber.isActive,
    capabilities: dbPhoneNumber.capabilities as PhoneNumberCapabilities,
    monthlyCost: dbPhoneNumber.monthlyCost,
    purchasedAt: dbPhoneNumber.createdAt,
    releasedAt: undefined,
    createdAt: dbPhoneNumber.createdAt,
    updatedAt: dbPhoneNumber.updatedAt,
  };
  
  logger.info(
    { phoneNumberId: purchased.id, workspaceId },
    'Phone number purchased successfully'
  );
  
  return purchased;
}

/**
 * Get all phone numbers for a workspace
 */
async function getPhoneNumbersByWorkspace(workspaceId: string): Promise<PhoneNumber[]> {
  const dbPhoneNumbers = await prisma.phoneNumber.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
  
  return dbPhoneNumbers.map(db => ({
    id: db.id,
    workspaceId: db.workspaceId,
    phoneNumber: db.phoneNumber,
    provider: db.provider as any,
    providerNumberId: db.providerNumberId,
    assistantId: db.agentId || undefined,
    isActive: db.isActive,
    capabilities: db.capabilities as PhoneNumberCapabilities,
    monthlyCost: db.monthlyCost,
    purchasedAt: db.createdAt,
    releasedAt: undefined,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  }));
}

/**
 * Get a single phone number by ID
 */
async function getPhoneNumberById(id: string): Promise<PhoneNumber | null> {
  const dbPhoneNumber = await prisma.phoneNumber.findUnique({
    where: { id },
  });
  
  if (!dbPhoneNumber) return null;
  
  return {
    id: dbPhoneNumber.id,
    workspaceId: dbPhoneNumber.workspaceId,
    phoneNumber: dbPhoneNumber.phoneNumber,
    provider: dbPhoneNumber.provider as any,
    providerNumberId: dbPhoneNumber.providerNumberId,
    assistantId: dbPhoneNumber.agentId || undefined,
    isActive: dbPhoneNumber.isActive,
    capabilities: dbPhoneNumber.capabilities as PhoneNumberCapabilities,
    monthlyCost: dbPhoneNumber.monthlyCost,
    purchasedAt: dbPhoneNumber.createdAt,
    releasedAt: undefined,
    createdAt: dbPhoneNumber.createdAt,
    updatedAt: dbPhoneNumber.updatedAt,
  };
}

/**
 * Release a phone number
 */
async function releaseNumber(id: string): Promise<void> {
  const dbPhoneNumber = await prisma.phoneNumber.findUnique({
    where: { id },
  });
  
  if (!dbPhoneNumber) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Phone number not found');
  }
  
  // TODO: Integrate with provider API to release number
  logger.info(
    { phoneNumberId: id, providerNumberId: dbPhoneNumber.providerNumberId },
    'Releasing phone number'
  );
  
  await prisma.phoneNumber.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
}

/**
 * Assign or unassign an assistant to a phone number
 */
async function assignAssistant(phoneNumberId: string, assistantId: string | null): Promise<PhoneNumber> {
  const dbPhoneNumber = await prisma.phoneNumber.findUnique({
    where: { id: phoneNumberId },
  });
  
  if (!dbPhoneNumber) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Phone number not found');
  }
  
  const updated = await prisma.phoneNumber.update({
    where: { id: phoneNumberId },
    data: {
      agentId: assistantId,
    },
  });
  
  logger.info(
    { phoneNumberId, assistantId },
    assistantId ? 'Assistant assigned to phone number' : 'Assistant unassigned from phone number'
  );
  
  return {
    id: updated.id,
    workspaceId: updated.workspaceId,
    phoneNumber: updated.phoneNumber,
    provider: updated.provider as any,
    providerNumberId: updated.providerNumberId,
    assistantId: updated.agentId || undefined,
    isActive: updated.isActive,
    capabilities: updated.capabilities as PhoneNumberCapabilities,
    monthlyCost: updated.monthlyCost,
    purchasedAt: updated.createdAt,
    releasedAt: undefined,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

// ============================================================================
// Validation Schemas
// ============================================================================

const searchNumbersSchema = z.object({
  country: z.string().default('US'),
  areaCode: z.string().length(3).optional(),
  capabilities: z.array(z.enum(['voice', 'sms', 'mms', 'fax'])).optional(),
});

const purchaseNumberSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  provider: z.enum(['twilio', 'vonage', 'plivo', 'telnyx']).default('twilio'),
});

const assignAssistantSchema = z.object({
  assistantId: z.string().nullable(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /phone-numbers/available
 * Search for available phone numbers to purchase
 */
router.get(
  '/available',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const query = searchNumbersSchema.parse(req.query);
    
    const availableNumbers = await getAvailableNumbers(
      query.country,
      query.areaCode,
      query.capabilities
    );
    
    res.status(200).json({
      success: true,
      data: availableNumbers,
    });
  })
);

/**
 * POST /phone-numbers
 * Purchase a phone number
 */
router.post(
  '/',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const input = purchaseNumberSchema.parse(req.body);
    
    // Check if workspace has sufficient credits
    const hasCredits = await hasSufficientCredits(
      req.workspaceId!,
      PHONE_NUMBER_MONTHLY_COST
    );
    
    if (!hasCredits) {
      res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient wallet balance to purchase phone number. Please add credits.',
        },
      });
      return;
    }
    
    const phoneNumber = await purchaseNumber(
      req.workspaceId!,
      input.phoneNumber,
      input.provider
    );
    
    // Deduct credits for the first month
    try {
      await deductCredits(
        req.workspaceId!,
        PHONE_NUMBER_MONTHLY_COST,
        phoneNumber.id,
        `Phone number purchase: ${phoneNumber.phoneNumber}`
      );
    } catch (error) {
      // If deduction fails, we should release the number
      logger.error(
        { phoneNumberId: phoneNumber.id, error: (error as Error).message },
        'Failed to deduct credits for phone number purchase'
      );
      
      await releaseNumber(phoneNumber.id);
      
      throw new ApiError(
        402,
        ErrorCode.INSUFFICIENT_CREDITS,
        'Failed to process payment for phone number'
      );
    }
    
    res.status(201).json({
      success: true,
      data: phoneNumber,
    });
  })
);

/**
 * GET /phone-numbers
 * List all phone numbers for the workspace
 */
router.get(
  '/',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const numbers = await getPhoneNumbersByWorkspace(req.workspaceId!);
    
    res.status(200).json({
      success: true,
      data: numbers,
    });
  })
);

/**
 * GET /phone-numbers/:phoneNumberId
 * Get phone number details
 */
router.get(
  '/:phoneNumberId',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const phoneNumber = await getPhoneNumberById(req.params.phoneNumberId);
    
    if (!phoneNumber || phoneNumber.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Phone number not found' },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: phoneNumber,
    });
  })
);

/**
 * DELETE /phone-numbers/:phoneNumberId
 * Release a phone number
 */
router.delete(
  '/:phoneNumberId',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const phoneNumber = await getPhoneNumberById(req.params.phoneNumberId);
    
    if (!phoneNumber || phoneNumber.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Phone number not found' },
      });
      return;
    }
    
    await releaseNumber(req.params.phoneNumberId);
    
    res.status(200).json({
      success: true,
      data: { message: 'Phone number released successfully' },
    });
  })
);

/**
 * PATCH /phone-numbers/:phoneNumberId/assistant
 * Assign or unassign an assistant to a phone number
 */
router.patch(
  '/:phoneNumberId/assistant',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const phoneNumber = await getPhoneNumberById(req.params.phoneNumberId);
    
    if (!phoneNumber || phoneNumber.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Phone number not found' },
      });
      return;
    }
    
    const input = assignAssistantSchema.parse(req.body);
    const updated = await assignAssistant(req.params.phoneNumberId, input.assistantId);
    
    res.status(200).json({
      success: true,
      data: updated,
    });
  })
);

/**
 * PATCH /phone-numbers/:phoneNumberId/settings
 * Update phone number settings
 */
router.patch(
  '/:phoneNumberId/settings',
  authenticateJwt,
  workspaceMiddleware,
  requireWorkspaceAdmin,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const phoneNumber = await getPhoneNumberById(req.params.phoneNumberId);
    
    if (!phoneNumber || phoneNumber.workspaceId !== req.workspaceId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Phone number not found' },
      });
      return;
    }
    
    const settings = z.object({
      webhookUrl: z.string().url().optional(),
      fallbackUrl: z.string().url().optional(),
      recordCalls: z.boolean().optional(),
    }).parse(req.body);
    
    // Store settings in metadata
    await prisma.phoneNumber.update({
      where: { id: req.params.phoneNumberId },
      data: {
        metadata: {
          ...((await prisma.phoneNumber.findUnique({
            where: { id: req.params.phoneNumberId },
            select: { metadata: true },
          }))?.metadata as object || {}),
          ...settings,
        },
      },
    });
    
    res.status(200).json({
      success: true,
      data: { message: 'Settings updated successfully' },
    });
  })
);

/**
 * GET /phone-numbers/providers
 * List available telephony providers
 */
router.get(
  '/providers',
  authenticateJwt,
  asyncHandler(async (_req, res: Response) => {
    const providers = [
      {
        id: 'twilio',
        name: 'Twilio',
        description: 'Leading cloud communications platform',
        supportedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR'],
        capabilities: ['voice', 'sms', 'mms'],
        pricing: {
          phoneNumberMonthly: 1.00,
          inboundVoicePerMinute: 0.0085,
          outboundVoicePerMinute: 0.013,
        },
      },
      {
        id: 'vonage',
        name: 'Vonage',
        description: 'Global communications API platform',
        supportedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'SG'],
        capabilities: ['voice', 'sms', 'mms'],
        pricing: {
          phoneNumberMonthly: 0.98,
          inboundVoicePerMinute: 0.0075,
          outboundVoicePerMinute: 0.012,
        },
      },
      {
        id: 'plivo',
        name: 'Plivo',
        description: 'Cloud communications platform',
        supportedCountries: ['US', 'CA', 'GB', 'AU'],
        capabilities: ['voice', 'sms'],
        pricing: {
          phoneNumberMonthly: 0.80,
          inboundVoicePerMinute: 0.0065,
          outboundVoicePerMinute: 0.010,
        },
      },
    ];
    
    res.status(200).json({
      success: true,
      data: providers,
    });
  })
);

export default router;
