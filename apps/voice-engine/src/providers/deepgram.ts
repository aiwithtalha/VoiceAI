/**
 * Deepgram Speech-to-Text Provider
 * Streaming STT with Nova-2-phonecall model
 * Supports live transcription, interim results, and endpointing
 */

import { createClient, LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { 
  DeepgramTranscript, 
  DeepgramWord,
  STTConfig,
  DeepgramConnection 
} from '../types';
import { Logger } from '../utils/logger';

const logger = new Logger('DeepgramProvider');

export interface DeepgramCallbacks {
  onTranscript: (transcript: string, isFinal: boolean, words: DeepgramWord[]) => void;
  onSpeechStarted: () => void;
  onSpeechEnded: () => void;
  onUtteranceEnd: () => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export class DeepgramProvider {
  private client: ReturnType<typeof createClient>;
  private connection: LiveClient | null = null;
  private config: STTConfig;
  private callbacks: DeepgramCallbacks;
  private isConnected = false;
  private currentTranscript = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  constructor(apiKey: string, config: STTConfig, callbacks: DeepgramCallbacks) {
    this.client = createClient(apiKey);
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Connect to Deepgram live transcription API
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Deepgram...', { 
        model: this.config.model,
        language: this.config.language 
      });

      // Build options for live transcription
      const options: any = {
        model: this.config.model || 'nova-2-phonecall',
        language: this.config.language || 'en-US',
        smart_format: this.config.smartFormatting ?? true,
        punctuate: this.config.punctuate ?? true,
        profanity_filter: this.config.profanityFilter ?? false,
        interim_results: this.config.interimResults ?? true,
        encoding: 'linear16',
        sample_rate: 8000,
        channels: 1,
        endpointing: this.config.endpointing === true ? 300 : 
                     typeof this.config.endpointing === 'number' ? this.config.endpointing : 
                     300,
        vad_events: true,
        utterance_end_ms: 1000,
      };

      this.connection = this.client.listen.live(options);
      this.setupEventHandlers();

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Deepgram connection timeout'));
        }, 10000);

        this.connection?.once(LiveTranscriptionEvents.Open, () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.info('Deepgram connection opened');
          resolve();
        });

        this.connection?.once(LiveTranscriptionEvents.Error, (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      logger.error('Failed to connect to Deepgram', { error });
      throw error;
    }
  }

  /**
   * Set up event handlers for the Deepgram connection
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Handle transcription results
    this.connection.on(LiveTranscriptionEvents.Transcript, (data: DeepgramTranscript) => {
      this.handleTranscript(data);
    });

    // Handle speech started event
    this.connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
      logger.debug('Speech started detected');
      this.callbacks.onSpeechStarted();
    });

    // Handle speech ended event
    this.connection.on(LiveTranscriptionEvents.SpeechEnded, () => {
      logger.debug('Speech ended detected');
      this.callbacks.onSpeechEnded();
    });

    // Handle utterance end event
    this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      logger.debug('Utterance end detected');
      this.callbacks.onUtteranceEnd();
    });

    // Handle metadata
    this.connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      logger.debug('Received metadata', { data });
    });

    // Handle errors
    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      logger.error('Deepgram error', { error });
      this.callbacks.onError(error);
    });

    // Handle close
    this.connection.on(LiveTranscriptionEvents.Close, () => {
      logger.info('Deepgram connection closed');
      this.isConnected = false;
      this.callbacks.onClose();
      
      // Attempt reconnection if needed
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnection();
      }
    });
  }

  /**
   * Handle transcription data from Deepgram
   */
  private handleTranscript(data: DeepgramTranscript): void {
    try {
      if (data.type === 'Results' && data.channel) {
        const alternative = data.channel.alternatives[0];
        if (!alternative) return;

        const transcript = alternative.transcript;
        const isFinal = data.is_final || false;
        const words = alternative.words || [];

        // Log transcript details
        logger.debug('Transcript received', { 
          transcript, 
          isFinal, 
          confidence: alternative.confidence,
          wordCount: words.length
        });

        // Update current transcript
        if (isFinal) {
          this.currentTranscript += (this.currentTranscript ? ' ' : '') + transcript;
        }

        // Call the transcript callback
        this.callbacks.onTranscript(transcript, isFinal, words);
      }
    } catch (error) {
      logger.error('Error handling transcript', { error, data });
    }
  }

  /**
   * Attempt to reconnect to Deepgram
   */
  private async attemptReconnection(): Promise<void> {
    this.reconnectAttempts++;
    logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    try {
      await this.connect();
    } catch (error) {
      logger.error('Reconnection failed', { error });
    }
  }

  /**
   * Send audio data to Deepgram for transcription
   * @param audioData Raw PCM audio data (16-bit, 8kHz, mono)
   */
  sendAudio(audioData: Buffer): void {
    if (!this.isConnected || !this.connection) {
      logger.warn('Cannot send audio: Deepgram not connected');
      return;
    }

    try {
      // Send audio chunk
      this.connection.send(audioData);
    } catch (error) {
      logger.error('Error sending audio to Deepgram', { error });
    }
  }

  /**
   * Send audio data from base64 encoded mulaw (from Twilio)
   * @param base64Mulaw Base64 encoded mu-law audio
   */
  sendMulawAudio(base64Mulaw: string): void {
    // Convert mu-law to PCM
    const mulawBuffer = Buffer.from(base64Mulaw, 'base64');
    const pcmBuffer = this.mulawToPcm(mulawBuffer);
    this.sendAudio(pcmBuffer);
  }

  /**
   * Convert mu-law to linear PCM (16-bit)
   */
  private mulawToPcm(mulawBuffer: Buffer): Buffer {
    const pcmBuffer = Buffer.alloc(mulawBuffer.length * 2);
    
    for (let i = 0; i < mulawBuffer.length; i++) {
      const mulawByte = mulawBuffer[i];
      const pcmSample = this.decodeMulaw(mulawByte);
      pcmBuffer.writeInt16LE(pcmSample, i * 2);
    }
    
    return pcmBuffer;
  }

  /**
   * Decode a single mu-law byte to 16-bit PCM
   */
  private decodeMulaw(mulaw: number): number {
    // mu-law decoding table lookup
    const MULAW_DECODE_TABLE: number[] = [
      0x8284, 0x8684, 0x8a84, 0x8e84, 0x9284, 0x9684, 0x9a84, 0x9e84,
      0xa284, 0xa684, 0xaa84, 0xae84, 0xb284, 0xb684, 0xba84, 0xbe84,
      0xc184, 0xc384, 0xc584, 0xc784, 0xc984, 0xcb84, 0xcd84, 0xcf84,
      0xd184, 0xd384, 0xd584, 0xd784, 0xd984, 0xdb84, 0xdd84, 0xdf84,
      0xe104, 0xe204, 0xe304, 0xe404, 0xe504, 0xe604, 0xe704, 0xe804,
      0xe904, 0xea04, 0xeb04, 0xec04, 0xed04, 0xee04, 0xef04, 0xf004,
      0xf0c4, 0xf144, 0xf1c4, 0xf244, 0xf2c4, 0xf344, 0xf3c4, 0xf444,
      0xf4c4, 0xf544, 0xf5c4, 0xf644, 0xf6c4, 0xf744, 0xf7c4, 0xf844,
      0xf8a4, 0xf8e4, 0xf924, 0xf964, 0xf9a4, 0xf9e4, 0xfa24, 0xfa64,
      0xfaa4, 0xfae4, 0xfb24, 0xfb64, 0xfba4, 0xfbe4, 0xfc24, 0xfc64,
      0xfc94, 0xfcb4, 0xfcd4, 0xfcf4, 0xfd14, 0xfd34, 0xfd54, 0xfd74,
      0xfd94, 0xfdb4, 0xfdd4, 0xfdf4, 0xfe14, 0xfe34, 0xfe54, 0xfe74,
      0xfe94, 0xfea4, 0xfeb4, 0xfec4, 0xfed4, 0xfee4, 0xfef4, 0xff04,
      0xff14, 0xff24, 0xff34, 0xff44, 0xff54, 0xff64, 0xff74, 0xff84,
      0xff94, 0xffa4, 0xffb4, 0xffc4, 0xffd4, 0xffe4, 0xfff4, 0x0004,
      0x7f7c, 0x7b7c, 0x777c, 0x737c, 0x6f7c, 0x6b7c, 0x677c, 0x637c,
      0x5f7c, 0x5b7c, 0x577c, 0x537c, 0x4f7c, 0x4b7c, 0x477c, 0x437c,
      0x407c, 0x3e7c, 0x3c7c, 0x3a7c, 0x387c, 0x367c, 0x347c, 0x327c,
      0x307c, 0x2e7c, 0x2c7c, 0x2a7c, 0x287c, 0x267c, 0x247c, 0x227c,
      0x20fc, 0x1ffc, 0x1efc, 0x1dfc, 0x1cfc, 0x1bfc, 0x1afc, 0x19fc,
      0x18fc, 0x17fc, 0x16fc, 0x15fc, 0x14fc, 0x13fc, 0x12fc, 0x11fc,
      0x113c, 0x10bc, 0x103c, 0x0fbc, 0x0f3c, 0x0ebc, 0x0e3c, 0x0dbc,
      0x0d3c, 0x0cbc, 0x0c3c, 0x0bbc, 0x0b3c, 0x0abc, 0x0a3c, 0x09bc,
      0x095c, 0x091c, 0x08dc, 0x089c, 0x085c, 0x081c, 0x07dc, 0x079c,
      0x075c, 0x071c, 0x06dc, 0x069c, 0x065c, 0x061c, 0x05dc, 0x059c,
      0x056c, 0x054c, 0x052c, 0x050c, 0x04ec, 0x04cc, 0x04ac, 0x048c,
      0x046c, 0x044c, 0x042c, 0x040c, 0x03ec, 0x03cc, 0x03ac, 0x038c,
      0x036c, 0x035c, 0x034c, 0x033c, 0x032c, 0x031c, 0x030c, 0x02fc,
      0x02ec, 0x02dc, 0x02cc, 0x02bc, 0x02ac, 0x029c, 0x028c, 0x027c,
      0x026c, 0x025c, 0x024c, 0x023c, 0x022c, 0x021c, 0x020c, 0x01fc,
      0x01ec, 0x01dc, 0x01cc, 0x01bc, 0x01ac, 0x019c, 0x018c, 0x017c,
      0x016c, 0x015c, 0x014c, 0x013c, 0x012c, 0x011c, 0x010c, 0x00fc
    ];
    
    return MULAW_DECODE_TABLE[mulaw];
  }

  /**
   * Get the current accumulated transcript
   */
  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  /**
   * Clear the current transcript
   */
  clearTranscript(): void {
    this.currentTranscript = '';
  }

  /**
   * Check if connected to Deepgram
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection state for external use
   */
  getConnectionState(): DeepgramConnection {
    return {
      connection: this.connection,
      isConnected: this.isConnected,
      lastTranscriptAt: undefined,
      currentTranscript: this.currentTranscript
    };
  }

  /**
   * Finish the transcription and close the connection
   */
  async finish(): Promise<void> {
    if (!this.connection) return;

    try {
      // Send finalize signal
      this.connection.finalize();
      
      // Wait a bit for final transcripts
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Close connection
      this.connection.requestClose();
      this.isConnected = false;
      
      logger.info('Deepgram connection finished');
    } catch (error) {
      logger.error('Error finishing Deepgram connection', { error });
    }
  }

  /**
   * Force close the connection
   */
  close(): void {
    if (!this.connection) return;

    try {
      this.connection.requestClose();
      this.isConnected = false;
      logger.info('Deepgram connection closed');
    } catch (error) {
      logger.error('Error closing Deepgram connection', { error });
    }
  }
}

/**
 * Create a new Deepgram provider instance
 */
export function createDeepgramProvider(
  apiKey: string,
  config: STTConfig,
  callbacks: DeepgramCallbacks
): DeepgramProvider {
  return new DeepgramProvider(apiKey, config, callbacks);
}
