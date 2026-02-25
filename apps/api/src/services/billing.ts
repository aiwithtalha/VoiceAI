/**
 * Universal Voice AI Platform - Billing Service
 * 
 * Handles wallet management, Stripe integration, transaction processing,
 * and credit deduction for calls.
 */

import Stripe from 'stripe';
import { config } from '../config';
import logger from '../utils/logger';
import { ApiError, ErrorCode, TransactionType, Transaction, Wallet, Invoice } from '../types';

// ============================================================================
// Stripe Client Initialization
// ============================================================================

let stripe: Stripe | null = null;

if (config.stripe.secretKey) {
  stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2023-10-16',
  });
} else {
  logger.warn('Stripe not configured - billing features will be disabled');
}

// ============================================================================
// Mock Database Functions
// ============================================================================

const wallets: Map<string, Wallet> = new Map();
const transactions: Map<string, Transaction> = new Map();
const invoices: Map<string, Invoice> = new Map();

async function getWalletByWorkspaceId(workspaceId: string): Promise<Wallet | null> {
  // TODO: Replace with Prisma query
  // return prisma.wallet.findUnique({ where: { workspaceId } });
  
  for (const wallet of wallets.values()) {
    if (wallet.workspaceId === workspaceId) {
      return wallet;
    }
  }
  return null;
}

async function createWallet(workspaceId: string): Promise<Wallet> {
  const wallet: Wallet = {
    id: `wal_${Date.now()}`,
    workspaceId,
    balance: 0,
    currency: 'usd',
    autoRecharge: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  wallets.set(wallet.id, wallet);
  return wallet;
}

async function updateWallet(workspaceId: string, data: Partial<Wallet>): Promise<Wallet> {
  const wallet = await getWalletByWorkspaceId(workspaceId);
  if (!wallet) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Wallet not found');
  }
  
  const updated = { ...wallet, ...data, updatedAt: new Date() };
  wallets.set(wallet.id, updated);
  return updated;
}

async function createTransaction(data: Partial<Transaction>): Promise<Transaction> {
  const transaction: Transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    workspaceId: data.workspaceId!,
    type: data.type!,
    amount: data.amount!,
    balance: data.balance!,
    description: data.description!,
    metadata: data.metadata || {},
    createdAt: new Date(),
  };
  transactions.set(transaction.id, transaction);
  return transaction;
}

async function getTransactionsByWorkspaceId(
  workspaceId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<Transaction[]> {
  const result: Transaction[] = [];
  
  for (const txn of transactions.values()) {
    if (txn.workspaceId === workspaceId) {
      result.push(txn);
    }
  }
  
  // Sort by createdAt desc
  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  const { limit = 50, offset = 0 } = options;
  return result.slice(offset, offset + limit);
}

async function getInvoicesByWorkspaceId(workspaceId: string): Promise<Invoice[]> {
  const result: Invoice[] = [];
  
  for (const inv of invoices.values()) {
    if (inv.workspaceId === workspaceId) {
      result.push(inv);
    }
  }
  
  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return result;
}

// ============================================================================
// Wallet Management
// ============================================================================

/**
 * Get or create wallet for a workspace
 */
export async function getWallet(workspaceId: string): Promise<Wallet> {
  let wallet = await getWalletByWorkspaceId(workspaceId);
  
  if (!wallet) {
    wallet = await createWallet(workspaceId);
    logger.info({ workspaceId, walletId: wallet.id }, 'Created new wallet');
  }
  
  return wallet;
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(workspaceId: string): Promise<number> {
  const wallet = await getWallet(workspaceId);
  return wallet.balance;
}

/**
 * Check if workspace has sufficient credits
 */
export async function hasSufficientCredits(
  workspaceId: string,
  requiredAmount: number
): Promise<boolean> {
  const balance = await getWalletBalance(workspaceId);
  return balance >= requiredAmount;
}

// ============================================================================
// Credit Management
// ============================================================================

/**
 * Add credits to wallet (after successful payment)
 */
export async function addCredits(
  workspaceId: string,
  amount: number,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<Wallet> {
  if (amount <= 0) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Amount must be positive');
  }
  
  const wallet = await getWallet(workspaceId);
  const newBalance = wallet.balance + amount;
  
  // Update wallet
  const updated = await updateWallet(workspaceId, { balance: newBalance });
  
  // Create transaction record
  await createTransaction({
    workspaceId,
    type: TransactionType.CREDIT,
    amount,
    balance: newBalance,
    description,
    metadata,
  });
  
  logger.info(
    { workspaceId, amount, newBalance },
    'Credits added to wallet'
  );
  
  return updated;
}

/**
 * Deduct credits from wallet (for call costs)
 * This is called every 30 seconds during active calls
 */
export async function deductCredits(
  workspaceId: string,
  amount: number,
  callId: string,
  description?: string
): Promise<Wallet> {
  if (amount <= 0) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Amount must be positive');
  }
  
  const wallet = await getWallet(workspaceId);
  
  if (wallet.balance < amount) {
    logger.warn(
      { workspaceId, balance: wallet.balance, required: amount, callId },
      'Insufficient credits for call'
    );
    throw new ApiError(402, ErrorCode.INSUFFICIENT_CREDITS, 'Insufficient wallet balance');
  }
  
  const newBalance = wallet.balance - amount;
  
  // Update wallet
  const updated = await updateWallet(workspaceId, { balance: newBalance });
  
  // Create transaction record
  await createTransaction({
    workspaceId,
    type: TransactionType.DEBIT,
    amount: -amount,
    balance: newBalance,
    description: description || `Call cost for ${callId}`,
    metadata: { callId },
  });
  
  logger.debug(
    { workspaceId, amount, newBalance, callId },
    'Credits deducted from wallet'
  );
  
  // Check if balance is low
  if (newBalance < config.call.minimumWalletBalanceCents) {
    logger.warn(
      { workspaceId, balance: newBalance },
      'Wallet balance is low'
    );
    // TODO: Trigger low balance notification
  }
  
  return updated;
}

/**
 * Refund credits to wallet
 */
export async function refundCredits(
  workspaceId: string,
  amount: number,
  callId: string,
  reason: string
): Promise<Wallet> {
  if (amount <= 0) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Amount must be positive');
  }
  
  const wallet = await getWallet(workspaceId);
  const newBalance = wallet.balance + amount;
  
  // Update wallet
  const updated = await updateWallet(workspaceId, { balance: newBalance });
  
  // Create transaction record
  await createTransaction({
    workspaceId,
    type: TransactionType.REFUND,
    amount,
    balance: newBalance,
    description: `Refund for call ${callId}: ${reason}`,
    metadata: { callId, reason },
  });
  
  logger.info(
    { workspaceId, amount, newBalance, callId, reason },
    'Credits refunded to wallet'
  );
  
  return updated;
}

/**
 * Add bonus credits (promotions, referrals, etc.)
 */
export async function addBonusCredits(
  workspaceId: string,
  amount: number,
  reason: string
): Promise<Wallet> {
  if (amount <= 0) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Amount must be positive');
  }
  
  const wallet = await getWallet(workspaceId);
  const newBalance = wallet.balance + amount;
  
  // Update wallet
  const updated = await updateWallet(workspaceId, { balance: newBalance });
  
  // Create transaction record
  await createTransaction({
    workspaceId,
    type: TransactionType.BONUS,
    amount,
    balance: newBalance,
    description: `Bonus credits: ${reason}`,
    metadata: { reason },
  });
  
  logger.info(
    { workspaceId, amount, newBalance, reason },
    'Bonus credits added to wallet'
  );
  
  return updated;
}

// ============================================================================
// Stripe Integration
// ============================================================================

interface CreateCheckoutSessionInput {
  workspaceId: string;
  amount: number; // in cents
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe checkout session for wallet top-up
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<{ sessionId: string; url: string }> {
  if (!stripe) {
    throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Stripe is not configured');
  }
  
  // Validate minimum amount ($5)
  if (input.amount < 500) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Minimum top-up amount is $5.00');
  }
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Voice AI Platform Credits',
              description: `Add $${(input.amount / 100).toFixed(2)} to your wallet`,
            },
            unit_amount: input.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        workspaceId: input.workspaceId,
        type: 'wallet_topup',
      },
    });
    
    logger.info(
      { workspaceId: input.workspaceId, sessionId: session.id, amount: input.amount },
      'Created Stripe checkout session'
    );
    
    return {
      sessionId: session.id,
      url: session.url!,
    };
  } catch (error) {
    logger.error(
      { error: (error as Error).message, workspaceId: input.workspaceId },
      'Failed to create Stripe checkout session'
    );
    throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Failed to create checkout session');
  }
}

/**
 * Alias for createCheckoutSession - creates a Stripe checkout session for wallet top-up
 * 
 * This is a convenience wrapper around createCheckoutSession with a more descriptive name
 * for the common use case of topping up wallet credits.
 */
export async function createTopUpSession(
  workspaceId: string,
  amount: number,
  successUrl?: string,
  cancelUrl?: string
): Promise<{ sessionId: string; url: string }> {
  const frontendUrl = config.server.frontendUrl;
  
  return createCheckoutSession({
    workspaceId,
    amount,
    successUrl: successUrl || `${frontendUrl}/billing/success`,
    cancelUrl: cancelUrl || `${frontendUrl}/billing/cancel`,
  });
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(payload: string, signature: string): Promise<void> {
  if (!stripe) {
    throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Stripe is not configured');
  }
  
  if (!config.stripe.webhookSecret) {
    throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Stripe webhook secret not configured');
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message },
      'Stripe webhook signature verification failed'
    );
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid webhook signature');
  }
  
  logger.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook');
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.type === 'wallet_topup') {
        const workspaceId = session.metadata.workspaceId;
        const amount = session.amount_total || 0;
        
        await addCredits(
          workspaceId,
          amount,
          'Wallet top-up via Stripe',
          {
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
          }
        );
        
        logger.info(
          { workspaceId, amount, sessionId: session.id },
          'Wallet topped up via Stripe'
        );
      }
      break;
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logger.warn(
        { paymentIntentId: paymentIntent.id, workspaceId: paymentIntent.metadata?.workspaceId },
        'Stripe payment failed'
      );
      break;
    }
    
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      logger.info(
        { chargeId: charge.id, amount: charge.amount_refunded },
        'Stripe charge refunded'
      );
      // Handle refund if needed
      break;
    }
    
    default:
      logger.debug({ eventType: event.type }, 'Unhandled Stripe webhook event');
  }
}

// ============================================================================
// Transaction & Invoice Queries
// ============================================================================

/**
 * Get transaction history for a workspace
 */
export async function getTransactions(
  workspaceId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<Transaction[]> {
  return getTransactionsByWorkspaceId(workspaceId, options);
}

/**
 * Get invoices for a workspace
 */
export async function getInvoices(workspaceId: string): Promise<Invoice[]> {
  return getInvoicesByWorkspaceId(workspaceId);
}

// ============================================================================
// Auto-Recharge Settings
// ============================================================================

interface AutoRechargeSettings {
  enabled: boolean;
  threshold: number; // in cents
  amount: number; // in cents
}

/**
 * Update auto-recharge settings
 */
export async function updateAutoRechargeSettings(
  workspaceId: string,
  settings: AutoRechargeSettings
): Promise<Wallet> {
  if (settings.enabled) {
    if (settings.threshold <= 0) {
      throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Threshold must be positive');
    }
    if (settings.amount < 500) {
      throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Minimum recharge amount is $5.00');
    }
  }
  
  const wallet = await updateWallet(workspaceId, {
    autoRecharge: settings.enabled,
    autoRechargeThreshold: settings.threshold,
    autoRechargeAmount: settings.amount,
  });
  
  logger.info(
    { workspaceId, settings },
    'Auto-recharge settings updated'
  );
  
  return wallet;
}

/**
 * Check and trigger auto-recharge if needed
 * This should be called periodically (e.g., every minute)
 */
export async function checkAutoRecharge(workspaceId: string): Promise<void> {
  const wallet = await getWallet(workspaceId);
  
  if (!wallet.autoRecharge || !wallet.autoRechargeThreshold || !wallet.autoRechargeAmount) {
    return;
  }
  
  if (wallet.balance <= wallet.autoRechargeThreshold) {
    logger.info(
      { workspaceId, balance: wallet.balance, threshold: wallet.autoRechargeThreshold },
      'Triggering auto-recharge'
    );
    
    // TODO: Trigger automatic payment
    // This would typically create a Stripe payment intent and charge the saved card
    // For now, we'll just log it
  }
}

// ============================================================================
// Pricing
// ============================================================================

interface PricingRates {
  telephony: Record<string, number>; // provider -> cents per minute
  stt: Record<string, number>; // provider -> cents per minute
  tts: Record<string, number>; // provider -> cents per minute
  llm: Record<string, number>; // model -> cents per 1K tokens
  phoneNumber: number; // monthly cost in cents
}

/**
 * Get current pricing rates
 */
export function getPricingRates(): PricingRates {
  // These rates would typically come from a database or configuration
  return {
    telephony: {
      twilio: 2, // $0.02 per minute
      vonage: 2,
      plivo: 1.5,
    },
    stt: {
      deepgram: 1, // $0.01 per minute
      assemblyai: 1.5,
      google: 2,
    },
    tts: {
      elevenlabs: 3, // $0.03 per minute
      openai: 1.5,
      google: 2,
    },
    llm: {
      'gpt-4': 3, // $0.03 per 1K tokens
      'gpt-3.5-turbo': 0.5,
      'claude-3-opus': 15,
    },
    phoneNumber: 100, // $1.00 per month
  };
}

/**
 * Calculate estimated call cost
 */
export function estimateCallCost(
  durationMinutes: number,
  providers: {
    telephony: string;
    stt: string;
    tts: string;
    llm: string;
  }
): number {
  const rates = getPricingRates();
  
  const telephonyCost = (rates.telephony[providers.telephony] || 2) * durationMinutes;
  const sttCost = (rates.stt[providers.stt] || 1) * durationMinutes;
  const ttsCost = (rates.tts[providers.tts] || 3) * durationMinutes;
  // Assume average 500 tokens per minute of conversation
  const llmCost = ((rates.llm[providers.llm] || 3) * durationMinutes * 0.5) / 1000;
  
  return Math.ceil(telephonyCost + sttCost + ttsCost + llmCost);
}
