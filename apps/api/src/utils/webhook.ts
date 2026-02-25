/**
 * Universal Voice AI Platform - Webhook Utilities
 * 
 * Webhook signature generation and verification, payload signing,
 * and webhook delivery helpers.
 */

import crypto from 'crypto';
import { config } from '../config';
import logger from './logger';
import { WebhookEvent } from '../types';

// ============================================================================
// Signature Constants
// ============================================================================

const SIGNATURE_VERSION = 'v1';
const SIGNATURE_ALGORITHM = 'sha256';

// ============================================================================
// Signature Generation
// ============================================================================

/**
 * Generate a webhook signature for a payload
 * 
 * @param payload - Webhook payload (will be JSON stringified)
 * @param secret - Webhook secret key
 * @param timestamp - Unix timestamp (defaults to current time)
 * @returns Webhook signature string
 */
export function generateWebhookSignature(
  payload: unknown,
  secret: string,
  timestamp?: number
): string {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // Create signed payload: timestamp.payload
  const signedPayload = `${ts}.${payloadString}`;
  
  // Generate HMAC signature
  const signature = crypto
    .createHmac(SIGNATURE_ALGORITHM, secret)
    .update(signedPayload)
    .digest('hex');
  
  // Return versioned signature
  return `t=${ts},${SIGNATURE_VERSION}=${signature}`;
}

/**
 * Generate webhook headers for a request
 * 
 * @param payload - Webhook payload
 * @param secret - Webhook secret key
 * @returns Headers object with signature
 */
export function generateWebhookHeaders(
  payload: unknown,
  secret: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateWebhookSignature(payload, secret, timestamp);
  
  return {
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': String(timestamp),
    'X-Webhook-Version': SIGNATURE_VERSION,
    'Content-Type': 'application/json',
    'User-Agent': 'VoiceAI-Webhook/1.0',
  };
}

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Parse a webhook signature header
 * 
 * @param signatureHeader - Signature header value
 * @returns Parsed signature components
 */
export function parseSignatureHeader(signatureHeader: string): {
  timestamp: number;
  signatures: Map<string, string>;
} {
  const signatures = new Map<string, string>();
  let timestamp = 0;
  
  const parts = signatureHeader.split(',');
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    
    if (key === 't') {
      timestamp = parseInt(value, 10);
    } else {
      signatures.set(key, value);
    }
  }
  
  return { timestamp, signatures };
}

/**
 * Verify a webhook signature
 * 
 * @param payload - Raw request body (as string)
 * @param signatureHeader - Signature header from the request
 * @param secret - Webhook secret key
 * @param toleranceSeconds - Timestamp tolerance in seconds (default: 300 = 5 minutes)
 * @returns True if signature is valid and timestamp is within tolerance
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  try {
    const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
    
    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      logger.warn(
        { timestamp, now, tolerance: toleranceSeconds },
        'Webhook timestamp outside tolerance'
      );
      return false;
    }
    
    // Get the expected signature version
    const expectedSignature = signatures.get(SIGNATURE_VERSION);
    if (!expectedSignature) {
      logger.warn('Webhook signature version not found');
      return false;
    }
    
    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const computedSignature = crypto
      .createHmac(SIGNATURE_ALGORITHM, secret)
      .update(signedPayload)
      .digest('hex');
    
    // Use timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const computedBuffer = Buffer.from(computedSignature, 'hex');
    
    if (expectedBuffer.length !== computedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Webhook signature verification failed');
    return false;
  }
}

/**
 * Verify webhook signature from Express request headers
 * 
 * @param rawBody - Raw request body
 * @param headers - Request headers
 * @param secret - Webhook secret key
 * @returns True if signature is valid
 */
export function verifyWebhookRequest(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secret: string
): boolean {
  const signatureHeader = headers['x-webhook-signature'] || headers['X-Webhook-Signature'];
  
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    logger.warn('Missing webhook signature header');
    return false;
  }
  
  return verifyWebhookSignature(rawBody, signatureHeader, secret);
}

// ============================================================================
// Webhook Secret Generation
// ============================================================================

/**
 * Generate a new webhook secret
 * 
 * @returns Random webhook secret
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a webhook endpoint ID
 * 
 * @returns Unique webhook endpoint ID
 */
export function generateWebhookEndpointId(): string {
  return `we_${crypto.randomBytes(16).toString('hex')}`;
}

// ============================================================================
// Webhook Payload Construction
// ============================================================================

/**
 * Standard webhook payload structure
 */
export interface WebhookPayload<T = unknown> {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: T;
}

/**
 * Create a standardized webhook payload
 * 
 * @param event - Webhook event type
 * @param data - Event data
 * @returns Webhook payload object
 */
export function createWebhookPayload<T>(event: WebhookEvent, data: T): WebhookPayload<T> {
  return {
    id: generateWebhookId(),
    event,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Generate a unique webhook event ID
 */
export function generateWebhookId(): string {
  return `evt_${crypto.randomBytes(16).toString('hex')}`;
}

// ============================================================================
// Webhook Delivery Helpers
// ============================================================================

/**
 * Webhook delivery attempt result
 */
export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  durationMs: number;
}

/**
 * Deliver a webhook payload to an endpoint
 * 
 * @param url - Webhook endpoint URL
 * @param payload - Webhook payload
 * @param secret - Webhook secret for signing
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Delivery result
 */
export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string,
  timeoutMs: number = 30000
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();
  
  try {
    const headers = generateWebhookHeaders(payload, secret);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const responseBody = await response.text();
    const durationMs = Date.now() - startTime;
    
    // Success: 2xx status codes
    const success = response.status >= 200 && response.status < 300;
    
    if (!success) {
      logger.warn(
        { url, statusCode: response.status, durationMs },
        'Webhook delivery returned non-success status'
      );
    }
    
    return {
      success,
      statusCode: response.status,
      responseBody,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(
      { url, error: errorMessage, durationMs },
      'Webhook delivery failed'
    );
    
    return {
      success: false,
      error: errorMessage,
      durationMs,
    };
  }
}

// ============================================================================
// Event Type Helpers
// ============================================================================

/**
 * Check if an event type matches a pattern (supports wildcards)
 * 
 * @param event - Event type to check
 * @param pattern - Pattern to match against (e.g., 'call.*', 'call.ended')
 * @returns True if event matches pattern
 */
export function eventMatchesPattern(event: string, pattern: string): boolean {
  // Exact match
  if (event === pattern) {
    return true;
  }
  
  // Wildcard match (e.g., 'call.*' matches 'call.started')
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -1);
    return event.startsWith(prefix);
  }
  
  return false;
}

/**
 * Filter events by subscription patterns
 * 
 * @param event - Event type
 * @param subscribedEvents - Array of subscribed event patterns
 * @returns True if event should be delivered
 */
export function shouldDeliverEvent(event: string, subscribedEvents: string[]): boolean {
  return subscribedEvents.some((pattern) => eventMatchesPattern(event, pattern));
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate exponential backoff delay for webhook retries
 * 
 * @param attempt - Retry attempt number (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 60000
): number {
  // Exponential backoff: baseDelay * 2^attempt + jitter
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
  
  return Math.round(delay);
}

/**
 * Determine if a webhook should be retried based on the result
 * 
 * @param result - Delivery result
 * @param maxAttempts - Maximum number of retry attempts
 * @param currentAttempt - Current attempt number
 * @returns True if should retry
 */
export function shouldRetryWebhook(
  result: WebhookDeliveryResult,
  maxAttempts: number = 5,
  currentAttempt: number = 0
): boolean {
  // Don't retry if we've reached max attempts
  if (currentAttempt >= maxAttempts - 1) {
    return false;
  }
  
  // Retry on network errors
  if (result.error) {
    return true;
  }
  
  // Retry on 5xx server errors
  if (result.statusCode && result.statusCode >= 500) {
    return true;
  }
  
  // Retry on specific 4xx errors that might be transient
  if (result.statusCode === 408 || result.statusCode === 429) {
    return true;
  }
  
  return false;
}
