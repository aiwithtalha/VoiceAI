/**
 * Twilio WebSocket Handler
 * Handles Twilio Media Streams WebSocket connections
 * Manages the full audio pipeline: Twilio -> Deepgram -> OpenAI -> ElevenLabs -> Twilio
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { 
  TwilioMediaMessage, 
  TwilioMediaResponse,
  VoiceEngineConfig,
  CallSession,
  CallStatus
} from '../types';
import { Logger } from '../utils/logger';
import { CallSessionManager } from '../services/call-session';
import { getConfig, emitEvent, setSession, removeSession, getPrisma } from '../index';

const logger = new Logger('TwilioWebSocketHandler');

export class TwilioWebSocketHandler {
  private ws: WebSocket;
  private connectionId: string;
  private config: VoiceEngineConfig;
  private callSession: CallSessionManager | null = null;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private isDestroyed = false;
  private markQueue: string[] = [];
  private lastMarkIndex = 0;

  constructor(ws: WebSocket, connectionId: string, config: VoiceEngineConfig) {
    this.ws = ws;
    this.connectionId = connectionId;
    this.config = config;
    
    this.setupWebSocketHandlers();
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    this.ws.on('message', (data: Buffer) => {
      try {
        const message: TwilioMediaMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message', { 
          error, 
          connectionId: this.connectionId 
        });
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      logger.info('WebSocket closed', { 
        connectionId: this.connectionId, 
        code, 
        reason: reason.toString() 
      });
      this.handleClose();
    });

    this.ws.on('error', (error: Error) => {
      logger.error('WebSocket error', { 
        error, 
        connectionId: this.connectionId 
      });
    });
  }

  /**
   * Handle incoming WebSocket messages from Twilio
   */
  private async handleMessage(message: TwilioMediaMessage): Promise<void> {
    logger.debug('Received message', { 
      event: message.event, 
      connectionId: this.connectionId 
    });

    switch (message.event) {
      case 'connected':
        logger.info('Twilio Media Stream connected', { 
          connectionId: this.connectionId 
        });
        break;

      case 'start':
        await this.handleStart(message);
        break;

      case 'media':
        await this.handleMedia(message);
        break;

      case 'mark':
        await this.handleMark(message);
        break;

      case 'stop':
        await this.handleStop(message);
        break;

      case 'closed':
        logger.info('Stream closed by Twilio', { 
          connectionId: this.connectionId 
        });
        break;

      default:
        logger.warn('Unknown message event', { 
          event: message.event, 
          connectionId: this.connectionId 
        });
    }
  }

  /**
   * Handle stream start event
   */
  private async handleStart(message: TwilioMediaMessage): Promise<void> {
    if (!message.start) {
      logger.error('Start message missing start data');
      return;
    }

    this.streamSid = message.start.streamSid;
    this.callSid = message.start.callSid;

    logger.info('Stream started', {
      streamSid: this.streamSid,
      callSid: this.callSid,
      accountSid: message.start.accountSid,
      customParameters: message.start.customParameters
    });

    try {
      // Extract assistant ID from custom parameters
      const assistantId = message.start.customParameters?.assistantId;
      const userId = message.start.customParameters?.userId;
      const organizationId = message.start.customParameters?.organizationId;

      if (!assistantId) {
        logger.error('Missing assistantId in custom parameters');
        this.sendErrorToTwilio('Missing assistant configuration');
        return;
      }

      // Create call session
      this.callSession = new CallSessionManager(
        this.connectionId,
        this.streamSid,
        this.callSid,
        message.start.accountSid,
        assistantId,
        userId || 'unknown',
        organizationId || 'unknown',
        message.start.customParameters?.from || 'unknown',
        message.start.customParameters?.to || 'unknown',
        this.config,
        this
      );

      // Initialize the session
      await this.callSession.initialize();

      // Store session reference
      setSession(this.connectionId, this.callSession.getState());

      // Emit event
      emitEvent({
        type: 'call.started',
        payload: this.callSession.getSession()
      });

    } catch (error) {
      logger.error('Failed to initialize call session', { error });
      this.sendErrorToTwilio('Failed to initialize call');
    }
  }

  /**
   * Handle media (audio) from Twilio
   */
  private async handleMedia(message: TwilioMediaMessage): Promise<void> {
    if (!this.callSession || !message.media) {
      return;
    }

    // Only process inbound audio (from caller)
    if (message.media.track !== 'inbound') {
      return;
    }

    // Get audio payload
    const payload = message.media.payload || message.media.chunk;
    if (!payload) {
      return;
    }

    // Send audio to call session for processing
    await this.callSession.processInboundAudio(payload);
  }

  /**
   * Handle mark events (for tracking audio playback)
   */
  private async handleMark(message: TwilioMediaMessage): Promise<void> {
    if (!message.mark || !this.callSession) {
      return;
    }

    const markName = message.mark.name;
    logger.debug('Received mark', { markName });

    // Remove from queue
    const index = this.markQueue.indexOf(markName);
    if (index !== -1) {
      this.markQueue.splice(index, 1);
    }

    // Notify call session
    this.callSession.handleMark(markName);
  }

  /**
   * Handle stream stop event
   */
  private async handleStop(message: TwilioMediaMessage): Promise<void> {
    logger.info('Stream stopped', { 
      streamSid: this.streamSid,
      callSid: this.callSid
    });

    await this.cleanup();
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(): void {
    this.cleanup();
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    try {
      if (this.callSession) {
        await this.callSession.terminate();
        
        // Emit event
        const session = this.callSession.getSession();
        emitEvent({
          type: 'call.ended',
          payload: {
            callId: session.id,
            duration: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
            cost: session.cost
          }
        });

        this.callSession = null;
      }

      // Remove session from global map
      removeSession(this.connectionId);

    } catch (error) {
      logger.error('Error during cleanup', { error });
    }
  }

  /**
   * Send audio back to Twilio
   */
  sendAudio(base64Mulaw: string, isLast: boolean = false): void {
    if (this.isDestroyed || !this.streamSid) {
      return;
    }

    const markName = isLast ? `end-${Date.now()}` : `audio-${++this.lastMarkIndex}`;
    
    if (!isLast) {
      this.markQueue.push(markName);
    }

    const response: TwilioMediaResponse = {
      event: 'media',
      streamSid: this.streamSid,
      media: {
        payload: base64Mulaw
      }
    };

    this.sendMessage(response);

    // Send mark for tracking
    if (!isLast) {
      this.sendMark(markName);
    }
  }

  /**
   * Send a mark message to Twilio
   */
  private sendMark(markName: string): void {
    if (this.isDestroyed || !this.streamSid) {
      return;
    }

    const response: TwilioMediaResponse = {
      event: 'mark',
      streamSid: this.streamSid,
      mark: {
        name: markName
      }
    };

    this.sendMessage(response);
  }

  /**
   * Clear the audio buffer in Twilio
   */
  clearAudioBuffer(): void {
    if (this.isDestroyed || !this.streamSid) {
      return;
    }

    const response: TwilioMediaResponse = {
      event: 'clear',
      streamSid: this.streamSid
    };

    this.sendMessage(response);
    this.markQueue = [];
  }

  /**
   * Send a message to Twilio
   */
  private sendMessage(message: TwilioMediaResponse): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to Twilio
   */
  private sendErrorToTwilio(errorMessage: string): void {
    logger.error('Sending error to Twilio', { errorMessage });
    
    // In a real implementation, you might want to:
    // 1. Play an error message to the caller
    // 2. End the call gracefully
    // 3. Log the error for monitoring
  }

  /**
   * Get the number of pending audio marks
   */
  getPendingMarkCount(): number {
    return this.markQueue.length;
  }

  /**
   * Check if handler is destroyed
   */
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }

  /**
   * Get stream SID
   */
  getStreamSid(): string | null {
    return this.streamSid;
  }

  /**
   * Get call SID
   */
  getCallSid(): string | null {
    return this.callSid;
  }

  /**
   * Destroy the handler
   */
  destroy(): void {
    this.cleanup();
  }
}

/**
 * Create a new Twilio WebSocket handler
 */
export function createTwilioWebSocketHandler(
  ws: WebSocket,
  connectionId: string,
  config: VoiceEngineConfig
): TwilioWebSocketHandler {
  return new TwilioWebSocketHandler(ws, connectionId, config);
}
