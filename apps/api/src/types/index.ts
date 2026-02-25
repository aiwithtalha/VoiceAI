/**
 * Universal Voice AI Platform - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used across the API.
 * Centralizing types ensures consistency and enables better IDE support.
 */

import { Request } from 'express';

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  googleId?: string;
  linkedinId?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserJwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserJwtPayload;
}

export interface WorkspaceContextRequest extends AuthenticatedRequest {
  workspaceId?: string;
  workspaceRole?: WorkspaceRole;
}

export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  LINKEDIN = 'linkedin',
}

// ============================================================================
// Workspace & Team Types
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  ownerId: string;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceSettings {
  timezone: string;
  defaultLanguage: string;
  callRecordingEnabled: boolean;
  transcriptionEnabled: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
}

export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Assistant Types
// ============================================================================

export interface Assistant {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isPublished: boolean;
  isTemplate: boolean;
  templateId?: string;
  version: number;
  config: AssistantConfig;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  createdBy: string;
}

export interface AssistantConfig {
  // Voice settings
  voice: {
    provider: TtsProviderType;
    voiceId: string;
    speed: number;
    stability: number;
    similarityBoost: number;
  };
  // LLM settings
  llm: {
    provider: LlmProviderType;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  // STT settings
  stt: {
    provider: SttProviderType;
    language: string;
    model?: string;
  };
  // Telephony settings
  telephony: {
    provider: TelephonyProviderType;
    greetingMessage: string;
    voicemailMessage?: string;
    maxCallDuration: number; // in seconds
  };
  // Tools enabled for this assistant
  tools: string[]; // Array of tool IDs
  // Custom variables
  variables: Record<string, string>;
}

export interface AssistantVersion {
  id: string;
  assistantId: string;
  version: number;
  config: AssistantConfig;
  createdAt: Date;
  createdBy: string;
}

export interface AssistantTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string;
  config: AssistantConfig;
  isPublic: boolean;
  createdAt: Date;
}

// ============================================================================
// Phone Number Types
// ============================================================================

export interface PhoneNumber {
  id: string;
  workspaceId: string;
  phoneNumber: string;
  provider: TelephonyProviderType;
  providerNumberId: string;
  assistantId?: string;
  isActive: boolean;
  capabilities: PhoneNumberCapabilities;
  monthlyCost: number; // in cents
  purchasedAt: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhoneNumberCapabilities {
  voice: boolean;
  sms: boolean;
  mms: boolean;
  fax: boolean;
}

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  countryCode: string;
  capabilities: PhoneNumberCapabilities;
  monthlyCost: number;
}

// ============================================================================
// Call Types
// ============================================================================

export interface Call {
  id: string;
  workspaceId: string;
  assistantId?: string;
  phoneNumberId?: string;
  direction: CallDirection;
  status: CallStatus;
  fromNumber: string;
  toNumber: string;
  provider: TelephonyProviderType;
  providerCallId: string;
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  cost?: number; // in cents
  recordingUrl?: string;
  recordingDuration?: number;
  voicemailUrl?: string;
  metadata: CallMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum CallStatus {
  QUEUED = 'queued',
  RINGING = 'ringing',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BUSY = 'busy',
  FAILED = 'failed',
  NO_ANSWER = 'no_answer',
  CANCELED = 'canceled',
  VOICEMAIL = 'voicemail',
}

export interface CallMetadata {
  userAgent?: string;
  source?: string;
  campaignId?: string;
  customData?: Record<string, unknown>;
}

export interface CallTranscript {
  id: string;
  callId: string;
  segments: TranscriptSegment[];
  summary?: string;
  sentiment?: SentimentAnalysis;
  createdAt: Date;
}

export interface TranscriptSegment {
  id: string;
  speaker: 'assistant' | 'customer';
  text: string;
  startTime: number; // in seconds from call start
  endTime: number;
  confidence: number;
  words: TranscriptWord[];
}

export interface TranscriptWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  segments: {
    time: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
  }[];
}

// ============================================================================
// Tool Types
// ============================================================================

export interface Tool {
  id: string;
  workspaceId?: string; // null for predefined tools
  name: string;
  description: string;
  type: ToolType;
  isPredefined: boolean;
  isEnabled: boolean;
  config: ToolConfig;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export enum ToolType {
  HTTP = 'http',
  FUNCTION = 'function',
  CALENDAR = 'calendar',
  CRM = 'crm',
  DATABASE = 'database',
  WEBHOOK = 'webhook',
}

export interface ToolConfig {
  // HTTP tool config
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyTemplate?: string;
  timeout?: number;
  retryCount?: number;
  // Function tool config
  code?: string;
  runtime?: 'nodejs18' | 'python3.11';
  // Calendar tool config
  calendarProvider?: 'google' | 'microsoft';
  // CRM tool config
  crmProvider?: 'salesforce' | 'hubspot' | 'zoho';
  // Webhook config
  webhookSecret?: string;
}

export interface ToolExecution {
  id: string;
  toolId: string;
  callId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
}

export interface PredefinedTool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  parameters: ToolParameter[];
  config: ToolConfig;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: unknown[];
}

// ============================================================================
// Billing Types
// ============================================================================

export interface Wallet {
  id: string;
  workspaceId: string;
  balance: number; // in cents
  currency: string;
  autoRecharge: boolean;
  autoRechargeThreshold?: number; // in cents
  autoRechargeAmount?: number; // in cents
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  workspaceId: string;
  type: TransactionType;
  amount: number; // in cents (positive for credit, negative for debit)
  balance: number; // wallet balance after transaction
  description: string;
  metadata: TransactionMetadata;
  createdAt: Date;
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  REFUND = 'refund',
  BONUS = 'bonus',
}

export interface TransactionMetadata {
  callId?: string;
  assistantId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  invoiceId?: string;
  reason?: string;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  stripeInvoiceId?: string;
  amount: number; // in cents
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  periodStart: Date;
  periodEnd: Date;
  pdfUrl?: string;
  paidAt?: Date;
  createdAt: Date;
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  // Per-minute rates in cents
  rates: {
    telephony: Record<TelephonyProviderType, number>;
    stt: Record<SttProviderType, number>;
    tts: Record<TtsProviderType, number>;
    llm: Record<string, number>; // model name -> rate
    phoneNumber: number; // monthly cost per number
  };
  isDefault: boolean;
  createdAt: Date;
}

// ============================================================================
// Provider Types
// ============================================================================

export enum TelephonyProviderType {
  TWILIO = 'twilio',
  VONAGE = 'vonage',
  PLIVO = 'plivo',
  TELNYX = 'telnyx',
}

export enum SttProviderType {
  DEEPGRAM = 'deepgram',
  ASSEMBLYAI = 'assemblyai',
  GOOGLE = 'google',
  AWS = 'aws',
  AZURE = 'azure',
  OPENAI = 'openai',
}

export enum TtsProviderType {
  ELEVENLABS = 'elevenlabs',
  OPENAI = 'openai',
  GOOGLE = 'google',
  AWS = 'aws',
  AZURE = 'azure',
  PLAYHT = 'playht',
}

export enum LlmProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  AZURE = 'azure',
  COHERE = 'cohere',
  MISTRAL = 'mistral',
}

// ============================================================================
// Integration Types
// ============================================================================

export interface Integration {
  id: string;
  workspaceId: string;
  provider: IntegrationProvider;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  config: IntegrationConfig;
  credentials?: Record<string, string>;
  connectedAt?: Date;
  disconnectedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum IntegrationProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  SALESFORCE = 'salesforce',
  HUBSPOT = 'hubspot',
  ZAPIER = 'zapier',
  MAKE = 'make',
  SLACK = 'slack',
  CUSTOM = 'custom',
}

export interface IntegrationConfig {
  scopes?: string[];
  webhookUrl?: string;
  settings?: Record<string, unknown>;
}

export interface WebhookEndpoint {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum WebhookEvent {
  CALL_STARTED = 'call.started',
  CALL_ENDED = 'call.ended',
  CALL_TRANSCRIPT_READY = 'call.transcript.ready',
  ASSISTANT_CREATED = 'assistant.created',
  ASSISTANT_UPDATED = 'assistant.updated',
  WALLET_LOW_BALANCE = 'wallet.low_balance',
  WALLET_DEPLETED = 'wallet.depleted',
}

// ============================================================================
// API Key Types
// ============================================================================

export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  permissions: ApiKeyPermission[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  createdAt: Date;
  createdBy: string;
}

export enum ApiKeyPermission {
  CALLS_READ = 'calls:read',
  CALLS_WRITE = 'calls:write',
  ASSISTANTS_READ = 'assistants:read',
  ASSISTANTS_WRITE = 'assistants:write',
  PHONE_NUMBERS_READ = 'phone_numbers:read',
  PHONE_NUMBERS_WRITE = 'phone_numbers:write',
  TOOLS_READ = 'tools:read',
  TOOLS_WRITE = 'tools:write',
  WEBHOOKS_READ = 'webhooks:read',
  WEBHOOKS_WRITE = 'webhooks:write',
}

// ============================================================================
// OTP Types (for demo calls)
// ============================================================================

export interface OtpSession {
  id: string;
  phoneNumber: string;
  code: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Error Types
// ============================================================================

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Real-time Types
// ============================================================================

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export enum WebSocketEvent {
  CALL_STATUS_UPDATE = 'call:status_update',
  CALL_TRANSCRIPT_CHUNK = 'call:transcript_chunk',
  CALL_ANALYSIS_COMPLETE = 'call:analysis_complete',
  WALLET_UPDATE = 'wallet:update',
  NOTIFICATION = 'notification',
}
