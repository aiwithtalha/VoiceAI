/**
 * ElevenLabs Text-to-Speech Provider
 * Streaming TTS with multiple voice options
 * Outputs audio in format compatible with Twilio
 */

import { ElevenLabsClient } from 'elevenlabs';
import { 
  TTSConfig, 
  ElevenLabsVoiceSettings,
  VoiceConfig 
} from '../types';
import { Logger } from '../utils/logger';

const logger = new Logger('ElevenLabsProvider');

export interface ElevenLabsCallbacks {
  onAudio: (audioChunk: Buffer, isLast: boolean) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export class ElevenLabsProvider {
  private client: ElevenLabsClient;
  private config: TTSConfig;
  private voiceConfig: VoiceConfig;
  private callbacks: ElevenLabsCallbacks;
  private isStreaming = false;
  private audioQueue: Buffer[] = [];
  private currentText = '';

  constructor(apiKey: string, config: TTSConfig, voiceConfig: VoiceConfig, callbacks: ElevenLabsCallbacks) {
    this.client = new ElevenLabsClient({ apiKey });
    this.config = config;
    this.voiceConfig = voiceConfig;
    this.callbacks = callbacks;
  }

  /**
   * Build voice settings from configuration
   */
  private getVoiceSettings(): ElevenLabsVoiceSettings {
    return {
      stability: this.voiceConfig.stability ?? 0.5,
      similarity_boost: this.voiceConfig.similarityBoost ?? 0.75,
      style: this.voiceConfig.style ?? 0,
      use_speaker_boost: this.voiceConfig.useSpeakerBoost ?? true
    };
  }

  /**
   * Stream text-to-speech conversion
   * @param text Text to convert to speech
   */
  async streamTTS(text: string): Promise<void> {
    if (this.isStreaming) {
      logger.warn('Already streaming TTS, queueing text');
      this.currentText += ' ' + text;
      return;
    }

    this.isStreaming = true;
    this.currentText = text;

    try {
      logger.info('Starting TTS stream', { 
        textLength: text.length,
        voiceId: this.config.voiceId,
        model: this.config.model
      });

      const voiceSettings = this.getVoiceSettings();

      // Stream audio from ElevenLabs
      const audioStream = await this.client.generate({
        voice: this.config.voiceId,
        text: text,
        model_id: this.config.model || 'eleven_turbo_v2_5',
        voice_settings: voiceSettings,
        optimize_streaming_latency: this.config.optimizeStreamingLatency ?? 3,
        output_format: 'pcm_8000', // 8kHz PCM for Twilio compatibility
        stream: true
      });

      let chunkIndex = 0;

      // Process audio chunks as they arrive
      for await (const chunk of audioStream) {
        const audioBuffer = Buffer.from(chunk);
        
        logger.debug('Received TTS audio chunk', { 
          chunkIndex, 
          size: audioBuffer.length 
        });

        // Convert PCM to mu-law for Twilio
        const mulawBuffer = this.pcmToMulaw(audioBuffer);
        
        // Call callback with audio
        this.callbacks.onAudio(mulawBuffer, false);
        
        chunkIndex++;
      }

      logger.info('TTS stream completed', { 
        chunks: chunkIndex,
        textLength: text.length
      });

      // Signal completion
      this.callbacks.onAudio(Buffer.alloc(0), true);
      this.callbacks.onComplete();

    } catch (error) {
      logger.error('TTS stream error', { error, text });
      this.callbacks.onError(error as Error);
    } finally {
      this.isStreaming = false;
      this.currentText = '';
    }
  }

  /**
   * Generate non-streaming TTS
   * Useful for short responses
   */
  async generateTTS(text: string): Promise<Buffer> {
    try {
      logger.info('Generating TTS', { 
        textLength: text.length,
        voiceId: this.config.voiceId
      });

      const voiceSettings = this.getVoiceSettings();

      const audioStream = await this.client.generate({
        voice: this.config.voiceId,
        text: text,
        model_id: this.config.model || 'eleven_turbo_v2_5',
        voice_settings: voiceSettings,
        optimize_streaming_latency: this.config.optimizeStreamingLatency ?? 3,
        output_format: 'pcm_8000',
        stream: false
      });

      // Collect all audio chunks
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }

      const pcmBuffer = Buffer.concat(chunks);
      const mulawBuffer = this.pcmToMulaw(pcmBuffer);

      logger.info('TTS generation completed', { 
        pcmSize: pcmBuffer.length,
        mulawSize: mulawBuffer.length
      });

      return mulawBuffer;

    } catch (error) {
      logger.error('TTS generation error', { error, text });
      throw error;
    }
  }

  /**
   * Convert PCM audio to mu-law for Twilio
   * @param pcmBuffer 16-bit PCM audio buffer
   * @returns mu-law encoded buffer
   */
  private pcmToMulaw(pcmBuffer: Buffer): Buffer {
    const mulawBuffer = Buffer.alloc(pcmBuffer.length / 2);
    
    for (let i = 0; i < mulawBuffer.length; i++) {
      const pcmSample = pcmBuffer.readInt16LE(i * 2);
      mulawBuffer[i] = this.linearToMulaw(pcmSample);
    }
    
    return mulawBuffer;
  }

  /**
   * Convert a linear PCM sample to mu-law
   */
  private linearToMulaw(sample: number): number {
    const MULAW_BIAS = 0x84;
    const MULAW_ENCODE_TABLE: number[] = [
      0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3,
      4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
      5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
      5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
      6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
      6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
      6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
      6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
      7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
      7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
      7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
      7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
      7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
      7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
      7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
      7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7
    ];
    
    let mask: number;
    
    if (sample < 0) {
      sample = MULAW_BIAS - sample;
      mask = 0x7f;
    } else {
      sample = MULAW_BIAS + sample;
      mask = 0xff;
    }
    
    let seg = MULAW_ENCODE_TABLE[(sample >> 8) & 0x7f];
    
    if (seg >= 8) {
      return (0x7f ^ mask) as number;
    }
    
    const uval = (seg << 4) | ((sample >> (seg + 3)) & 0xf);
    return (uval ^ mask) as number;
  }

  /**
   * Convert mu-law buffer to base64 string for Twilio
   */
  mulawToBase64(mulawBuffer: Buffer): string {
    return mulawBuffer.toString('base64');
  }

  /**
   * Check if currently streaming
   */
  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Get current text being processed
   */
  getCurrentText(): string {
    return this.currentText;
  }

  /**
   * Stop the current TTS stream
   */
  stop(): void {
    if (this.isStreaming) {
      logger.info('Stopping TTS stream');
      this.isStreaming = false;
      this.currentText = '';
    }
  }

  /**
   * Update voice configuration
   */
  updateVoiceConfig(config: Partial<VoiceConfig>): void {
    this.voiceConfig = { ...this.voiceConfig, ...config };
    logger.info('Voice configuration updated', { config });
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<Array<{ voice_id: string; name: string }>> {
    try {
      const voices = await this.client.voices.getAll();
      return voices.voices.map(v => ({
        voice_id: v.voice_id,
        name: v.name
      }));
    } catch (error) {
      logger.error('Failed to get voices', { error });
      return [];
    }
  }

  /**
   * Get voice settings for a specific voice
   */
  async getVoiceSettings(voiceId: string): Promise<ElevenLabsVoiceSettings | null> {
    try {
      const settings = await this.client.voices.getSettings(voiceId);
      return settings;
    } catch (error) {
      logger.error('Failed to get voice settings', { error, voiceId });
      return null;
    }
  }
}

/**
 * Create a new ElevenLabs provider instance
 */
export function createElevenLabsProvider(
  apiKey: string,
  config: TTSConfig,
  voiceConfig: VoiceConfig,
  callbacks: ElevenLabsCallbacks
): ElevenLabsProvider {
  return new ElevenLabsProvider(apiKey, config, voiceConfig, callbacks);
}

/**
 * Predefined voice IDs for common use cases
 */
export const ELEVENLABS_VOICES = {
  // Professional voices
  RACHEL: '21m00Tcm4TlvDq8ikWAM',
  ADAM: 'pNInz6obpgDQGcFmaJgB',
  ANTONI: 'ErXwobaYiN019PkySvjV',
  
  // Call center optimized
  CALLUM: 'N2lVS1w4EtoT3dr4eOWO',
  CHARLOTTE: 'XB0fDUnXU5powFXDhCwa',
  
  // Friendly voices
  BELLA: 'EXAVITQu4vr4xnSDxMaL',
  JOSH: 'TxGEqnHWrfWFTfGW9XjX',
  
  // Authoritative voices
  DANIEL: 'onwK4e9ZLuTAKqWW03F9',
  DOROTHY: 'ThT5KcBeYPX3keUQqHPh'
};

/**
 * Get voice ID by name
 */
export function getVoiceIdByName(name: string): string | undefined {
  const upperName = name.toUpperCase();
  return (ELEVENLABS_VOICES as Record<string, string>)[upperName];
}
