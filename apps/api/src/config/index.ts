/**
 * Universal Voice AI Platform - Configuration
 * 
 * Centralized configuration management with environment variable validation.
 * Uses dotenv for local development and supports cloud environment variables.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// ============================================================================
// Environment Variable Schema
// ============================================================================

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3001'),
  HOST: z.string().default('0.0.0.0'),
  API_URL: z.string().url().default('http://localhost:3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  // OAuth - LinkedIn
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CALLBACK_URL: z.string().url().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_API_KEY: z.string().optional(),
  TWILIO_API_SECRET: z.string().optional(),

  // Provider API Keys
  DEEPGRAM_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ASSEMBLYAI_API_KEY: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),

  // Redis (optional - for caching and session storage)
  REDIS_URL: z.string().optional(),

  // Webhook
  WEBHOOK_SECRET: z.string().min(16, 'WEBHOOK_SECRET must be at least 16 characters').optional(),

  // Call Configuration
  MAX_CALL_DURATION_SECONDS: z.string().default('3600'), // 1 hour
  CALL_COST_DEDUCTION_INTERVAL_SECONDS: z.string().default('30'),
  MINIMUM_WALLET_BALANCE_CENTS: z.string().default('50'), // $0.50

  // Demo OTP
  OTP_EXPIRY_MINUTES: z.string().default('10'),
  OTP_MAX_ATTEMPTS: z.string().default('3'),
});

// ============================================================================
// Parse and Validate Environment Variables
// ============================================================================

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

const env = parsedEnv.data;

// ============================================================================
// Configuration Object
// ============================================================================

export const config = {
  // Server
  server: {
    env: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    host: env.HOST,
    apiUrl: env.API_URL,
    frontendUrl: env.FRONTEND_URL,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
  },

  // Database
  database: {
    url: env.DATABASE_URL,
  },

  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },

  // Encryption
  encryption: {
    key: env.ENCRYPTION_KEY,
  },

  // OAuth
  oauth: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackUrl: env.GOOGLE_CALLBACK_URL || `${env.API_URL}/auth/google/callback`,
    },
    linkedin: {
      clientId: env.LINKEDIN_CLIENT_ID,
      clientSecret: env.LINKEDIN_CLIENT_SECRET,
      callbackUrl: env.LINKEDIN_CALLBACK_URL || `${env.API_URL}/auth/linkedin/callback`,
    },
  },

  // Stripe
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  },

  // Twilio
  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    apiKey: env.TWILIO_API_KEY,
    apiSecret: env.TWILIO_API_SECRET,
  },

  // Provider API Keys
  providers: {
    deepgram: {
      apiKey: env.DEEPGRAM_API_KEY,
    },
    elevenlabs: {
      apiKey: env.ELEVENLABS_API_KEY,
    },
    openai: {
      apiKey: env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
    },
    assemblyai: {
      apiKey: env.ASSEMBLYAI_API_KEY,
    },
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },

  // Redis
  redis: {
    url: env.REDIS_URL,
  },

  // Webhook
  webhook: {
    secret: env.WEBHOOK_SECRET,
  },

  // Call Configuration
  call: {
    maxDurationSeconds: parseInt(env.MAX_CALL_DURATION_SECONDS, 10),
    costDeductionIntervalSeconds: parseInt(env.CALL_COST_DEDUCTION_INTERVAL_SECONDS, 10),
    minimumWalletBalanceCents: parseInt(env.MINIMUM_WALLET_BALANCE_CENTS, 10),
  },

  // Demo OTP
  otp: {
    expiryMinutes: parseInt(env.OTP_EXPIRY_MINUTES, 10),
    maxAttempts: parseInt(env.OTP_MAX_ATTEMPTS, 10),
  },
} as const;

// ============================================================================
// Type Export
// ============================================================================

export type Config = typeof config;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if required provider credentials are configured
 */
export function isProviderConfigured(provider: keyof typeof config.providers): boolean {
  const providerConfig = config.providers[provider];
  return !!providerConfig?.apiKey;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!config.stripe.secretKey;
}

/**
 * Check if Twilio is configured
 */
export function isTwilioConfigured(): boolean {
  return !!(config.twilio.accountSid && config.twilio.authToken);
}

/**
 * Check if OAuth providers are configured
 */
export function isOAuthConfigured(provider: 'google' | 'linkedin'): boolean {
  const oauthConfig = config.oauth[provider];
  return !!(oauthConfig.clientId && oauthConfig.clientSecret);
}

export default config;
