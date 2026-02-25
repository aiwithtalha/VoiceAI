/**
 * Call Session Manager
 * Manages the entire lifecycle of a voice call
 * Coordinates providers, handles billing, and manages call state
 */

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { 
  CallSession,
  CallSessionState,
  CallStatus,
  AssistantConfig,
  VoiceEngineConfig,
  ConversationMessage,
  ToolCall,
  ToolResult,
  OpenAIToolCall,
  DeepgramWord
} from '../types';
import { Logger } from '../utils/logger';
import { DeepgramProvider } from '../providers/deepgram';
import { OpenAIProvider, parseToolCallArguments } from '../providers/openai';
import { ElevenLabsProvider } from '../providers/elevenlabs';
import { ConversationManager } from './conversation';
import { ToolExecutor } from './tool-executor';
import { TwilioWebSocketHandler } from '../handlers/twilio-ws';
import { getPrisma, emitEvent, getConfig } from '../index';
import { pcmToBase64Mulaw } from '../utils/audio';

const logger = new Logger('CallSessionManager');

export class CallSessionManager {
  private session: CallSession;
  private state: CallSessionState;
  private config: VoiceEngineConfig;
  private assistantConfig: AssistantConfig | null = null;
  private wsHandler: TwilioWebSocketHandler;
  
  // Providers
  private deepgram: DeepgramProvider | null = null;
  private openai: OpenAIProvider | null = null;
  private elevenlabs: ElevenLabsProvider | null = null;
  
  // Services
  private conversation: ConversationManager | null = null;
  private toolExecutor: ToolExecutor | null = null;
  
  // State management
  private isInitialized = false;
  private isTerminated = false;
  private billingInterval: NodeJS.Timeout | null = null;
  private accumulatedAudio: Buffer = Buffer.alloc(0);
  private pendingAudio: Buffer[] = [];
  private isProcessingResponse = false;
  private currentResponseText = '';

  constructor(
    connectionId: string,
    streamSid: string,
    callSid: string,
    accountSid: string,
    assistantId: string,
    userId: string,
    organizationId: string,
    from: string,
    to: string,
    config: VoiceEngineConfig,
    wsHandler: TwilioWebSocketHandler
  ) {
    this.config = config;
    this.wsHandler = wsHandler;
    
    const now = new Date();
    
    this.session = {
      id: connectionId,
      callSid,
      accountSid,
      from,
      to,
      direction: 'inbound',
      status: 'initializing',
      assistantId,
      userId,
      organizationId,
      startedAt: now,
      duration: 0,
      cost: 0,
      creditsDeducted: 0,
      lastBillingAt: now,
      metadata: {}
    };

    this.state = {
      session: this.session,
      ws: wsHandler as any,
      conversation: null as any,
      providers: {},
      audio: {
        inputFormat: { encoding: 'mulaw', sampleRate: 8000, channels: 1 },
        outputFormat: { encoding: 'mulaw', sampleRate: 8000, channels: 1 },
        inputBuffer: Buffer.alloc(0),
        outputBuffer: Buffer.alloc(0),
        sampleRate: 8000,
        channels: 1,
        frameSize: 160
      },
      billing: {
        lastDeductionAt: now,
        totalSeconds: 0,
        billedSeconds: 0,
        creditsRemaining: 0,
        billingInterval: config.billingIntervalSeconds,
        isPaused: false
      }
    };
  }

  /**
   * Initialize the call session
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing call session', { 
        callId: this.session.id,
        assistantId: this.session.assistantId 
      });

      // Fetch assistant configuration
      await this.fetchAssistantConfig();

      // Initialize conversation manager
      this.conversation = new ConversationManager(
        this.assistantConfig!,
        {
          onUserMessage: (msg) => this.handleUserMessage(msg),
          onAssistantMessage: (msg) => this.handleAssistantMessage(msg),
          onToolCall: (tc) => this.handleToolCall(tc),
          onToolResult: (result) => this.handleToolResult(result),
          onBargeIn: () => this.handleBargeIn(),
          onSilence: (duration) => this.handleSilence(duration),
          onSpeechStarted: () => this.handleSpeechStarted()
        }
      );

      // Initialize tool executor
      this.toolExecutor = new ToolExecutor(
        this.assistantConfig!.tools,
        {
          onToolExecuted: (result) => this.handleToolExecuted(result)
        }
      );

      // Initialize providers
      await this.initializeProviders();

      // Start billing timer
      this.startBillingTimer();

      // Update session status
      this.session.status = 'connected';
      this.isInitialized = true;

      // Create call record in database
      await this.createCallRecord();

      // Play first message if configured
      if (this.assistantConfig?.firstMessage) {
        await this.speak(this.assistantConfig.firstMessage);
      }

      logger.info('Call session initialized successfully', { 
        callId: this.session.id 
      });

    } catch (error) {
      logger.error('Failed to initialize call session', { error });
      this.session.status = 'error';
      throw error;
    }
  }

  /**
   * Fetch assistant configuration from API
   */
  private async fetchAssistantConfig(): Promise<void> {
    try {
      // In production, this would fetch from your API
      // For now, using a mock configuration
      this.assistantConfig = {
        id: this.session.assistantId,
        name: 'Default Assistant',
        userId: this.session.userId,
        organizationId: this.session.organizationId,
        voice: {
          provider: 'elevenlabs',
          voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
          stability: 0.5,
          similarityBoost: 0.75
        },
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 150
        },
        stt: {
          provider: 'deepgram',
          model: 'nova-2-phonecall',
          language: 'en-US',
          interimResults: true,
          endpointing: 300,
          smartFormatting: true,
          punctuate: true,
          profanityFilter: false
        },
        tts: {
          provider: 'elevenlabs',
          voiceId: '21m00Tcm4TlvDq8ikWAM',
          model: 'eleven_turbo_v2_5',
          optimizeStreamingLatency: 3
        },
        systemPrompt: 'You are a helpful AI assistant.',
        firstMessage: 'Hello! How can I help you today?',
        tools: [
          {
            id: 'transfer_call',
            name: 'transfer_call',
            description: 'Transfer the call to a human agent',
            type: 'builtin',
            parameters: [
              {
                name: 'destination',
                type: 'string',
                description: 'Phone number or extension to transfer to',
                required: true
              }
            ]
          },
          {
            id: 'end_call',
            name: 'end_call',
            description: 'End the current call',
            type: 'builtin',
            parameters: []
          }
        ],
        settings: {
          silenceTimeoutMs: 2000,
          maxDurationSeconds: 600,
          bargeInEnabled: true,
          bargeInThreshold: 0.05,
          recordCall: false,
          transcriptionEnabled: true
        },
        fallback: {}
      };

      logger.info('Assistant configuration loaded', { 
        assistantId: this.assistantConfig.id,
        toolCount: this.assistantConfig.tools.length
      });

    } catch (error) {
      logger.error('Failed to fetch assistant config', { error });
      throw error;
    }
  }

  /**
   * Initialize all providers
   */
  private async initializeProviders(): Promise<void> {
    // Initialize Deepgram
    this.deepgram = new DeepgramProvider(
      this.config.deepgramApiKey,
      this.assistantConfig!.stt,
      {
        onTranscript: (transcript, isFinal, words) => 
          this.handleTranscript(transcript, isFinal, words),
        onSpeechStarted: () => this.handleSpeechStarted(),
        onSpeechEnded: () => this.handleSpeechEnded(),
        onUtteranceEnd: () => this.handleUtteranceEnd(),
        onError: (error) => logger.error('Deepgram error', { error }),
        onClose: () => logger.info('Deepgram connection closed')
      }
    );

    await this.deepgram.connect();

    // Initialize OpenAI
    this.openai = new OpenAIProvider(
      this.config.openaiApiKey,
      this.assistantConfig!.model,
      {
        onContent: (content) => this.handleLLMContent(content),
        onToolCall: (toolCall) => this.handleLLMToolCall(toolCall),
        onComplete: (content, toolCalls) => 
          this.handleLLMComplete(content, toolCalls),
        onError: (error) => logger.error('OpenAI error', { error })
      }
    );

    // Initialize ElevenLabs
    this.elevenlabs = new ElevenLabsProvider(
      this.config.elevenlabsApiKey,
      this.assistantConfig!.tts,
      this.assistantConfig!.voice,
      {
        onAudio: (audio, isLast) => this.handleTTSAudio(audio, isLast),
        onComplete: () => this.handleTTSComplete(),
        onError: (error) => logger.error('ElevenLabs error', { error })
      }
    );

    logger.info('All providers initialized');
  }

  /**
   * Create call record in database
   */
  private async createCallRecord(): Promise<void> {
    try {
      const prisma = getPrisma();
      await prisma.call.create({
        data: {
          id: this.session.id,
          callSid: this.session.callSid,
          accountSid: this.session.accountSid,
          from: this.session.from,
          to: this.session.to,
          direction: this.session.direction,
          status: this.session.status,
          assistantId: this.session.assistantId,
          userId: this.session.userId,
          organizationId: this.session.organizationId,
          startedAt: this.session.startedAt,
          duration: 0,
          cost: 0,
          creditsDeducted: 0,
          metadata: {}
        }
      });

      logger.info('Call record created');
    } catch (error) {
      logger.error('Failed to create call record', { error });
    }
  }

  /**
   * Start the billing timer (30-second increments)
   */
  private startBillingTimer(): void {
    this.billingInterval = setInterval(async () => {
      await this.deductCredits();
    }, this.config.billingIntervalSeconds * 1000);
  }

  /**
   * Deduct credits for the call
   */
  private async deductCredits(): Promise<void> {
    if (this.session.status === 'ended') {
      return;
    }

    try {
      const seconds = this.config.billingIntervalSeconds;
      const credits = (this.config.costPerMinute / 60) * seconds;

      // Call billing API
      const response = await axios.post(
        `${this.config.apiBaseUrl}/api/billing/deduct`,
        {
          userId: this.session.userId,
          callId: this.session.id,
          seconds,
          credits
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.webhookSecret}`
          }
        }
      );

      if (response.data.success) {
        this.session.creditsDeducted += credits;
        this.session.lastBillingAt = new Date();
        
        this.state.billing.billedSeconds += seconds;
        this.state.billing.creditsRemaining = response.data.creditsRemaining;

        logger.info('Credits deducted', { 
          credits,
          totalDeducted: this.session.creditsDeducted,
          remaining: response.data.creditsRemaining
        });

        // Emit event
        emitEvent({
          type: 'billing.deducted',
          payload: {
            callId: this.session.id,
            seconds,
            credits,
            timestamp: new Date(),
            success: true
          }
        });

        // Check if credits depleted
        if (response.data.creditsRemaining <= 0) {
          logger.warn('Credits depleted, ending call');
          await this.speak('I apologize, but your call credits have been depleted. Goodbye.');
          await this.terminate();
        }
      }
    } catch (error) {
      logger.error('Failed to deduct credits', { error });
      
      emitEvent({
        type: 'billing.deducted',
        payload: {
          callId: this.session.id,
          seconds: this.config.billingIntervalSeconds,
          credits: 0,
          timestamp: new Date(),
          success: false,
          error: (error as Error).message
        }
      });
    }
  }

  /**
   * Process inbound audio from Twilio
   */
  async processInboundAudio(base64Mulaw: string): Promise<void> {
    if (!this.isInitialized || this.isTerminated) {
      return;
    }

    // Send to Deepgram for transcription
    this.deepgram?.sendMulawAudio(base64Mulaw);

    // Process for barge-in detection
    if (this.assistantConfig?.settings.bargeInEnabled) {
      const mulawBuffer = Buffer.from(base64Mulaw, 'base64');
      // Convert to PCM for analysis
      // This is simplified - in production you'd use the audio utils
      this.conversation?.processInboundAudio(mulawBuffer);
    }
  }

  /**
   * Handle transcript from Deepgram
   */
  private async handleTranscript(
    transcript: string, 
    isFinal: boolean,
    words: DeepgramWord[]
  ): Promise<void> {
    logger.debug('Transcript received', { transcript, isFinal });

    if (isFinal && transcript.trim()) {
      // Process user speech
      await this.conversation?.processUserSpeech(transcript, true);

      // Emit event
      emitEvent({
        type: 'transcript.received',
        payload: {
          callId: this.session.id,
          transcript,
          isFinal: true
        }
      });

      // Generate response
      await this.generateResponse();
    }
  }

  /**
   * Handle speech started event
   */
  private handleSpeechStarted(): void {
    logger.debug('Speech started');
    
    emitEvent({
      type: 'user.speaking',
      payload: { callId: this.session.id }
    });
  }

  /**
   * Handle speech ended event
   */
  private handleSpeechEnded(): void {
    logger.debug('Speech ended');
  }

  /**
   * Handle utterance end event
   */
  private handleUtteranceEnd(): void {
    logger.debug('Utterance end');
  }

  /**
   * Handle user message
   */
  private handleUserMessage(message: string): void {
    logger.info('User message', { message });
  }

  /**
   * Handle assistant message
   */
  private handleAssistantMessage(message: string): void {
    logger.info('Assistant message', { message });
  }

  /**
   * Handle tool call
   */
  private handleToolCall(toolCall: ToolCall): void {
    logger.info('Tool call', { toolCall });
  }

  /**
   * Handle tool result
   */
  private handleToolResult(result: ToolResult): void {
    logger.info('Tool result', { result });
  }

  /**
   * Handle barge-in (user interruption)
   */
  private handleBargeIn(): void {
    logger.info('Barge-in detected');

    // Stop TTS
    this.elevenlabs?.stop();

    // Clear audio queue
    this.wsHandler.clearAudioBuffer();
    this.accumulatedAudio = Buffer.alloc(0);
    this.pendingAudio = [];

    // Stop LLM stream
    this.openai?.abort();

    // Reset state
    this.isProcessingResponse = false;
    this.currentResponseText = '';

    // Emit event
    emitEvent({
      type: 'barge-in.detected',
      payload: { callId: this.session.id }
    });
  }

  /**
   * Handle silence detection
   */
  private handleSilence(duration: number): void {
    logger.debug('Silence detected', { duration });

    emitEvent({
      type: 'user.silence',
      payload: { callId: this.session.id, duration }
    });
  }

  /**
   * Generate AI response
   */
  private async generateResponse(): Promise<void> {
    if (this.isProcessingResponse) {
      logger.warn('Already processing response');
      return;
    }

    this.isProcessingResponse = true;
    this.conversation?.setProcessing(true);

    try {
      const messages = this.conversation?.getMessagesForLLM() || [];
      const tools = this.assistantConfig?.tools || [];

      // Stream completion from OpenAI
      await this.openai?.streamCompletion(
        messages as ConversationMessage[],
        tools
      );

    } catch (error) {
      logger.error('Failed to generate response', { error });
      this.isProcessingResponse = false;
      this.conversation?.setProcessing(false);
    }
  }

  /**
   * Handle content from LLM stream
   */
  private handleLLMContent(content: string): void {
    this.currentResponseText += content;
    
    // Stream to TTS in chunks
    // We accumulate text and send to TTS when we have a complete sentence or phrase
    const sentences = this.currentResponseText.split(/(?<=[.!?])\s+/);
    
    if (sentences.length > 1) {
      // Send completed sentences to TTS
      for (let i = 0; i < sentences.length - 1; i++) {
        const sentence = sentences[i].trim();
        if (sentence) {
          this.elevenlabs?.streamTTS(sentence);
        }
      }
      
      // Keep the incomplete sentence
      this.currentResponseText = sentences[sentences.length - 1];
    }
  }

  /**
   * Handle tool call from LLM
   */
  private async handleLLMToolCall(toolCall: OpenAIToolCall): Promise<void> {
    logger.info('LLM requested tool call', { toolCall });

    const args = parseToolCallArguments(toolCall);
    
    const tc: ToolCall = {
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: args
    };

    this.conversation?.addPendingToolCall(tc);

    // Emit event
    emitEvent({
      type: 'tool.called',
      payload: { callId: this.session.id, tool: tc }
    });

    // Execute tool
    const result = await this.toolExecutor?.executeTool(tc);

    if (result) {
      // Add tool result to conversation
      this.conversation?.addToolResult(tc.id, tc.name, result.result);

      // Emit event
      emitEvent({
        type: 'tool.completed',
        payload: { callId: this.session.id, result }
      });

      // Handle special tools
      if (tc.name === 'end_call') {
        await this.terminate();
        return;
      }

      if (tc.name === 'transfer_call') {
        await this.handleTransferCall(args.destination as string);
        return;
      }

      // Generate response with tool result
      await this.generateResponse();
    }
  }

  /**
   * Handle LLM stream completion
   */
  private async handleLLMComplete(
    content: string, 
    toolCalls: OpenAIToolCall[]
  ): Promise<void> {
    logger.info('LLM stream complete', { 
      contentLength: content.length,
      toolCallCount: toolCalls.length 
    });

    // Send any remaining text to TTS
    if (this.currentResponseText.trim()) {
      await this.elevenlabs?.streamTTS(this.currentResponseText.trim());
    }

    // Add assistant message to conversation
    this.conversation?.addAssistantMessage(content);

    // Reset state
    this.isProcessingResponse = false;
    this.currentResponseText = '';
    this.conversation?.setProcessing(false);

    // Emit event
    emitEvent({
      type: 'assistant.speech.ended',
      payload: { callId: this.session.id }
    });
  }

  /**
   * Handle TTS audio chunk
   */
  private handleTTSAudio(audioChunk: Buffer, isLast: boolean): void {
    if (audioChunk.length > 0) {
      // Convert to base64 and send to Twilio
      const base64Audio = audioChunk.toString('base64');
      this.wsHandler.sendAudio(base64Audio, isLast);
    }
  }

  /**
   * Handle TTS completion
   */
  private handleTTSComplete(): void {
    logger.debug('TTS complete');
    this.conversation?.setSpeaking(false);
  }

  /**
   * Handle tool execution result
   */
  private handleToolExecuted(result: ToolResult): void {
    logger.info('Tool executed', { result });
  }

  /**
   * Speak a message
   */
  async speak(text: string): Promise<void> {
    logger.info('Speaking', { text });
    
    this.conversation?.setSpeaking(true);
    await this.elevenlabs?.streamTTS(text);
  }

  /**
   * Handle transfer call
   */
  private async handleTransferCall(destination: string): Promise<void> {
    logger.info('Transferring call', { destination });
    
    // In production, this would use Twilio API to transfer the call
    // For now, just speak a message
    await this.speak(`Transferring you to ${destination}. Please hold.`);
  }

  /**
   * Handle mark event from Twilio
   */
  handleMark(markName: string): void {
    logger.debug('Mark received', { markName });
  }

  /**
   * Terminate the call session
   */
  async terminate(): Promise<void> {
    if (this.isTerminated) {
      return;
    }

    this.isTerminated = true;
    logger.info('Terminating call session', { callId: this.session.id });

    // Stop billing timer
    if (this.billingInterval) {
      clearInterval(this.billingInterval);
      this.billingInterval = null;
    }

    // Close providers
    this.deepgram?.close();
    this.openai?.abort();
    this.elevenlabs?.stop();

    // Update session
    this.session.status = 'ended';
    this.session.endedAt = new Date();
    this.session.duration = Math.floor(
      (this.session.endedAt.getTime() - this.session.startedAt.getTime()) / 1000
    );

    // Update call record
    try {
      const prisma = getPrisma();
      await prisma.call.update({
        where: { id: this.session.id },
        data: {
          status: 'ended',
          endedAt: this.session.endedAt,
          duration: this.session.duration,
          cost: this.session.cost,
          creditsDeducted: this.session.creditsDeducted
        }
      });
    } catch (error) {
      logger.error('Failed to update call record', { error });
    }

    // Clean up
    this.conversation?.destroy();

    logger.info('Call session terminated', { 
      callId: this.session.id,
      duration: this.session.duration,
      cost: this.session.cost
    });
  }

  /**
   * Get session data
   */
  getSession(): CallSession {
    return { ...this.session };
  }

  /**
   * Get full state
   */
  getState(): CallSessionState {
    return { ...this.state };
  }

  /**
   * Check if initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if terminated
   */
  getIsTerminated(): boolean {
    return this.isTerminated;
  }
}
