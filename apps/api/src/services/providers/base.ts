/**
 * Universal Voice AI Platform - Provider Base Interfaces
 * 
 * Abstract base interfaces for all provider types (Telephony, STT, TTS, LLM).
 * Enables provider-agnostic implementation and easy swapping of providers.
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ProviderConfig {
  apiKey: string;
  apiSecret?: string;
  region?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastCheckedAt: Date;
  error?: string;
}

// ============================================================================
// Telephony Provider Interface
// ============================================================================

export interface TelephonyCall {
  id: string;
  providerCallId: string;
  from: string;
  to: string;
  status: TelephonyCallStatus;
  direction: 'inbound' | 'outbound';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in seconds
  recordingUrl?: string;
  recordingDuration?: number;
}

export enum TelephonyCallStatus {
  QUEUED = 'queued',
  RINGING = 'ringing',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BUSY = 'busy',
  FAILED = 'failed',
  NO_ANSWER = 'no_answer',
  CANCELED = 'canceled',
}

export interface InitiateCallRequest {
  to: string;
  from: string;
  webhookUrl: string;
  statusCallbackUrl?: string;
  record?: boolean;
  timeout?: number;
  machineDetection?: boolean;
}

export interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  countryCode: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
  monthlyCost: number; // in cents
}

export interface PurchaseNumberRequest {
  phoneNumber: string;
  webhookUrl?: string;
  statusCallbackUrl?: string;
}

export interface PurchasedNumber {
  id: string;
  phoneNumber: string;
  providerNumberId: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
  webhookUrl?: string;
  statusCallbackUrl?: string;
}

/**
 * Telephony Provider Interface
 * Abstracts telephony operations (Twilio, Vonage, Plivo, Telnyx)
 */
export interface TelephonyProvider {
  readonly name: string;
  
  // Health check
  checkHealth(): Promise<ProviderHealth>;
  
  // Call management
  initiateCall(request: InitiateCallRequest): Promise<TelephonyCall>;
  endCall(callId: string): Promise<void>;
  getCall(callId: string): Promise<TelephonyCall | null>;
  
  // Conference management
  createConference(options?: { friendlyName?: string; record?: boolean }): Promise<string>;
  addToConference(callId: string, conferenceId: string): Promise<void>;
  removeFromConference(callId: string): Promise<void>;
  
  // Recording
  startRecording(callId: string): Promise<void>;
  stopRecording(callId: string): Promise<void>;
  getRecording(recordingId: string): Promise<{ url: string; duration: number } | null>;
  
  // Phone numbers
  searchAvailableNumbers(options: {
    country: string;
    areaCode?: string;
    contains?: string;
    smsEnabled?: boolean;
    voiceEnabled?: boolean;
  }): Promise<AvailablePhoneNumber[]>;
  
  purchaseNumber(request: PurchaseNumberRequest): Promise<PurchasedNumber>;
  releaseNumber(numberId: string): Promise<void>;
  updateNumberWebhook(numberId: string, webhookUrl: string): Promise<void>;
  
  // Webhook parsing
  parseIncomingCallWebhook(payload: unknown): {
    callId: string;
    from: string;
    to: string;
    direction: 'inbound' | 'outbound';
    status: TelephonyCallStatus;
  };
  
  // Generate TwiML/VoiceXML response
  generateVoiceResponse(actions: VoiceAction[]): string;
}

export type VoiceAction =
  | { type: 'say'; text: string; voice?: string; language?: string }
  | { type: 'play'; url: string }
  | { type: 'gather'; action: string; numDigits?: number; timeout?: number; speechTimeout?: string }
  | { type: 'record'; action: string; maxLength?: number; transcribe?: boolean }
  | { type: 'dial'; number: string; callerId?: string; record?: boolean }
  | { type: 'hangup' }
  | { type: 'pause'; length: number }
  | { type: 'redirect'; url: string };

// ============================================================================
// STT (Speech-to-Text) Provider Interface
// ============================================================================

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  words: TranscribedWord[];
  language?: string;
}

export interface TranscribedWord {
  word: string;
  startTime: number; // in seconds
  endTime: number;
  confidence: number;
}

export interface StreamingTranscriptionConfig {
  language: string;
  model?: string;
  interimResults?: boolean;
  punctuate?: boolean;
  profanityFilter?: boolean;
  diarize?: boolean; // Speaker diarization
  numSpeakers?: number;
  keywords?: string[];
}

export interface BatchTranscriptionConfig {
  language: string;
  model?: string;
  punctuate?: boolean;
  paragraphs?: boolean;
  utterances?: boolean;
  diarize?: boolean;
  numSpeakers?: number;
  sentiment?: boolean;
  topics?: boolean;
  summaries?: boolean;
}

/**
 * STT Provider Interface
 * Abstracts speech-to-text operations (Deepgram, AssemblyAI, Google, AWS)
 */
export interface SttProvider {
  readonly name: string;
  
  // Health check
  checkHealth(): Promise<ProviderHealth>;
  
  // Streaming transcription (WebSocket)
  createStreamingConnection(
    config: StreamingTranscriptionConfig,
    onResult: (result: TranscriptionResult) => void,
    onError: (error: Error) => void
  ): Promise<{
    sendAudio: (audioData: Buffer) => void;
    close: () => void;
  }>;
  
  // Batch transcription (for recordings)
  transcribeAudio(
    audioUrl: string,
    config: BatchTranscriptionConfig
  ): Promise<{
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    result?: {
      text: string;
      confidence: number;
      words: TranscribedWord[];
      paragraphs?: Array<{ text: string; start: number; end: number }>;
      utterances?: Array<{ speaker: string; text: string; start: number; end: number }>;
      sentiment?: 'positive' | 'neutral' | 'negative';
      topics?: string[];
      summary?: string;
    };
  }>;
  
  // Get transcription status/result
  getTranscription(transcriptionId: string): Promise<{
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    result?: TranscriptionResult;
  }>;
  
  // Supported languages
  getSupportedLanguages(): string[];
}

// ============================================================================
// TTS (Text-to-Speech) Provider Interface
// ============================================================================

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  accent?: string;
  age?: 'child' | 'young' | 'middle' | 'senior';
  previewUrl?: string;
}

export interface TtsOptions {
  voiceId: string;
  speed?: number; // 0.5 to 2.0
  pitch?: number; // -20 to 20
  volume?: number; // 0 to 100
  format?: 'mp3' | 'wav' | 'ogg' | 'pcm';
  sampleRate?: number;
}

export interface StreamingTtsOptions extends TtsOptions {
  chunkSize?: number;
}

/**
 * TTS Provider Interface
 * Abstracts text-to-speech operations (ElevenLabs, OpenAI, Google, AWS)
 */
export interface TtsProvider {
  readonly name: string;
  
  // Health check
  checkHealth(): Promise<ProviderHealth>;
  
  // List available voices
  listVoices(language?: string): Promise<Voice[]>;
  
  // Synthesize speech (batch)
  synthesize(text: string, options: TtsOptions): Promise<{
    audioData: Buffer;
    duration: number; // in seconds
    format: string;
  }>;
  
  // Streaming synthesis (for real-time)
  synthesizeStream(
    text: string,
    options: StreamingTtsOptions,
    onChunk: (chunk: Buffer) => void,
    onError: (error: Error) => void
  ): Promise<{
    duration: number;
    totalBytes: number;
  }>;
  
  // Get voice details
  getVoice(voiceId: string): Promise<Voice | null>;
  
  // Clone voice (if supported)
  cloneVoice?(name: string, samples: Buffer[]): Promise<Voice>;
}

// ============================================================================
// LLM Provider Interface
// ============================================================================

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string; // For function messages
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface LlmFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LlmCompletionOptions {
  model: string;
  messages: LlmMessage[];
  temperature?: number; // 0 to 2
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  functions?: LlmFunction[];
  functionCall?: 'auto' | 'none' | { name: string };
  stream?: boolean;
}

export interface LlmCompletionResult {
  id: string;
  model: string;
  message: LlmMessage;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface StreamingLlmResult {
  id: string;
  model: string;
  delta: {
    content?: string;
    functionCall?: {
      name?: string;
      arguments?: string;
    };
  };
  finishReason?: 'stop' | 'length' | 'function_call' | 'content_filter';
}

/**
 * LLM Provider Interface
 * Abstracts LLM operations (OpenAI, Anthropic, Google, Azure)
 */
export interface LlmProvider {
  readonly name: string;
  
  // Health check
  checkHealth(): Promise<ProviderHealth>;
  
  // List available models
  listModels(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    maxTokens: number;
    pricing: {
      input: number; // per 1K tokens
      output: number; // per 1K tokens
    };
  }>>;
  
  // Create completion (non-streaming)
  complete(options: LlmCompletionOptions): Promise<LlmCompletionResult>;
  
  // Create streaming completion
  completeStream(
    options: LlmCompletionOptions,
    onChunk: (chunk: StreamingLlmResult) => void,
    onError: (error: Error) => void
  ): Promise<{
    id: string;
    model: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;
  
  // Count tokens (for estimation)
  countTokens(text: string, model: string): number;
  
  // Get model info
  getModel(modelId: string): Promise<{
    id: string;
    name: string;
    maxTokens: number;
    contextWindow: number;
  } | null>;
}

// ============================================================================
// Provider Factory
// ============================================================================

export interface ProviderFactory {
  createTelephonyProvider(type: string, config: ProviderConfig): TelephonyProvider;
  createSttProvider(type: string, config: ProviderConfig): SttProvider;
  createTtsProvider(type: string, config: ProviderConfig): TtsProvider;
  createLlmProvider(type: string, config: ProviderConfig): LlmProvider;
}

// ============================================================================
// Provider Registry
// ============================================================================

export class ProviderRegistry {
  private telephonyProviders = new Map<string, new (config: ProviderConfig) => TelephonyProvider>();
  private sttProviders = new Map<string, new (config: ProviderConfig) => SttProvider>();
  private ttsProviders = new Map<string, new (config: ProviderConfig) => TtsProvider>();
  private llmProviders = new Map<string, new (config: ProviderConfig) => LlmProvider>();
  
  registerTelephony(type: string, provider: new (config: ProviderConfig) => TelephonyProvider): void {
    this.telephonyProviders.set(type, provider);
  }
  
  registerStt(type: string, provider: new (config: ProviderConfig) => SttProvider): void {
    this.sttProviders.set(type, provider);
  }
  
  registerTts(type: string, provider: new (config: ProviderConfig) => TtsProvider): void {
    this.ttsProviders.set(type, provider);
  }
  
  registerLlm(type: string, provider: new (config: ProviderConfig) => LlmProvider): void {
    this.llmProviders.set(type, provider);
  }
  
  getTelephonyProvider(type: string, config: ProviderConfig): TelephonyProvider {
    const Provider = this.telephonyProviders.get(type);
    if (!Provider) {
      throw new Error(`Telephony provider '${type}' not registered`);
    }
    return new Provider(config);
  }
  
  getSttProvider(type: string, config: ProviderConfig): SttProvider {
    const Provider = this.sttProviders.get(type);
    if (!Provider) {
      throw new Error(`STT provider '${type}' not registered`);
    }
    return new Provider(config);
  }
  
  getTtsProvider(type: string, config: ProviderConfig): TtsProvider {
    const Provider = this.ttsProviders.get(type);
    if (!Provider) {
      throw new Error(`TTS provider '${type}' not registered`);
    }
    return new Provider(config);
  }
  
  getLlmProvider(type: string, config: ProviderConfig): LlmProvider {
    const Provider = this.llmProviders.get(type);
    if (!Provider) {
      throw new Error(`LLM provider '${type}' not registered`);
    }
    return new Provider(config);
  }
  
  listTelephonyProviders(): string[] {
    return Array.from(this.telephonyProviders.keys());
  }
  
  listSttProviders(): string[] {
    return Array.from(this.sttProviders.keys());
  }
  
  listTtsProviders(): string[] {
    return Array.from(this.ttsProviders.keys());
  }
  
  listLlmProviders(): string[] {
    return Array.from(this.llmProviders.keys());
  }
}

// Global provider registry instance
export const providerRegistry = new ProviderRegistry();
