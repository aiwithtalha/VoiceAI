/**
 * Shared Constants
 */

// ==========================================
// App Constants
// ==========================================

export const APP_NAME = 'Voice AI Platform';
export const APP_VERSION = '1.0.0';
export const APP_URL = process.env.APP_URL || 'http://localhost:3000';
export const API_URL = process.env.API_URL || 'http://localhost:3001';
export const VOICE_ENGINE_URL = process.env.VOICE_ENGINE_URL || 'http://localhost:3002';

// ==========================================
// Subscription Plans
// ==========================================

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    minutesLimit: 60,
    features: [
      '1 AI Agent',
      '1 Phone Number',
      'Basic voice synthesis',
      'Email support',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 49,
    minutesLimit: 1000,
    features: [
      'Unlimited AI Agents',
      'Unlimited Phone Numbers',
      'Premium voice synthesis',
      'Call recordings',
      'Advanced analytics',
      'Priority support',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null, // Custom pricing
    minutesLimit: null, // Unlimited
    features: [
      'Everything in Pro',
      'Custom AI models',
      'SLA guarantee',
      'Dedicated support',
      'Custom integrations',
    ],
  },
} as const;

// ==========================================
// Voice Models
// ==========================================

export const AI_MODELS = {
  'gpt-4': {
    name: 'GPT-4',
    provider: 'OpenAI',
    description: 'Most capable model for complex conversations',
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Fast and cost-effective for most use cases',
  },
  'claude-3': {
    name: 'Claude 3',
    provider: 'Anthropic',
    description: 'Advanced reasoning and safety',
  },
} as const;

// ==========================================
// Voice IDs (ElevenLabs)
// ==========================================

export const VOICE_OPTIONS = {
  RACHEL: {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    gender: 'female',
    accent: 'American',
    description: 'Calm and professional',
  },
  DOMI: {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    gender: 'male',
    accent: 'American',
    description: 'Strong and authoritative',
  },
  BELLA: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    gender: 'female',
    accent: 'American',
    description: 'Soft and gentle',
  },
  ANTONI: {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    gender: 'male',
    accent: 'American',
    description: 'Warm and friendly',
  },
  ELLI: {
    id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    gender: 'female',
    accent: 'American',
    description: 'Confident and engaging',
  },
  JOSH: {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    gender: 'male',
    accent: 'American',
    description: 'Young and energetic',
  },
} as const;

// ==========================================
// Languages
// ==========================================

export const SUPPORTED_LANGUAGES = {
  'en-US': {
    name: 'English (US)',
    code: 'en-US',
    flag: '🇺🇸',
  },
  'en-GB': {
    name: 'English (UK)',
    code: 'en-GB',
    flag: '🇬🇧',
  },
  'es-ES': {
    name: 'Spanish',
    code: 'es-ES',
    flag: '🇪🇸',
  },
  'fr-FR': {
    name: 'French',
    code: 'fr-FR',
    flag: '🇫🇷',
  },
  'de-DE': {
    name: 'German',
    code: 'de-DE',
    flag: '🇩🇪',
  },
  'it-IT': {
    name: 'Italian',
    code: 'it-IT',
    flag: '🇮🇹',
  },
  'pt-BR': {
    name: 'Portuguese (BR)',
    code: 'pt-BR',
    flag: '🇧🇷',
  },
  'ja-JP': {
    name: 'Japanese',
    code: 'ja-JP',
    flag: '🇯🇵',
  },
  'ko-KR': {
    name: 'Korean',
    code: 'ko-KR',
    flag: '🇰🇷',
  },
  'zh-CN': {
    name: 'Chinese (Simplified)',
    code: 'zh-CN',
    flag: '🇨🇳',
  },
} as const;

// ==========================================
// Call Settings
// ==========================================

export const CALL_SETTINGS = {
  MIN_DURATION: 60, // 1 minute
  MAX_DURATION: 3600, // 1 hour
  DEFAULT_DURATION: 300, // 5 minutes
  WARNING_THRESHOLD: 0.8, // 80% of max duration
} as const;

// ==========================================
// Pagination Defaults
// ==========================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ==========================================
// Error Codes
// ==========================================

export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Service errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  
  // Subscription errors
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
} as const;

// ==========================================
// HTTP Status Codes
// ==========================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ==========================================
// Cache Keys
// ==========================================

export const CACHE_KEYS = {
  USER: (userId: string) => `user:${userId}`,
  AGENT: (agentId: string) => `agent:${agentId}`,
  CONVERSATION: (conversationId: string) => `conversation:${conversationId}`,
  RATE_LIMIT: (key: string) => `rate_limit:${key}`,
  SESSION: (sessionId: string) => `session:${sessionId}`,
} as const;

// ==========================================
// Time Constants (in milliseconds)
// ==========================================

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// ==========================================
// File Size Limits
// ==========================================

export const FILE_LIMITS = {
  MAX_AUDIO_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_UPLOAD_SIZE: 100 * 1024 * 1024, // 100MB
} as const;
