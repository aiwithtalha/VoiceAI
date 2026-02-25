/**
 * Webhook Service
 * 
 * Handles webhook delivery with:
 * - Retry logic with exponential backoff
 * - HMAC-SHA256 payload signing
 * - Delivery attempt logging
 * - Circuit breaker pattern for failing endpoints
 * 
 * @module services/webhook-service
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { prisma } from '../lib/prisma';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Webhook configuration stored in database
 */
export interface WebhookConfig {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  retryConfig?: RetryConfiguration;
  headers?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supported webhook events
 */
export type WebhookEvent =
  | 'call.started'
  | 'call.ended'
  | 'call.transferred'
  | 'appointment.booked'
  | 'appointment.cancelled'
  | 'sms.sent'
  | 'sms.delivered'
  | 'tool.executed'
  | 'recording.completed'
  | 'transcription.completed'
  | 'all'; // Subscribe to all events

/**
 * Webhook delivery attempt record
 */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed';
  httpStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  attemptCount: number;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Retry configuration for a webhook
 */
export interface RetryConfiguration {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

/**
 * Result of a webhook delivery attempt
 */
export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  duration: number;
  willRetry?: boolean;
  nextRetryAt?: Date;
}

/**
 * Circuit breaker state for webhook endpoints
 */
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttempt: number;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfiguration = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 300000, // 5 minutes
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// Circuit breaker settings
const CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before opening
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute before half-open
const CIRCUIT_BREAKER_RESET_TIMEOUT = 300000; // 5 minutes before reset

// In-memory circuit breaker state
const circuitBreakers = new Map<string, CircuitBreakerState>();

// ============================================================================
// Main Delivery Function
// ============================================================================

/**
 * Send a webhook event to all subscribed webhooks
 * 
 * @param workspaceId - Workspace to send webhooks for
 * @param event - Event type being sent
 * @param payload - Event payload data
 * @returns Array of delivery results
 */
export async function sendWebhook(
  workspaceId: string,
  event: WebhookEvent,
  payload: Record<string, any>
): Promise<DeliveryResult[]> {
  // Find all active webhooks subscribed to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      workspaceId,
      isActive: true,
      OR: [
        { events: { has: event } },
        { events: { has: 'all' } },
      ],
    },
  });

  if (webhooks.length === 0) {
    logger.debug({ workspaceId, event }, 'No webhooks configured for event');
    return [];
  }

  logger.info({
    workspaceId,
    event,
    webhookCount: webhooks.length,
  }, 'Sending webhooks');

  // Send to all webhooks in parallel
  const results = await Promise.all(
    webhooks.map(webhook =>
      deliverToWebhook(webhook as WebhookConfig, event, payload)
    )
  );

  // Record metrics
  const successCount = results.filter(r => r.success).length;
  metrics.increment('webhook.sent', {
    workspace: workspaceId,
    event,
  });
  metrics.gauge('webhook.success_rate', successCount / results.length, {
    workspace: workspaceId,
    event,
  });

  return results;
}

/**
 * Deliver webhook to a specific endpoint
 * 
 * @param webhook - Webhook configuration
 * @param event - Event type
 * @param payload - Event payload
 * @returns Delivery result
 */
async function deliverToWebhook(
  webhook: WebhookConfig,
  event: WebhookEvent,
  payload: Record<string, any>
): Promise<DeliveryResult> {
  const startTime = Date.now();

  // Check circuit breaker
  if (isCircuitOpen(webhook.url)) {
    logger.warn({ webhookId: webhook.id, url: webhook.url }, 'Circuit breaker open, skipping webhook');
    return {
      success: false,
      error: 'Circuit breaker open - endpoint temporarily disabled',
      duration: 0,
      willRetry: true,
      nextRetryAt: new Date(Date.now() + CIRCUIT_BREAKER_TIMEOUT),
    };
  }

  // Create delivery record
  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event,
      payload,
      status: 'pending',
      attemptCount: 0,
    },
  });

  try {
    // Prepare and sign payload
    const timestamp = Math.floor(Date.now() / 1000);
    const fullPayload = {
      event,
      timestamp,
      webhookId: webhook.id,
      data: payload,
    };

    const signature = signPayload(fullPayload, webhook.secret);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-ID': webhook.id,
      'X-Webhook-Event': event,
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Signature': signature,
      'User-Agent': 'VoiceAI-Webhook/1.0',
      ...webhook.headers,
    };

    // Send request
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(fullPayload),
    });

    const duration = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');

    // Update circuit breaker
    if (response.ok) {
      recordSuccess(webhook.url);
    } else {
      recordFailure(webhook.url);
    }

    // Determine if we should retry
    const retryConfig = webhook.retryConfig || DEFAULT_RETRY_CONFIG;
    const shouldRetry = !response.ok && 
      retryConfig.retryableStatusCodes.includes(response.status) &&
      delivery.attemptCount < retryConfig.maxRetries;

    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: response.ok ? 'delivered' : shouldRetry ? 'pending' : 'failed',
        httpStatus: response.status,
        responseBody: responseBody.slice(0, 10000), // Limit stored response size
        attemptCount: { increment: 1 },
        deliveredAt: response.ok ? new Date() : undefined,
        nextRetryAt: shouldRetry ? calculateNextRetry(delivery.attemptCount + 1, retryConfig) : undefined,
        updatedAt: new Date(),
      },
    });

    // Schedule retry if needed
    if (shouldRetry) {
      scheduleRetry(delivery.id, retryConfig);
    }

    // Record metrics
    metrics.timing('webhook.delivery.duration', duration, {
      webhook: webhook.id,
      event,
      status: String(response.status),
    });

    if (response.ok) {
      metrics.increment('webhook.delivery.success', {
        webhook: webhook.id,
        event,
      });
    } else {
      metrics.increment('webhook.delivery.failure', {
        webhook: webhook.id,
        event,
        status: String(response.status),
      });
    }

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody,
      duration,
      willRetry: shouldRetry,
      nextRetryAt: shouldRetry ? calculateNextRetry(delivery.attemptCount + 1, retryConfig) : undefined,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    recordFailure(webhook.url);

    // Determine if we should retry
    const retryConfig = webhook.retryConfig || DEFAULT_RETRY_CONFIG;
    const shouldRetry = delivery.attemptCount < retryConfig.maxRetries;

    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: shouldRetry ? 'pending' : 'failed',
        errorMessage: errorMessage.slice(0, 1000),
        attemptCount: { increment: 1 },
        nextRetryAt: shouldRetry ? calculateNextRetry(delivery.attemptCount + 1, retryConfig) : undefined,
        updatedAt: new Date(),
      },
    });

    // Schedule retry if needed
    if (shouldRetry) {
      scheduleRetry(delivery.id, retryConfig);
    }

    logger.error({
      webhookId: webhook.id,
      event,
      error: errorMessage,
    }, 'Webhook delivery failed');

    metrics.increment('webhook.delivery.error', {
      webhook: webhook.id,
      event,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
      duration,
      willRetry: shouldRetry,
      nextRetryAt: shouldRetry ? calculateNextRetry(delivery.attemptCount + 1, retryConfig) : undefined,
    };
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate next retry time using exponential backoff
 */
function calculateNextRetry(
  attemptNumber: number,
  config: RetryConfiguration
): Date {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attemptNumber - 1),
    config.maxDelayMs
  );
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return new Date(Date.now() + delay + jitter);
}

/**
 * Schedule a retry for a failed delivery
 */
function scheduleRetry(deliveryId: string, config: RetryConfiguration): void {
  // In production, this would use a job queue (Bull, Agenda, etc.)
  // For now, we'll just log it
  logger.info({ deliveryId }, 'Retry scheduled for webhook delivery');
}

/**
 * Process pending webhook retries
 * This would be called by a scheduled job
 */
export async function processRetries(): Promise<void> {
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: 'pending',
      nextRetryAt: { lte: new Date() },
    },
    include: {
      webhook: true,
    },
    take: 100, // Process in batches
  });

  logger.info({ count: pendingDeliveries.length }, 'Processing webhook retries');

  for (const delivery of pendingDeliveries) {
    if (!delivery.webhook.isActive) {
      // Skip if webhook is disabled
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          errorMessage: 'Webhook is disabled',
          updatedAt: new Date(),
        },
      });
      continue;
    }

    // Retry delivery
    await deliverToWebhook(
      delivery.webhook as WebhookConfig,
      delivery.event as WebhookEvent,
      delivery.payload as Record<string, any>
    );
  }
}

// ============================================================================
// Payload Signing
// ============================================================================

/**
 * Sign webhook payload with HMAC-SHA256
 * 
 * @param payload - Payload to sign
 * @param secret - Webhook secret
 * @returns Hex-encoded signature
 */
export function signPayload(payload: Record<string, any>, secret: string): string {
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}

/**
 * Verify webhook signature
 * 
 * @param payload - Received payload
 * @param signature - Received signature
 * @param secret - Webhook secret
 * @returns Whether signature is valid
 */
export function verifySignature(
  payload: Record<string, any>,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signPayload(payload, secret);
  
  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

// ============================================================================
// Circuit Breaker
// ============================================================================

/**
 * Check if circuit breaker is open for an endpoint
 */
function isCircuitOpen(url: string): boolean {
  const state = circuitBreakers.get(url);
  
  if (!state) {
    return false;
  }

  if (state.state === 'open') {
    // Check if we should transition to half-open
    if (Date.now() > state.nextAttempt) {
      state.state = 'half-open';
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Record a successful request
 */
function recordSuccess(url: string): void {
  const state = circuitBreakers.get(url);
  
  if (state) {
    if (state.state === 'half-open') {
      // Success in half-open state, close the circuit
      circuitBreakers.delete(url);
      logger.info({ url }, 'Circuit breaker closed after successful request');
    } else {
      // Reset failure count
      state.failures = 0;
    }
  }
}

/**
 * Record a failed request
 */
function recordFailure(url: string): void {
  let state = circuitBreakers.get(url);
  
  if (!state) {
    state = {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      nextAttempt: 0,
    };
    circuitBreakers.set(url, state);
  }

  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.state = 'open';
    state.nextAttempt = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
    logger.warn({ url, failures: state.failures }, 'Circuit breaker opened');
  }
}

// ============================================================================
// Delivery History
// ============================================================================

/**
 * Get delivery history for a webhook
 * 
 * @param webhookId - Webhook ID
 * @param limit - Maximum number of records
 * @returns Delivery history
 */
export async function getDeliveryHistory(
  webhookId: string,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return deliveries.map(d => ({
    id: d.id,
    webhookId: d.webhookId,
    event: d.event as WebhookEvent,
    payload: d.payload as Record<string, any>,
    status: d.status as 'pending' | 'delivered' | 'failed',
    httpStatus: d.httpStatus || undefined,
    responseBody: d.responseBody || undefined,
    errorMessage: d.errorMessage || undefined,
    attemptCount: d.attemptCount,
    nextRetryAt: d.nextRetryAt || undefined,
    deliveredAt: d.deliveredAt || undefined,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
}

/**
 * Get delivery statistics for a webhook
 * 
 * @param webhookId - Webhook ID
 * @returns Delivery statistics
 */
export async function getDeliveryStats(webhookId: string): Promise<{
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  successRate: number;
  averageLatency: number;
}> {
  const stats = await prisma.webhookDelivery.groupBy({
    by: ['status'],
    where: { webhookId },
    _count: { status: true },
  });

  const total = stats.reduce((sum, s) => sum + s._count.status, 0);
  const delivered = stats.find(s => s.status === 'delivered')?._count.status || 0;
  const failed = stats.find(s => s.status === 'failed')?._count.status || 0;
  const pending = stats.find(s => s.status === 'pending')?._count.status || 0;

  // Get average latency for delivered webhooks
  const deliveredRecords = await prisma.webhookDelivery.findMany({
    where: {
      webhookId,
      status: 'delivered',
      deliveredAt: { not: null },
    },
    select: {
      createdAt: true,
      deliveredAt: true,
    },
    take: 100,
  });

  const averageLatency = deliveredRecords.length > 0
    ? deliveredRecords.reduce((sum, r) => {
        const latency = (r.deliveredAt!.getTime() - r.createdAt.getTime());
        return sum + latency;
      }, 0) / deliveredRecords.length
    : 0;

  return {
    total,
    delivered,
    failed,
    pending,
    successRate: total > 0 ? (delivered / total) * 100 : 0,
    averageLatency: Math.round(averageLatency),
  };
}

// ============================================================================
// Webhook Management
// ============================================================================

/**
 * Create a new webhook
 * 
 * @param data - Webhook configuration
 * @returns Created webhook
 */
export async function createWebhook(
  data: Omit<WebhookConfig, 'id' | 'secret' | 'createdAt' | 'updatedAt'>
): Promise<WebhookConfig> {
  // Generate a secure secret
  const secret = crypto.randomBytes(32).toString('hex');

  const webhook = await prisma.webhook.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      url: data.url,
      secret,
      events: data.events,
      isActive: data.isActive,
      retryConfig: data.retryConfig || DEFAULT_RETRY_CONFIG,
      headers: data.headers || {},
    },
  });

  logger.info({
    webhookId: webhook.id,
    workspaceId: data.workspaceId,
    events: data.events,
  }, 'Webhook created');

  metrics.increment('webhook.created', {
    workspace: data.workspaceId,
  });

  return webhook as WebhookConfig;
}

/**
 * Update an existing webhook
 * 
 * @param webhookId - Webhook ID
 * @param data - Updated configuration
 * @returns Updated webhook
 */
export async function updateWebhook(
  webhookId: string,
  data: Partial<Pick<WebhookConfig, 'name' | 'url' | 'events' | 'isActive' | 'retryConfig' | 'headers'>>
): Promise<WebhookConfig> {
  const webhook = await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  logger.info({ webhookId }, 'Webhook updated');

  return webhook as WebhookConfig;
}

/**
 * Delete a webhook
 * 
 * @param webhookId - Webhook ID
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  // Delete associated delivery records first
  await prisma.webhookDelivery.deleteMany({
    where: { webhookId },
  });

  await prisma.webhook.delete({
    where: { id: webhookId },
  });

  logger.info({ webhookId }, 'Webhook deleted');
  metrics.increment('webhook.deleted');
}

/**
 * Regenerate webhook secret
 * 
 * @param webhookId - Webhook ID
 * @returns New secret
 */
export async function regenerateSecret(webhookId: string): Promise<string> {
  const newSecret = crypto.randomBytes(32).toString('hex');

  await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      secret: newSecret,
      updatedAt: new Date(),
    },
  });

  logger.info({ webhookId }, 'Webhook secret regenerated');

  return newSecret;
}

/**
 * Test a webhook by sending a test event
 * 
 * @param webhookId - Webhook ID
 * @returns Delivery result
 */
export async function testWebhook(webhookId: string): Promise<DeliveryResult> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const testPayload = {
    message: 'This is a test webhook event',
    timestamp: new Date().toISOString(),
    test: true,
  };

  return deliverToWebhook(
    webhook as WebhookConfig,
    'call.started',
    testPayload
  );
}

export default {
  sendWebhook,
  processRetries,
  signPayload,
  verifySignature,
  getDeliveryHistory,
  getDeliveryStats,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  regenerateSecret,
  testWebhook,
};
