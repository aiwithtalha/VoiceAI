/**
 * Universal Voice AI Platform - Voice Engine Client
 * 
 * HTTP client for communicating with the Voice Engine service.
 * Handles call session management, WebSocket URL generation,
 * and real-time communication with the voice processing pipeline.
 */

import { config } from '../config';
import logger from '../utils/logger';
import { ApiError, ErrorCode, AssistantConfig } from '../types';
import { encrypt, decrypt } from '../utils/encryption';

// ============================================================================
// Configuration
// ============================================================================

const VOICE_ENGINE_URL = process.env.VOICE_ENGINE_URL || 'http://localhost:3002';
const VOICE_ENGINE_WS_URL = process.env.VOICE_ENGINE_WS_URL || 'ws://localhost:3002';
const API_KEY = process.env.VOICE_ENGINE_API_KEY || '';

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 30000;

// ============================================================================
// Types
// ============================================================================

export interface StartCallSessionInput {
  callId: string;
  assistantConfig: AssistantConfig;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  metadata?: Record<string, unknown>;
}

export interface StartCallSessionResult {
  sessionId: string;
  sessionToken: string;
  websocketUrl: string;
  providerCallId?: string;
  expiresAt: Date;
}

export interface CallSessionStatus {
  sessionId: string;
  callId: string;
  status: 'initializing' | 'active' | 'ending' | 'ended';
  duration: number;
  connectedAt?: Date;
}

export interface StreamMessage {
  type: 'transcript' | 'audio' | 'event' | 'error';
  payload: unknown;
  timestamp: number;
}

// ============================================================================
// Voice Engine Client
// ============================================================================

class VoiceEngineClient {
  private baseUrl: string;
  private wsUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, wsUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
    this.apiKey = apiKey;
  }

  /**
   * Start a new call session with the voice engine
   * 
   * This function:
   * 1. Sends the assistant configuration to the voice engine
   * 2. Receives a session ID and WebSocket URL
   * 3. Returns the connection details for the telephony provider
   */
  async startCallSession(input: StartCallSessionInput): Promise<StartCallSessionResult> {
    const { callId, assistantConfig, direction, fromNumber, toNumber, metadata } = input;

    logger.info(
      { callId, direction, fromNumber, toNumber },
      'Starting voice engine call session'
    );

    try {
      // Prepare the request payload
      const payload = {
        callId,
        direction,
        fromNumber,
        toNumber,
        config: {
          // Voice configuration
          voice: {
            provider: assistantConfig.voice.provider,
            voiceId: assistantConfig.voice.voiceId,
            speed: assistantConfig.voice.speed,
            stability: assistantConfig.voice.stability,
            similarityBoost: assistantConfig.voice.similarityBoost,
          },
          // LLM configuration
          llm: {
            provider: assistantConfig.llm.provider,
            model: assistantConfig.llm.model,
            temperature: assistantConfig.llm.temperature,
            maxTokens: assistantConfig.llm.maxTokens,
            systemPrompt: assistantConfig.llm.systemPrompt,
          },
          // STT configuration
          stt: {
            provider: assistantConfig.stt.provider,
            language: assistantConfig.stt.language,
            model: assistantConfig.stt.model,
          },
          // Telephony settings
          telephony: {
            greetingMessage: assistantConfig.telephony.greetingMessage,
            maxCallDuration: assistantConfig.telephony.maxCallDuration,
          },
          // Tools configuration
          tools: assistantConfig.tools || [],
          variables: assistantConfig.variables || {},
        },
        metadata: {
          ...metadata,
          apiVersion: 'v1',
        },
      };

      // Make request to voice engine
      const response = await this.makeRequest('/api/v1/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Voice engine returned ${response.status}`
        );
      }

      const result = await response.json();

      // Generate secure WebSocket URL with session token
      const sessionToken = this.generateSessionToken(callId, result.sessionId);
      const websocketUrl = `${this.wsUrl}/ws/v1/calls/${callId}?token=${encodeURIComponent(sessionToken)}`;

      logger.info(
        { callId, sessionId: result.sessionId },
        'Voice engine session started successfully'
      );

      return {
        sessionId: result.sessionId,
        sessionToken,
        websocketUrl,
        providerCallId: result.providerCallId,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      };
    } catch (error) {
      logger.error(
        { callId, error: (error as Error).message },
        'Failed to start voice engine session'
      );
      throw new ApiError(
        500,
        ErrorCode.PROVIDER_ERROR,
        'Failed to initialize voice session'
      );
    }
  }

  /**
   * End an active call session
   * 
   * Notifies the voice engine to terminate the session and
   * release any associated resources.
   */
  async endCallSession(callId: string): Promise<void> {
    logger.info({ callId }, 'Ending voice engine call session');

    try {
      const response = await this.makeRequest(`/api/v1/sessions/${callId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Voice engine returned ${response.status}`
        );
      }

      logger.info({ callId }, 'Voice engine session ended successfully');
    } catch (error) {
      // Log but don't throw - session might already be ended
      logger.warn(
        { callId, error: (error as Error).message },
        'Error ending voice engine session (may already be ended)'
      );
    }
  }

  /**
   * Get the status of an active call session
   */
  async getSessionStatus(callId: string): Promise<CallSessionStatus | null> {
    logger.debug({ callId }, 'Getting voice engine session status');

    try {
      const response = await this.makeRequest(`/api/v1/sessions/${callId}/status`, {
        method: 'GET',
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Voice engine returned ${response.status}`);
      }

      const status = await response.json();
      return status;
    } catch (error) {
      logger.error(
        { callId, error: (error as Error).message },
        'Failed to get session status'
      );
      return null;
    }
  }

  /**
   * Send a message to an active call session
   * Used for injecting messages or triggering actions during a call
   */
  async sendSessionMessage(
    callId: string,
    message: StreamMessage
  ): Promise<void> {
    logger.debug({ callId, messageType: message.type }, 'Sending session message');

    try {
      const response = await this.makeRequest(`/api/v1/sessions/${callId}/message`, {
        method: 'POST',
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Voice engine returned ${response.status}`);
      }
    } catch (error) {
      logger.error(
        { callId, error: (error as Error).message },
        'Failed to send session message'
      );
      throw error;
    }
  }

  /**
   * Inject a text message into an active call
   * The assistant will speak this message to the user
   */
  async injectAssistantMessage(callId: string, text: string): Promise<void> {
    await this.sendSessionMessage(callId, {
      type: 'event',
      payload: {
        event: 'inject_message',
        text,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Trigger a function call during an active call
   */
  async triggerFunctionCall(
    callId: string,
    functionName: string,
    parameters: Record<string, unknown>
  ): Promise<void> {
    await this.sendSessionMessage(callId, {
      type: 'event',
      payload: {
        event: 'trigger_function',
        functionName,
        parameters,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Transfer a call to a different number
   */
  async transferCall(callId: string, transferTo: string): Promise<void> {
    await this.sendSessionMessage(callId, {
      type: 'event',
      payload: {
        event: 'transfer_call',
        transferTo,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Health check for the voice engine
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; version?: string }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('/health', {
        method: 'GET',
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        return { healthy: false, latency };
      }

      const data = await response.json().catch(() => ({}));

      return {
        healthy: true,
        latency,
        version: data.version,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate a session token
   * Used by WebSocket handler to verify connection requests
   */
  validateSessionToken(token: string, callId: string): boolean {
    try {
      const decrypted = decrypt(token);
      const data = JSON.parse(decrypted);

      // Check token expiration
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        logger.warn({ callId }, 'Session token expired');
        return false;
      }

      // Verify call ID matches
      if (data.callId !== callId) {
        logger.warn({ tokenCallId: data.callId, requestCallId: callId }, 'Session token call ID mismatch');
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to validate session token');
      return false;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Make an HTTP request to the voice engine
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...((options.headers as Record<string, string>) || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Generate a secure session token for WebSocket authentication
   */
  private generateSessionToken(callId: string, sessionId: string): string {
    const tokenData = {
      callId,
      sessionId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
    };

    return encrypt(JSON.stringify(tokenData));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const voiceEngineClient = new VoiceEngineClient(
  VOICE_ENGINE_URL,
  VOICE_ENGINE_WS_URL,
  API_KEY
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get WebSocket URL for a call session
 * Used by telephony providers to connect to the voice engine
 */
export function getCallWebsocketUrl(callId: string, sessionToken: string): string {
  return `${VOICE_ENGINE_WS_URL}/ws/v1/calls/${callId}?token=${encodeURIComponent(sessionToken)}`;
}

/**
 * Check if the voice engine is healthy
 */
export async function isVoiceEngineHealthy(): Promise<boolean> {
  const health = await voiceEngineClient.healthCheck();
  return health.healthy;
}

/**
 * Format assistant config for voice engine API
 */
export function formatAssistantConfigForVoiceEngine(
  config: AssistantConfig
): Record<string, unknown> {
  return {
    voice: {
      provider: config.voice.provider,
      voiceId: config.voice.voiceId,
      speed: config.voice.speed,
      stability: config.voice.stability,
      similarityBoost: config.voice.similarityBoost,
    },
    llm: {
      provider: config.llm.provider,
      model: config.llm.model,
      temperature: config.llm.temperature,
      maxTokens: config.llm.maxTokens,
      systemPrompt: config.llm.systemPrompt,
    },
    stt: {
      provider: config.stt.provider,
      language: config.stt.language,
      model: config.stt.model,
    },
    telephony: {
      greetingMessage: config.telephony.greetingMessage,
      maxCallDuration: config.telephony.maxCallDuration,
    },
    tools: config.tools || [],
    variables: config.variables || {},
  };
}
