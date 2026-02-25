/**
 * Voice Engine Types - Universal Voice AI Platform
 * Type definitions for the real-time voice engine service
 */

import { WebSocket } from 'ws';

// ============================================================================
// Core Call Types
// ============================================================================

export interface CallSession {
  id: string;
  callSid: string;
  accountSid: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  status: CallStatus;
  assistantId: string;
  userId: string;
  organizationId: string;
  startedAt: Date;
  endedAt?: Date;
  duration: number;
  cost: number;
  creditsDeducted: number;
  lastBillingAt: Date;
  metadata: Record<string, unknown>;
}

export type CallStatus = 
  | 'initializing'
  | 'connected'
  | 'speaking'
  | 'listening'
  | 'processing'
  | 'transferring'
  | 'ended'
  | 'error';

export interface CallSessionState {
  session: CallSession;
  ws: WebSocket;
  conversation: ConversationState;
  providers: ProviderConnections;
  audio: AudioState;
  billing: BillingState;
}

// ============================================================================
// Assistant Configuration
// ============================================================================

export interface AssistantConfig {
  id: string;
  name: string;
  userId: string;
  organizationId: string;
  voice: VoiceConfig;
  model: ModelConfig;
  stt: STTConfig;
  tts: TTSConfig;
  systemPrompt: string;
  firstMessage?: string;
  tools: ToolDefinition[];
  settings: AssistantSettings;
  fallback: FallbackConfig;
}

export interface VoiceConfig {
  provider: 'elevenlabs';
  voiceId: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface ModelConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface STTConfig {
  provider: 'deepgram';
  model: string;
  language: string;
  interimResults: boolean;
  endpointing: boolean | number;
  smartFormatting: boolean;
  punctuate: boolean;
  profanityFilter: boolean;
}

export interface TTSConfig {
  provider: 'elevenlabs';
  voiceId: string;
  model: string;
  optimizeStreamingLatency: number;
}

export interface AssistantSettings {
  silenceTimeoutMs: number;
  maxDurationSeconds: number;
  bargeInEnabled: boolean;
  bargeInThreshold: number;
  recordCall: boolean;
  transcriptionEnabled: boolean;
  webhookUrl?: string;
}

export interface FallbackConfig {
  sttFallback?: STTConfig;
  llmFallback?: ModelConfig;
  ttsFallback?: TTSConfig;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  type: 'builtin' | 'custom';
  parameters: ToolParameter[];
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
  default?: unknown;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  success: boolean;
  result: unknown;
  error?: string;
  executionTimeMs: number;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface ConversationState {
  messages: ConversationMessage[];
  currentTurn: 'user' | 'assistant' | 'system';
  isProcessing: boolean;
  isSpeaking: boolean;
  pendingToolCalls: ToolCall[];
  audioQueue: AudioChunk[];
  lastUserMessageAt?: Date;
  lastAssistantMessageAt?: Date;
  silenceDetectedAt?: Date;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface AudioChunk {
  id: string;
  data: Buffer;
  sequence: number;
  isLast: boolean;
  timestamp: Date;
}

// ============================================================================
// Provider Connection Types
// ============================================================================

export interface ProviderConnections {
  deepgram?: DeepgramConnection;
  openai?: OpenAIConnection;
  elevenlabs?: ElevenLabsConnection;
}

export interface DeepgramConnection {
  connection: any; // LiveClient from @deepgram/sdk
  isConnected: boolean;
  lastTranscriptAt?: Date;
  currentTranscript: string;
}

export interface OpenAIConnection {
  isStreaming: boolean;
  currentResponse?: string;
  abortController?: AbortController;
}

export interface ElevenLabsConnection {
  isStreaming: boolean;
  audioQueue: Buffer[];
  currentText: string;
}

// ============================================================================
// Audio Types
// ============================================================================

export interface AudioState {
  inputFormat: AudioFormat;
  outputFormat: AudioFormat;
  inputBuffer: Buffer;
  outputBuffer: Buffer;
  sampleRate: number;
  channels: number;
  frameSize: number;
}

export interface AudioFormat {
  encoding: 'mulaw' | 'pcm' | 'opus';
  sampleRate: number;
  channels: number;
}

export interface AudioConversionOptions {
  inputEncoding: 'mulaw' | 'pcm';
  outputEncoding: 'mulaw' | 'pcm';
  inputSampleRate: number;
  outputSampleRate: number;
}

// ============================================================================
// Billing Types
// ============================================================================

export interface BillingState {
  lastDeductionAt: Date;
  totalSeconds: number;
  billedSeconds: number;
  creditsRemaining: number;
  billingInterval: number; // seconds (30 for 30-second increments)
  isPaused: boolean;
}

export interface BillingDeduction {
  callId: string;
  seconds: number;
  credits: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// ============================================================================
// Twilio Media Stream Types
// ============================================================================

export interface TwilioMediaMessage {
  event: 'start' | 'media' | 'stop' | 'mark' | 'connected' | 'closed';
  streamSid?: string;
  sequenceNumber?: number;
  media?: {
    track: 'inbound' | 'outbound';
    chunk: string; // base64 encoded mulaw audio
    timestamp?: string;
    payload?: string;
  };
  start?: {
    accountSid: string;
    streamSid: string;
    callSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
    customParameters?: Record<string, string>;
  };
  stop?: {
    accountSid: string;
    callSid: string;
    streamSid: string;
  };
  mark?: {
    name: string;
  };
}

export interface TwilioMediaResponse {
  event: 'media' | 'mark' | 'clear';
  streamSid: string;
  media?: {
    payload: string; // base64 encoded mulaw audio
  };
  mark?: {
    name: string;
  };
}

// ============================================================================
// Deepgram Types
// ============================================================================

export interface DeepgramTranscript {
  type: 'Results' | 'SpeechStarted' | 'UtteranceEnd' | 'Final' | 'Interim';
  channel?: {
    alternatives: {
      transcript: string;
      confidence: number;
      words: DeepgramWord[];
    }[];
  };
  is_final?: boolean;
  speech_final?: boolean;
  duration?: number;
  start?: number;
  channel_index?: number[];
}

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

// ============================================================================
// OpenAI Types
// ============================================================================

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ============================================================================
// ElevenLabs Types
// ============================================================================

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface ElevenLabsGenerateOptions {
  voiceId: string;
  text: string;
  modelId: string;
  voiceSettings?: ElevenLabsVoiceSettings;
  optimizeStreamingLatency?: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type VoiceEngineEvent =
  | { type: 'call.started'; payload: CallSession }
  | { type: 'call.ended'; payload: { callId: string; duration: number; cost: number } }
  | { type: 'call.error'; payload: { callId: string; error: string } }
  | { type: 'transcript.received'; payload: { callId: string; transcript: string; isFinal: boolean } }
  | { type: 'assistant.speaking'; payload: { callId: string; text: string } }
  | { type: 'assistant.speech.ended'; payload: { callId: string } }
  | { type: 'user.speaking'; payload: { callId: string } }
  | { type: 'user.silence'; payload: { callId: string; duration: number } }
  | { type: 'tool.called'; payload: { callId: string; tool: ToolCall } }
  | { type: 'tool.completed'; payload: { callId: string; result: ToolResult } }
  | { type: 'billing.deducted'; payload: BillingDeduction }
  | { type: 'barge-in.detected'; payload: { callId: string } };

export interface EventHandler {
  (event: VoiceEngineEvent): void | Promise<void>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    websocket: 'connected' | 'disconnected';
    deepgram: 'connected' | 'disconnected';
    openai: 'connected' | 'disconnected';
    elevenlabs: 'connected' | 'disconnected';
  };
  activeCalls: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface VoiceEngineConfig {
  port: number;
  wsPort: number;
  host: string;
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Provider API Keys
  deepgramApiKey: string;
  openaiApiKey: string;
  elevenlabsApiKey: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  
  // Service URLs
  apiBaseUrl: string;
  webhookSecret: string;
  
  // Audio Settings
  defaultSampleRate: number;
  defaultFrameSize: number;
  
  // Billing Settings
  billingIntervalSeconds: number;
  costPerMinute: number;
  
  // Feature Flags
  enableBargeIn: boolean;
  enableEndpointing: boolean;
  enableCallRecording: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class VoiceEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'VoiceEngineError';
  }
}

export type ErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'ASSISTANT_NOT_FOUND'
  | 'PROVIDER_CONNECTION_FAILED'
  | 'STT_ERROR'
  | 'LLM_ERROR'
  | 'TTS_ERROR'
  | 'TOOL_EXECUTION_FAILED'
  | 'BILLING_ERROR'
  | 'INVALID_AUDIO_FORMAT'
  | 'WEBSOCKET_ERROR'
  | 'TWILIO_ERROR';
