/**
 * Universal Voice AI Platform - Deepgram STT Provider
 * 
 * Implementation of the SttProvider interface for Deepgram.
 */

import WebSocket from 'ws';
import {
  SttProvider,
  TranscriptionResult,
  TranscribedWord,
  StreamingTranscriptionConfig,
  BatchTranscriptionConfig,
  ProviderConfig,
  ProviderHealth,
} from './base';
import logger from '../../utils/logger';

interface DeepgramResponse {
  type: string;
  channel?: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
      words: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>;
  };
  is_final?: boolean;
  speech_final?: boolean;
}

export class DeepgramProvider implements SttProvider {
  readonly name = 'deepgram';
  private config: ProviderConfig;
  private baseUrl = 'https://api.deepgram.com/v1';
  private wsUrl = 'wss://api.deepgram.com/v1';

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
    
    if (!config.apiKey) {
      throw new Error('Deepgram requires an API key');
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
        headers: {
          Authorization: `Token ${this.config.apiKey}`,
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
  // Streaming Transcription
  // ============================================================================

  async createStreamingConnection(
    config: StreamingTranscriptionConfig,
    onResult: (result: TranscriptionResult) => void,
    onError: (error: Error) => void
  ): Promise<{
    sendAudio: (audioData: Buffer) => void;
    close: () => void;
  }> {
    const params = new URLSearchParams({
      model: config.model || 'nova-2',
      language: config.language,
      interim_results: String(config.interimResults ?? true),
      punctuate: String(config.punctuate ?? true),
      profanity_filter: String(config.profanityFilter ?? false),
      diarize: String(config.diarize ?? false),
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
    });
    
    if (config.numSpeakers) {
      params.append('diarize_version', '2021-07-14.0');
    }
    
    if (config.keywords && config.keywords.length > 0) {
      config.keywords.forEach((keyword) => {
        params.append('keywords', keyword);
      });
    }
    
    const wsUrl = `${this.wsUrl}/listen?${params.toString()}`;
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Token ${this.config.apiKey}`,
      },
    });
    
    ws.on('open', () => {
      logger.info('Deepgram streaming connection opened');
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const response: DeepgramResponse = JSON.parse(data.toString());
        
        if (response.type === 'Results' && response.channel) {
          const alternative = response.channel.alternatives[0];
          
          const result: TranscriptionResult = {
            text: alternative.transcript,
            confidence: alternative.confidence,
            isFinal: response.is_final || false,
            words: alternative.words.map((w) => ({
              word: w.word,
              startTime: w.start,
              endTime: w.end,
              confidence: w.confidence,
            })),
            language: config.language,
          };
          
          onResult(result);
        }
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Failed to parse Deepgram response');
      }
    });
    
    ws.on('error', (error) => {
      logger.error({ error: error.message }, 'Deepgram WebSocket error');
      onError(error);
    });
    
    ws.on('close', () => {
      logger.info('Deepgram streaming connection closed');
    });
    
    return {
      sendAudio: (audioData: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(audioData);
        }
      },
      close: () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'CloseStream' }));
          setTimeout(() => ws.close(), 1000);
        }
      },
    };
  }

  // ============================================================================
  // Batch Transcription
  // ============================================================================

  async transcribeAudio(
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
  }> {
    const params = new URLSearchParams({
      model: config.model || 'nova-2',
      language: config.language,
      punctuate: String(config.punctuate ?? true),
      paragraphs: String(config.paragraphs ?? false),
      utterances: String(config.utterances ?? false),
      diarize: String(config.diarize ?? false),
      sentiment: String(config.sentiment ?? false),
      topics: String(config.topics ?? false),
      summarize: String(config.summaries ?? false),
    });
    
    if (config.numSpeakers) {
      params.append('diarize_version', '2021-07-14.0');
    }
    
    const response = await fetch(`${this.baseUrl}/listen?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: audioUrl }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepgram API error: ${error}`);
    }
    
    const data = await response.json();
    
    // Deepgram returns results immediately for URL-based transcription
    const alternative = data.results?.channels?.[0]?.alternatives?.[0];
    
    return {
      id: data.metadata?.request_id || `dg_${Date.now()}`,
      status: 'completed',
      result: alternative ? {
        text: alternative.transcript,
        confidence: alternative.confidence,
        words: alternative.words?.map((w: { word: string; start: number; end: number; confidence: number }) => ({
          word: w.word,
          startTime: w.start,
          endTime: w.end,
          confidence: w.confidence,
        })) || [],
        paragraphs: alternative.paragraphs?.map((p: { sentences: Array<{ text: string; start: number; end: number }> }) => ({
          text: p.sentences.map((s) => s.text).join(' '),
          start: p.sentences[0]?.start || 0,
          end: p.sentences[p.sentences.length - 1]?.end || 0,
        })),
        utterances: data.results?.utterances?.map((u: { speaker: number; transcript: string; start: number; end: number }) => ({
          speaker: `speaker_${u.speaker}`,
          text: u.transcript,
          start: u.start,
          end: u.end,
        })),
        sentiment: data.results?.sentiment?.overall?.sentiment,
        topics: data.results?.topics?.map((t: { topic: string }) => t.topic),
        summary: data.results?.summary?.short,
      } : undefined,
    };
  }

  // ============================================================================
  // Get Transcription
  // ============================================================================

  async getTranscription(transcriptionId: string): Promise<{
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    result?: TranscriptionResult;
  }> {
    // Deepgram doesn't have a separate endpoint for checking transcription status
    // Results are returned immediately or via callback
    // This is a placeholder for consistency with the interface
    
    return {
      id: transcriptionId,
      status: 'completed',
    };
  }

  // ============================================================================
  // Supported Languages
  // ============================================================================

  getSupportedLanguages(): string[] {
    return [
      'en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NZ',
      'es', 'es-ES', 'es-LATAM',
      'fr', 'fr-FR', 'fr-CA',
      'de', 'de-DE',
      'it', 'it-IT',
      'pt', 'pt-BR', 'pt-PT',
      'nl', 'nl-NL',
      'hi', 'hi-IN',
      'ja', 'ja-JP',
      'ko', 'ko-KR',
      'zh', 'zh-CN',
      'ru', 'ru-RU',
      'tr', 'tr-TR',
      'pl', 'pl-PL',
      'sv', 'sv-SE',
      'da', 'da-DK',
      'no', 'no-NO',
      'fi', 'fi-FI',
    ];
  }
}

// Register the provider
import { providerRegistry } from './base';
providerRegistry.registerStt('deepgram', DeepgramProvider);
