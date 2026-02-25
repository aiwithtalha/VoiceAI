/**
 * Universal Voice AI Platform - ElevenLabs TTS Provider
 * 
 * Implementation of the TtsProvider interface for ElevenLabs.
 */

import {
  TtsProvider,
  Voice,
  TtsOptions,
  StreamingTtsOptions,
  ProviderConfig,
  ProviderHealth,
} from './base';
import logger from '../../utils/logger';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

export class ElevenLabsProvider implements TtsProvider {
  readonly name = 'elevenlabs';
  private config: ProviderConfig;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
    
    if (!config.apiKey) {
      throw new Error('ElevenLabs requires an API key');
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.config.apiKey!,
        },
      });
      
      if (response.ok) {
        return {
          status: 'healthy',
          latencyMs: Date.now() - startTime,
          lastCheckedAt: new Date(),
        };
      } else {
        return {
          status: 'degraded',
          latencyMs: Date.now() - startTime,
          lastCheckedAt: new Date(),
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        lastCheckedAt: new Date(),
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // List Voices
  // ============================================================================

  async listVoices(language?: string): Promise<Voice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.config.apiKey!,
        },
      });
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      
      const data = await response.json() as { voices: ElevenLabsVoice[] };
      
      return data.voices.map((v) => ({
        id: v.voice_id,
        name: v.name,
        gender: this.inferGender(v.labels),
        language: v.labels?.language || language || 'en',
        accent: v.labels?.accent,
        age: this.inferAge(v.labels),
        previewUrl: v.preview_url,
      }));
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to list ElevenLabs voices');
      throw error;
    }
  }

  // ============================================================================
  // Synthesize Speech
  // ============================================================================

  async synthesize(
    text: string,
    options: TtsOptions
  ): Promise<{
    audioData: Buffer;
    duration: number;
    format: string;
  }> {
    logger.debug({ voiceId: options.voiceId, textLength: text.length }, 'Synthesizing speech with ElevenLabs');
    
    const modelId = 'eleven_multilingual_v2';
    const outputFormat = this.mapFormat(options.format);
    
    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${options.voiceId}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: options.speed ? Math.max(0, Math.min(1, 1 - (options.speed - 1) * 0.5)) : 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs synthesis error: ${error}`);
    }
    
    const audioData = Buffer.from(await response.arrayBuffer());
    
    // Estimate duration based on text length (rough approximation)
    const estimatedDuration = this.estimateDuration(text);
    
    return {
      audioData,
      duration: estimatedDuration,
      format: options.format || 'mp3',
    };
  }

  // ============================================================================
  // Streaming Synthesis
  // ============================================================================

  async synthesizeStream(
    text: string,
    options: StreamingTtsOptions,
    onChunk: (chunk: Buffer) => void,
    onError: (error: Error) => void
  ): Promise<{
    duration: number;
    totalBytes: number;
  }> {
    logger.debug({ voiceId: options.voiceId, textLength: text.length }, 'Streaming speech synthesis with ElevenLabs');
    
    const modelId = 'eleven_multilingual_v2';
    const outputFormat = this.mapFormat(options.format);
    
    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${options.voiceId}/stream?output_format=${outputFormat}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.config.apiKey!,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: options.speed ? Math.max(0, Math.min(1, 1 - (options.speed - 1) * 0.5)) : 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`ElevenLabs streaming error: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      let totalBytes = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        totalBytes += value.length;
        onChunk(Buffer.from(value));
      }
      
      const estimatedDuration = this.estimateDuration(text);
      
      return {
        duration: estimatedDuration,
        totalBytes,
      };
    } catch (error) {
      onError(error as Error);
      throw error;
    }
  }

  // ============================================================================
  // Get Voice
  // ============================================================================

  async getVoice(voiceId: string): Promise<Voice | null> {
    try {
      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.config.apiKey!,
        },
      });
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      
      const data = await response.json() as { voice_id: string; name: string; labels?: Record<string, string>; preview_url?: string };
      
      return {
        id: data.voice_id,
        name: data.name,
        gender: this.inferGender(data.labels),
        language: data.labels?.language || 'en',
        accent: data.labels?.accent,
        age: this.inferAge(data.labels),
        previewUrl: data.preview_url,
      };
    } catch (error) {
      logger.error({ error: (error as Error).message, voiceId }, 'Failed to get ElevenLabs voice');
      throw error;
    }
  }

  // ============================================================================
  // Clone Voice
  // ============================================================================

  async cloneVoice(name: string, samples: Buffer[]): Promise<Voice> {
    if (samples.length === 0) {
      throw new Error('At least one voice sample is required');
    }
    
    const formData = new FormData();
    formData.append('name', name);
    
    samples.forEach((sample, index) => {
      const blob = new Blob([sample], { type: 'audio/mpeg' });
      formData.append('files', blob, `sample_${index}.mp3`);
    });
    
    const response = await fetch(`${this.baseUrl}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.config.apiKey!,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voice cloning failed: ${error}`);
    }
    
    const data = await response.json() as { voice_id: string };
    
    return {
      id: data.voice_id,
      name,
      gender: 'neutral',
      language: 'en',
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapFormat(format?: string): string {
    const formatMap: Record<string, string> = {
      'mp3': 'mp3_44100_128',
      'wav': 'pcm_24000',
      'ogg': 'ogg_vorbis_44100_128',
      'pcm': 'pcm_24000',
    };
    
    return formatMap[format || 'mp3'] || 'mp3_44100_128';
  }

  private estimateDuration(text: string): number {
    // Average speaking rate: ~150 words per minute
    // Average word length: ~5 characters
    const wordCount = text.split(/\s+/).length;
    return Math.ceil((wordCount / 150) * 60);
  }

  private inferGender(labels?: Record<string, string>): 'male' | 'female' | 'neutral' {
    const gender = labels?.gender?.toLowerCase();
    if (gender === 'male') return 'male';
    if (gender === 'female') return 'female';
    return 'neutral';
  }

  private inferAge(labels?: Record<string, string>): 'child' | 'young' | 'middle' | 'senior' | undefined {
    const age = labels?.age?.toLowerCase();
    if (age?.includes('child')) return 'child';
    if (age?.includes('young')) return 'young';
    if (age?.includes('middle')) return 'middle';
    if (age?.includes('senior') || age?.includes('old')) return 'senior';
    return undefined;
  }
}

// Register the provider
import { providerRegistry } from './base';
providerRegistry.registerTts('elevenlabs', ElevenLabsProvider);
