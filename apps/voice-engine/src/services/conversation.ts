/**
 * Conversation Manager
 * Manages conversation state, turn-taking, barge-in detection, and audio queue
 */

import { 
  ConversationState, 
  ConversationMessage,
  AudioChunk,
  ToolCall,
  ToolResult,
  AssistantConfig 
} from '../types';
import { Logger } from '../utils/logger';
import { calculateRms } from '../utils/audio';

const logger = new Logger('ConversationManager');

export interface ConversationCallbacks {
  onUserMessage: (message: string) => void;
  onAssistantMessage: (message: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onToolResult: (result: ToolResult) => void;
  onBargeIn: () => void;
  onSilence: (durationMs: number) => void;
  onSpeechStarted: () => void;
}

export class ConversationManager {
  private state: ConversationState;
  private config: AssistantConfig;
  private callbacks: ConversationCallbacks;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private bargeInThreshold: number;
  private silenceThreshold: number;
  private isSpeaking = false;
  private lastSpeechAt: Date | null = null;
  private audioPlaybackQueue: AudioChunk[] = [];
  private currentPlaybackSequence = 0;
  private isPlayingAudio = false;

  constructor(config: AssistantConfig, callbacks: ConversationCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.bargeInThreshold = config.settings.bargeInThreshold || 0.05;
    this.silenceThreshold = 500; // RMS threshold for silence detection
    
    this.state = {
      messages: [],
      currentTurn: 'system',
      isProcessing: false,
      isSpeaking: false,
      pendingToolCalls: [],
      audioQueue: [],
      lastUserMessageAt: undefined,
      lastAssistantMessageAt: undefined
    };

    this.initializeMessages();
  }

  /**
   * Initialize conversation with system prompt and first message
   */
  private initializeMessages(): void {
    // Add system message
    this.state.messages.push({
      role: 'system',
      content: this.buildSystemPrompt(),
      timestamp: new Date()
    });

    // Add first message if configured
    if (this.config.firstMessage) {
      this.state.messages.push({
        role: 'assistant',
        content: this.config.firstMessage,
        timestamp: new Date()
      });
      this.state.lastAssistantMessageAt = new Date();
    }
  }

  /**
   * Build system prompt from assistant configuration
   */
  private buildSystemPrompt(): string {
    const parts: string[] = [];
    
    parts.push(this.config.systemPrompt);
    parts.push(`\nYou are speaking over the phone. Keep responses concise and natural.`);
    parts.push(`Use conversational language and avoid long explanations.`);
    parts.push(`Respond in a helpful, friendly manner.`);
    
    if (this.config.tools.length > 0) {
      parts.push(`\nYou have access to the following tools:`);
      for (const tool of this.config.tools) {
        parts.push(`- ${tool.name}: ${tool.description}`);
      }
      parts.push(`\nUse these tools when appropriate to help the user.`);
    }
    
    return parts.join('\n');
  }

  /**
   * Process user speech input
   */
  async processUserSpeech(transcript: string, isFinal: boolean): Promise<void> {
    if (!transcript.trim()) {
      return;
    }

    logger.debug('Processing user speech', { transcript, isFinal });

    // Update speech tracking
    this.lastSpeechAt = new Date();
    this.isSpeaking = true;

    // Reset silence detection
    this.resetSilenceDetection();

    // Notify callback
    this.callbacks.onSpeechStarted();

    if (isFinal) {
      // Add user message to conversation
      this.addUserMessage(transcript);
      
      // Notify callback
      this.callbacks.onUserMessage(transcript);
      
      // Update state
      this.state.currentTurn = 'assistant';
      this.state.isProcessing = true;
    }
  }

  /**
   * Add a user message to the conversation
   */
  addUserMessage(content: string): void {
    const message: ConversationMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    this.state.messages.push(message);
    this.state.lastUserMessageAt = new Date();
    
    logger.info('User message added', { contentLength: content.length });
  }

  /**
   * Add an assistant message to the conversation
   */
  addAssistantMessage(content: string, toolCalls?: ToolCall[]): void {
    const message: ConversationMessage = {
      role: 'assistant',
      content,
      timestamp: new Date(),
      toolCalls
    };
    
    this.state.messages.push(message);
    this.state.lastAssistantMessageAt = new Date();
    this.state.isProcessing = false;
    
    logger.info('Assistant message added', { 
      contentLength: content.length,
      hasToolCalls: !!toolCalls?.length
    });
    
    this.callbacks.onAssistantMessage(content);
  }

  /**
   * Add a tool result message to the conversation
   */
  addToolResult(toolCallId: string, toolName: string, result: unknown): void {
    const content = typeof result === 'string' ? result : JSON.stringify(result);
    
    const message: ConversationMessage = {
      role: 'tool',
      content,
      timestamp: new Date(),
      toolCallId,
      name: toolName
    };
    
    this.state.messages.push(message);
    
    logger.info('Tool result added', { toolCallId, toolName });
  }

  /**
   * Process incoming audio for barge-in detection
   */
  processInboundAudio(pcmBuffer: Buffer): void {
    if (!this.config.settings.bargeInEnabled) {
      return;
    }

    // Calculate audio level
    const rms = calculateRms(pcmBuffer);
    const normalizedLevel = rms / 32767; // Normalize to 0-1

    // Check for barge-in (user speaking while assistant is speaking)
    if (this.state.isSpeaking && normalizedLevel > this.bargeInThreshold) {
      logger.info('Barge-in detected', { 
        level: normalizedLevel,
        threshold: this.bargeInThreshold 
      });
      
      this.handleBargeIn();
    }

    // Track speech activity
    if (normalizedLevel > this.silenceThreshold / 32767) {
      this.lastSpeechAt = new Date();
      this.isSpeaking = true;
      
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
    }
  }

  /**
   * Handle barge-in (user interruption)
   */
  private handleBargeIn(): void {
    // Stop current audio playback
    this.clearAudioQueue();
    
    // Update state
    this.state.isSpeaking = false;
    
    // Notify callback
    this.callbacks.onBargeIn();
  }

  /**
   * Reset silence detection timer
   */
  private resetSilenceDetection(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }

    this.silenceTimeout = setTimeout(() => {
      this.handleSilence();
    }, this.config.settings.silenceTimeoutMs || 2000);
  }

  /**
   * Handle silence detection
   */
  private handleSilence(): void {
    if (!this.lastSpeechAt) {
      return;
    }

    const silenceDuration = Date.now() - this.lastSpeechAt.getTime();
    
    logger.debug('Silence detected', { duration: silenceDuration });
    
    this.isSpeaking = false;
    this.state.silenceDetectedAt = new Date();
    
    this.callbacks.onSilence(silenceDuration);
  }

  /**
   * Queue audio for playback
   */
  queueAudio(audioData: Buffer, isLast: boolean): void {
    const chunk: AudioChunk = {
      id: `chunk-${Date.now()}-${this.currentPlaybackSequence++}`,
      data: audioData,
      sequence: this.currentPlaybackSequence,
      isLast,
      timestamp: new Date()
    };

    this.state.audioQueue.push(chunk);
    this.audioPlaybackQueue.push(chunk);
  }

  /**
   * Get next audio chunk for playback
   */
  getNextAudioChunk(): AudioChunk | null {
    if (this.audioPlaybackQueue.length === 0) {
      return null;
    }

    return this.audioPlaybackQueue.shift() || null;
  }

  /**
   * Clear the audio queue (for barge-in)
   */
  clearAudioQueue(): void {
    logger.info('Clearing audio queue', { 
      queuedChunks: this.state.audioQueue.length 
    });
    
    this.state.audioQueue = [];
    this.audioPlaybackQueue = [];
    this.state.isSpeaking = false;
  }

  /**
   * Set assistant speaking state
   */
  setSpeaking(isSpeaking: boolean): void {
    this.state.isSpeaking = isSpeaking;
    
    if (isSpeaking) {
      this.state.currentTurn = 'assistant';
    }
  }

  /**
   * Check if assistant is currently speaking
   */
  isAssistantSpeaking(): boolean {
    return this.state.isSpeaking;
  }

  /**
   * Set processing state
   */
  setProcessing(isProcessing: boolean): void {
    this.state.isProcessing = isProcessing;
  }

  /**
   * Check if currently processing
   */
  isProcessing(): boolean {
    return this.state.isProcessing;
  }

  /**
   * Add a pending tool call
   */
  addPendingToolCall(toolCall: ToolCall): void {
    this.state.pendingToolCalls.push(toolCall);
  }

  /**
   * Remove a pending tool call
   */
  removePendingToolCall(toolCallId: string): void {
    this.state.pendingToolCalls = this.state.pendingToolCalls.filter(
      tc => tc.id !== toolCallId
    );
  }

  /**
   * Get pending tool calls
   */
  getPendingToolCalls(): ToolCall[] {
    return [...this.state.pendingToolCalls];
  }

  /**
   * Clear pending tool calls
   */
  clearPendingToolCalls(): void {
    this.state.pendingToolCalls = [];
  }

  /**
   * Get conversation messages for LLM
   */
  getMessagesForLLM(): ConversationMessage[] {
    return this.state.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      toolCalls: msg.toolCalls,
      toolCallId: msg.toolCallId,
      name: msg.name
    }));
  }

  /**
   * Get the last user message
   */
  getLastUserMessage(): ConversationMessage | null {
    for (let i = this.state.messages.length - 1; i >= 0; i--) {
      if (this.state.messages[i].role === 'user') {
        return this.state.messages[i];
      }
    }
    return null;
  }

  /**
   * Get the last assistant message
   */
  getLastAssistantMessage(): ConversationMessage | null {
    for (let i = this.state.messages.length - 1; i >= 0; i--) {
      if (this.state.messages[i].role === 'assistant') {
        return this.state.messages[i];
      }
    }
    return null;
  }

  /**
   * Get conversation state
   */
  getState(): ConversationState {
    return { ...this.state };
  }

  /**
   * Get conversation duration
   */
  getDuration(): number {
    if (this.state.messages.length === 0) {
      return 0;
    }
    
    const firstMessage = this.state.messages[0];
    const now = new Date();
    
    return now.getTime() - firstMessage.timestamp.getTime();
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.state.messages.length;
  }

  /**
   * Reset conversation (clear messages except system)
   */
  reset(): void {
    const systemMessage = this.state.messages.find(m => m.role === 'system');
    
    this.state.messages = systemMessage ? [systemMessage] : [];
    this.state.currentTurn = 'system';
    this.state.isProcessing = false;
    this.state.isSpeaking = false;
    this.state.pendingToolCalls = [];
    this.state.audioQueue = [];
    this.audioPlaybackQueue = [];
    
    logger.info('Conversation reset');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    logger.info('Conversation manager destroyed');
  }
}

/**
 * Create a new conversation manager
 */
export function createConversationManager(
  config: AssistantConfig,
  callbacks: ConversationCallbacks
): ConversationManager {
  return new ConversationManager(config, callbacks);
}
