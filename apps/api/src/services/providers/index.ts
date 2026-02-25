/**
 * Universal Voice AI Platform - Provider Exports
 * 
 * Centralized exports for all provider implementations.
 */

// Base interfaces and registry
export {
  // Types
  ProviderConfig,
  ProviderHealth,
  TelephonyCall,
  TelephonyCallStatus,
  InitiateCallRequest,
  AvailablePhoneNumber,
  PurchaseNumberRequest,
  PurchasedNumber,
  VoiceAction,
  TranscriptionResult,
  TranscribedWord,
  StreamingTranscriptionConfig,
  BatchTranscriptionConfig,
  Voice,
  TtsOptions,
  StreamingTtsOptions,
  LlmMessage,
  LlmFunction,
  LlmCompletionOptions,
  LlmCompletionResult,
  StreamingLlmResult,
  
  // Interfaces
  TelephonyProvider,
  SttProvider,
  TtsProvider,
  LlmProvider,
  
  // Registry
  ProviderRegistry,
  providerRegistry,
} from './base';

// Provider implementations
export { TwilioProvider } from './twilio';
export { DeepgramProvider } from './deepgram';
export { ElevenLabsProvider } from './elevenlabs';
export { OpenAIProvider } from './openai';

// Provider initialization helper
import { config } from '../../config';
import { providerRegistry, ProviderConfig } from './base';
import { TwilioProvider } from './twilio';
import { DeepgramProvider } from './deepgram';
import { ElevenLabsProvider } from './elevenlabs';
import { OpenAIProvider } from './openai';
import logger from '../../utils/logger';

/**
 * Initialize all providers with configuration from environment
 */
export function initializeProviders(): void {
  logger.info('Initializing providers...');
  
  // Register all providers
  providerRegistry.registerTelephony('twilio', TwilioProvider);
  providerRegistry.registerStt('deepgram', DeepgramProvider);
  providerRegistry.registerTts('elevenlabs', ElevenLabsProvider);
  providerRegistry.registerLlm('openai', OpenAIProvider);
  
  logger.info({
    telephony: providerRegistry.listTelephonyProviders(),
    stt: providerRegistry.listSttProviders(),
    tts: providerRegistry.listTtsProviders(),
    llm: providerRegistry.listLlmProviders(),
  }, 'Providers registered');
}

/**
 * Get configured telephony provider
 */
export function getTelephonyProvider(providerType: string = 'twilio'): TwilioProvider {
  const providerConfig: ProviderConfig = {
    apiKey: config.twilio.accountSid || '',
    apiSecret: config.twilio.authToken || '',
  };
  
  return providerRegistry.getTelephonyProvider(providerType, providerConfig) as TwilioProvider;
}

/**
 * Get configured STT provider
 */
export function getSttProvider(providerType: string = 'deepgram'): DeepgramProvider {
  const providerConfig: ProviderConfig = {
    apiKey: config.providers.deepgram.apiKey || '',
  };
  
  return providerRegistry.getSttProvider(providerType, providerConfig) as DeepgramProvider;
}

/**
 * Get configured TTS provider
 */
export function getTtsProvider(providerType: string = 'elevenlabs'): ElevenLabsProvider {
  const providerConfig: ProviderConfig = {
    apiKey: config.providers.elevenlabs.apiKey || '',
  };
  
  return providerRegistry.getTtsProvider(providerType, providerConfig) as ElevenLabsProvider;
}

/**
 * Get configured LLM provider
 */
export function getLlmProvider(providerType: string = 'openai'): OpenAIProvider {
  const providerConfig: ProviderConfig = {
    apiKey: config.providers.openai.apiKey || '',
  };
  
  return providerRegistry.getLlmProvider(providerType, providerConfig) as OpenAIProvider;
}

// Initialize on module load
initializeProviders();
