/**
 * Universal Voice AI Platform - Billing Routes
 * 
 * Express routes for wallet management, Stripe checkout, and billing history.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../middleware/auth';
import { workspaceMiddleware } from '../middleware/workspace';
import { billingRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';
import { WorkspaceContextRequest } from '../types';
import {
  getWallet,
  getWalletBalance,
  createCheckoutSession,
  handleStripeWebhook,
  getTransactions,
  getInvoices,
  updateAutoRechargeSettings,
  getPricingRates,
  estimateCallCost,
} from '../services/billing';
import { config } from '../config';
import logger from '../utils/logger';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const topupSchema = z.object({
  amount: z.number().min(500, 'Minimum top-up amount is $5.00').max(100000, 'Maximum top-up amount is $1,000'),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
});

const autoRechargeSchema = z.object({
  enabled: z.boolean(),
  threshold: z.number().min(0).optional(),
  amount: z.number().min(500).optional(),
});

const estimateCostSchema = z.object({
  durationMinutes: z.number().min(1).max(180),
  providers: z.object({
    telephony: z.string(),
    stt: z.string(),
    tts: z.string(),
    llm: z.string(),
  }),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /billing/wallet
 * Get wallet balance and details
 */
router.get(
  '/wallet',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const wallet = await getWallet(req.workspaceId!);
    
    res.status(200).json({
      success: true,
      data: wallet,
    });
  })
);

/**
 * GET /billing/balance
 * Get just the wallet balance (lightweight endpoint)
 */
router.get(
  '/balance',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const balance = await getWalletBalance(req.workspaceId!);
    
    res.status(200).json({
      success: true,
      data: { balance },
    });
  })
);

/**
 * POST /billing/topup
 * Create a Stripe checkout session for wallet top-up
 */
router.post(
  '/topup',
  authenticateJwt,
  workspaceMiddleware,
  billingRateLimiter,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const input = topupSchema.parse(req.body);
    
    const session = await createCheckoutSession({
      workspaceId: req.workspaceId!,
      amount: input.amount,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
    
    res.status(200).json({
      success: true,
      data: session,
    });
  })
);

/**
 * POST /billing/webhook
 * Stripe webhook handler
 * This endpoint receives raw body for signature verification
 */
router.post(
  '/webhook',
  // Note: Raw body parser is applied in index.ts for this route
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing Stripe signature' },
      });
      return;
    }
    
    // req.body is a Buffer (raw body) for Stripe webhooks
    const payload = req.body as Buffer | string;
    const payloadString = Buffer.isBuffer(payload) ? payload.toString() : payload;
    
    await handleStripeWebhook(payloadString, signature);
    
    res.status(200).json({ received: true });
  })
);

/**
 * GET /billing/transactions
 * Get transaction history
 */
router.get(
  '/transactions',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const transactions = await getTransactions(req.workspaceId!, { limit, offset });
    
    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        limit,
        offset,
        total: transactions.length, // In production, get actual count
      },
    });
  })
);

/**
 * GET /billing/invoices
 * Get invoice history
 */
router.get(
  '/invoices',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const invoices = await getInvoices(req.workspaceId!);
    
    res.status(200).json({
      success: true,
      data: invoices,
    });
  })
);

/**
 * GET /billing/invoices/:invoiceId/download
 * Download invoice PDF
 */
router.get(
  '/invoices/:invoiceId/download',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const { invoiceId } = req.params;
    
    // TODO: Implement invoice download
    // const invoice = await getInvoiceById(invoiceId);
    // if (!invoice || invoice.workspaceId !== req.workspaceId) {
    //   return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    // }
    // res.redirect(invoice.pdfUrl);
    
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Invoice download not yet implemented' },
    });
  })
);

/**
 * GET /billing/pricing
 * Get current pricing rates
 */
router.get(
  '/pricing',
  asyncHandler(async (_req: Request, res: Response) => {
    const rates = getPricingRates();
    
    res.status(200).json({
      success: true,
      data: rates,
    });
  })
);

/**
 * POST /billing/estimate
 * Estimate call cost
 */
router.post(
  '/estimate',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const input = estimateCostSchema.parse(req.body);
    
    const estimatedCost = estimateCallCost(input.durationMinutes, input.providers);
    
    res.status(200).json({
      success: true,
      data: {
        estimatedCost,
        durationMinutes: input.durationMinutes,
        providers: input.providers,
      },
    });
  })
);

/**
 * GET /billing/auto-recharge
 * Get auto-recharge settings
 */
router.get(
  '/auto-recharge',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const wallet = await getWallet(req.workspaceId!);
    
    res.status(200).json({
      success: true,
      data: {
        enabled: wallet.autoRecharge,
        threshold: wallet.autoRechargeThreshold,
        amount: wallet.autoRechargeAmount,
      },
    });
  })
);

/**
 * PATCH /billing/auto-recharge
 * Update auto-recharge settings
 */
router.patch(
  '/auto-recharge',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const input = autoRechargeSchema.parse(req.body);
    
    const wallet = await updateAutoRechargeSettings(req.workspaceId!, {
      enabled: input.enabled,
      threshold: input.threshold,
      amount: input.amount,
    });
    
    res.status(200).json({
      success: true,
      data: {
        enabled: wallet.autoRecharge,
        threshold: wallet.autoRechargeThreshold,
        amount: wallet.autoRechargeAmount,
      },
    });
  })
);

/**
 * GET /billing/usage
 * Get usage statistics
 */
router.get(
  '/usage',
  authenticateJwt,
  workspaceMiddleware,
  asyncHandler(async (req: WorkspaceContextRequest, res: Response) => {
    const period = req.query.period as string || '30d';
    
    // TODO: Implement usage statistics
    // This would aggregate call data, costs, etc.
    
    res.status(200).json({
      success: true,
      data: {
        period,
        // Placeholder data
        totalCalls: 0,
        totalMinutes: 0,
        totalCost: 0,
        breakdown: {
          telephony: 0,
          stt: 0,
          tts: 0,
          llm: 0,
        },
      },
    });
  })
);

export default router;
