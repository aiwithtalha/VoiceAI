/**
 * Universal Voice AI Platform - Twilio Telephony Provider
 * 
 * Implementation of the TelephonyProvider interface for Twilio.
 */

import TwilioClient from 'twilio';
import {
  TelephonyProvider,
  TelephonyCall,
  TelephonyCallStatus,
  InitiateCallRequest,
  AvailablePhoneNumber,
  PurchaseNumberRequest,
  PurchasedNumber,
  VoiceAction,
  ProviderConfig,
  ProviderHealth,
} from './base';
import logger from '../../utils/logger';

export class TwilioProvider implements TelephonyProvider {
  readonly name = 'twilio';
  private client: TwilioClient.Twilio;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
    
    if (!config.apiKey || !config.apiSecret) {
      throw new Error('Twilio requires accountSid and authToken');
    }
    
    this.client = TwilioClient(config.apiKey, config.apiSecret);
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      // Try to fetch account info as a health check
      await this.client.api.accounts.list({ limit: 1 });
      
      return {
        status: 'healthy',
        latencyMs: Date.now() - startTime,
        lastCheckedAt: new Date(),
      };
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
  // Call Management
  // ============================================================================

  async initiateCall(request: InitiateCallRequest): Promise<TelephonyCall> {
    logger.info(
      { to: request.to, from: request.from },
      'Initiating Twilio call'
    );
    
    try {
      const call = await this.client.calls.create({
        to: request.to,
        from: request.from,
        url: request.webhookUrl,
        statusCallback: request.statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: request.record,
        timeout: request.timeout || 30,
        machineDetection: request.machineDetection ? 'Enable' : undefined,
      });
      
      logger.info(
        { callSid: call.sid },
        'Twilio call initiated successfully'
      );
      
      return this.mapTwilioCallToTelephonyCall(call);
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Failed to initiate Twilio call'
      );
      throw error;
    }
  }

  async endCall(callId: string): Promise<void> {
    logger.info({ callSid: callId }, 'Ending Twilio call');
    
    try {
      await this.client.calls(callId).update({ status: 'completed' });
    } catch (error) {
      logger.error(
        { error: (error as Error).message, callSid: callId },
        'Failed to end Twilio call'
      );
      throw error;
    }
  }

  async getCall(callId: string): Promise<TelephonyCall | null> {
    try {
      const call = await this.client.calls(callId).fetch();
      return this.mapTwilioCallToTelephonyCall(call);
    } catch (error) {
      if ((error as { code?: number }).code === 20404) {
        return null; // Call not found
      }
      throw error;
    }
  }

  // ============================================================================
  // Conference Management
  // ============================================================================

  async createConference(options?: { friendlyName?: string; record?: boolean }): Promise<string> {
    const friendlyName = options?.friendlyName || `conf_${Date.now()}`;
    
    // In Twilio, conferences are created implicitly when the first participant joins
    // We just return the conference name here
    return friendlyName;
  }

  async addToConference(callId: string, conferenceId: string): Promise<void> {
    // This is handled via TwiML in the webhook response
    // The webhook should return a <Conference> verb
    logger.info({ callSid: callId, conferenceName: conferenceId }, 'Adding to conference');
  }

  async removeFromConference(callId: string): Promise<void> {
    // In Twilio, removing from conference means hanging up or redirecting
    await this.endCall(callId);
  }

  // ============================================================================
  // Recording
  // ============================================================================

  async startRecording(callId: string): Promise<void> {
    try {
      await this.client.calls(callId).recordings.create({
        recordingStatusCallback: `${this.config.baseUrl}/webhooks/twilio/recording`,
        recordingStatusCallbackEvent: ['completed', 'failed'],
      });
    } catch (error) {
      logger.error(
        { error: (error as Error).message, callSid: callId },
        'Failed to start recording'
      );
      throw error;
    }
  }

  async stopRecording(callId: string): Promise<void> {
    try {
      // Get active recordings for this call
      const recordings = await this.client.recordings.list({
        callSid: callId,
        status: 'in-progress',
      });
      
      // Stop each recording
      for (const recording of recordings) {
        await this.client.recordings(recording.sid).update({ status: 'stopped' });
      }
    } catch (error) {
      logger.error(
        { error: (error as Error).message, callSid: callId },
        'Failed to stop recording'
      );
      throw error;
    }
  }

  async getRecording(recordingId: string): Promise<{ url: string; duration: number } | null> {
    try {
      const recording = await this.client.recordings(recordingId).fetch();
      
      return {
        url: `https://api.twilio.com${recording.uri.replace('.json', '')}`,
        duration: recording.duration ? parseInt(recording.duration, 10) : 0,
      };
    } catch (error) {
      if ((error as { code?: number }).code === 20404) {
        return null;
      }
      throw error;
    }
  }

  // ============================================================================
  // Phone Numbers
  // ============================================================================

  async searchAvailableNumbers(options: {
    country: string;
    areaCode?: string;
    contains?: string;
    smsEnabled?: boolean;
    voiceEnabled?: boolean;
  }): Promise<AvailablePhoneNumber[]> {
    const searchParams: TwilioClient.AvailablePhoneNumberCountryAvailablePhoneNumberCountryInstancePageOptions = {
      areaCode: options.areaCode,
      contains: options.contains,
      smsEnabled: options.smsEnabled,
      voiceEnabled: options.voiceEnabled,
      limit: 20,
    };
    
    try {
      const numbers = await this.client
        .availablePhoneNumbers(options.country)
        .local.list(searchParams);
      
      return numbers.map((num) => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName || num.phoneNumber,
        locality: num.locality || undefined,
        region: num.region || undefined,
        countryCode: options.country,
        capabilities: {
          voice: num.capabilities?.voice || false,
          sms: num.capabilities?.sms || false,
          mms: num.capabilities?.mms || false,
          fax: num.capabilities?.fax || false,
        },
        monthlyCost: 100, // Twilio doesn't expose pricing via API, use default
      }));
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Failed to search available numbers'
      );
      throw error;
    }
  }

  async purchaseNumber(request: PurchaseNumberRequest): Promise<PurchasedNumber> {
    try {
      const number = await this.client.incomingPhoneNumbers.create({
        phoneNumber: request.phoneNumber,
        voiceUrl: request.webhookUrl,
        voiceMethod: 'POST',
        statusCallback: request.statusCallbackUrl,
        statusCallbackMethod: 'POST',
      });
      
      return {
        id: number.sid,
        phoneNumber: number.phoneNumber,
        providerNumberId: number.sid,
        capabilities: {
          voice: number.capabilities?.voice || false,
          sms: number.capabilities?.sms || false,
          mms: number.capabilities?.mms || false,
          fax: number.capabilities?.fax || false,
        },
        webhookUrl: request.webhookUrl,
        statusCallbackUrl: request.statusCallbackUrl,
      };
    } catch (error) {
      logger.error(
        { error: (error as Error).message, phoneNumber: request.phoneNumber },
        'Failed to purchase number'
      );
      throw error;
    }
  }

  async releaseNumber(numberId: string): Promise<void> {
    try {
      await this.client.incomingPhoneNumbers(numberId).remove();
    } catch (error) {
      logger.error(
        { error: (error as Error).message, numberId },
        'Failed to release number'
      );
      throw error;
    }
  }

  async updateNumberWebhook(numberId: string, webhookUrl: string): Promise<void> {
    try {
      await this.client.incomingPhoneNumbers(numberId).update({
        voiceUrl: webhookUrl,
        voiceMethod: 'POST',
      });
    } catch (error) {
      logger.error(
        { error: (error as Error).message, numberId },
        'Failed to update number webhook'
      );
      throw error;
    }
  }

  // ============================================================================
  // Webhook Parsing
  // ============================================================================

  parseIncomingCallWebhook(payload: Record<string, unknown>): {
    callId: string;
    from: string;
    to: string;
    direction: 'inbound' | 'outbound';
    status: TelephonyCallStatus;
  } {
    const statusMap: Record<string, TelephonyCallStatus> = {
      queued: TelephonyCallStatus.QUEUED,
      ringing: TelephonyCallStatus.RINGING,
      'in-progress': TelephonyCallStatus.IN_PROGRESS,
      completed: TelephonyCallStatus.COMPLETED,
      busy: TelephonyCallStatus.BUSY,
      failed: TelephonyCallStatus.FAILED,
      'no-answer': TelephonyCallStatus.NO_ANSWER,
      canceled: TelephonyCallStatus.CANCELED,
    };
    
    return {
      callId: payload.CallSid as string,
      from: payload.From as string,
      to: payload.To as string,
      direction: payload.Direction === 'inbound' ? 'inbound' : 'outbound',
      status: statusMap[payload.CallStatus as string] || TelephonyCallStatus.FAILED,
    };
  }

  // ============================================================================
  // Voice Response Generation (TwiML)
  // ============================================================================

  generateVoiceResponse(actions: VoiceAction[]): string {
    const VoiceResponse = TwilioClient.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    
    for (const action of actions) {
      switch (action.type) {
        case 'say':
          twiml.say(
            {
              voice: action.voice as TwilioClient.twiml.VoiceResponse SayAttributes['voice'] || 'Polly.Joanna',
              language: action.language,
            },
            action.text
          );
          break;
          
        case 'play':
          twiml.play(action.url);
          break;
          
        case 'gather':
          twiml.gather(
            {
              action: action.action,
              numDigits: action.numDigits,
              timeout: action.timeout,
              speechTimeout: action.speechTimeout,
              input: ['speech', 'dtmf'],
            }
          );
          break;
          
        case 'record':
          twiml.record({
            action: action.action,
            maxLength: action.maxLength,
            transcribe: action.transcribe,
          });
          break;
          
        case 'dial':
          twiml.dial(
            {
              callerId: action.callerId,
              record: action.record ? 'record-from-answer' : undefined,
            },
            action.number
          );
          break;
          
        case 'hangup':
          twiml.hangup();
          break;
          
        case 'pause':
          twiml.pause({ length: action.length });
          break;
          
        case 'redirect':
          twiml.redirect(action.url);
          break;
      }
    }
    
    return twiml.toString();
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapTwilioCallToTelephonyCall(
    call: TwilioClient.CallInstance
  ): TelephonyCall {
    const statusMap: Record<string, TelephonyCallStatus> = {
      queued: TelephonyCallStatus.QUEUED,
      ringing: TelephonyCallStatus.RINGING,
      'in-progress': TelephonyCallStatus.IN_PROGRESS,
      completed: TelephonyCallStatus.COMPLETED,
      busy: TelephonyCallStatus.BUSY,
      failed: TelephonyCallStatus.FAILED,
      'no-answer': TelephonyCallStatus.NO_ANSWER,
      canceled: TelephonyCallStatus.CANCELED,
    };
    
    return {
      id: call.sid,
      providerCallId: call.sid,
      from: call.from,
      to: call.to,
      status: statusMap[call.status] || TelephonyCallStatus.FAILED,
      direction: call.direction === 'inbound' ? 'inbound' : 'outbound',
      startTime: call.startTime ? new Date(call.startTime) : undefined,
      endTime: call.endTime ? new Date(call.endTime) : undefined,
      duration: call.duration ? parseInt(call.duration, 10) : undefined,
      recordingUrl: undefined, // Fetched separately
      recordingDuration: undefined,
    };
  }
}

// Register the provider
import { providerRegistry } from './base';
providerRegistry.registerTelephony('twilio', TwilioProvider);
