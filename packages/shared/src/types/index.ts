/**
 * Shared Type Definitions
 */

import { z } from 'zod';

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// ==========================================
// Voice Types
// ==========================================

export interface VoiceConfig {
  voiceId: string;
  language: string;
  model: string;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  sequence: number;
}

export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
  language?: string;
}

// ==========================================
// Agent Types
// ==========================================

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  voiceId: string;
  language: string;
  systemPrompt?: string;
  greeting?: string;
  aiModel: string;
  temperature: number;
  maxDuration: number;
  recordCalls: boolean;
  enableTranscription: boolean;
}

// ==========================================
// Conversation Types
// ==========================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audioUrl?: string;
  duration?: number;
  timestamp: Date;
}

export interface ConversationSummary {
  id: string;
  agentName: string;
  callerNumber?: string;
  status: string;
  duration?: number;
  startedAt: Date;
  endedAt?: Date;
  messageCount: number;
}

// ==========================================
// WebSocket Message Types
// ==========================================

export type WebSocketMessageType =
  | 'init'
  | 'ready'
  | 'audio'
  | 'transcription'
  | 'audio_end'
  | 'error'
  | 'end';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload?: unknown;
}

export interface InitMessage extends WebSocketMessage {
  type: 'init';
  payload: {
    agentId: string;
    sessionId: string;
  };
}

export interface TranscriptionMessage extends WebSocketMessage {
  type: 'transcription';
  payload: {
    text: string;
    speaker: 'user' | 'assistant';
    isFinal: boolean;
  };
}

// ==========================================
// Validation Schemas
// ==========================================

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  voiceId: z.string().optional(),
  language: z.string().default('en-US'),
  systemPrompt: z.string().max(4000).optional(),
  greeting: z.string().max(500).optional(),
  maxDuration: z.number().min(60).max(3600).default(300),
  recordCalls: z.boolean().default(true),
  enableTranscription: z.boolean().default(true),
  aiModel: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3']).default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;

export const UpdateAgentSchema = CreateAgentSchema.partial();

export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;

// ==========================================
// Pagination Types
// ==========================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
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
