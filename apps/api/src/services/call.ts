/**
 * Universal Voice AI Platform - Call Service
 * 
 * Handles call lifecycle management, telephony provider integration,
 * transcript retrieval, and call analytics.
 */

import { PrismaClient } from '@voice-ai/database';
import { config } from '../config';
import logger from '../utils/logger';
import { encrypt, decrypt } from '../utils/encryption';
import {
  ApiError,
  ErrorCode,
  Call,
  CallStatus,
  CallDirection,
  CallTranscript,
  TranscriptSegment,
  SentimentAnalysis,
  PhoneNumber,
  Assistant,
} from '../types';
import { deductCredits, refundCredits, hasSufficientCredits } from './billing';
import { getAssistantForCall } from './assistants';
import { voiceEngineClient } from './voice-engine-client';

// ============================================================================
// Prisma Client
// ============================================================================

const prisma = new PrismaClient();

// ============================================================================
// Call Creation & Initialization
// ============================================================================

interface InitiateOutboundCallInput {
  workspaceId: string;
  assistantId: string;
  toNumber: string;
  fromNumberId: string;
  metadata?: Record<string, unknown>;
}

interface CallInitiationResult {
  call: Call;
  sessionToken?: string;
}

/**
 * Initiate an outbound call
 * 
 * This function:
 * 1. Validates the assistant and phone number
 * 2. Checks wallet balance for minimum credits
 * 3. Creates a call record in the database
 * 4. Initiates the call via Twilio
 * 5. Starts a voice engine session
 * 6. Returns the call details and WebSocket URL
 */
export async function initiateOutboundCall(
  input: InitiateOutboundCallInput
): Promise<CallInitiationResult> {
  const { workspaceId, assistantId, toNumber, fromNumberId, metadata } = input;

  logger.info(
    { workspaceId, assistantId, toNumber, fromNumberId },
    'Initiating outbound call'
  );

  // Validate assistant exists and is published
  const assistant = await getAssistantForCall(assistantId);
  if (!assistant.isPublished) {
    throw new ApiError(
      400,
      ErrorCode.VALIDATION_ERROR,
      'Assistant must be published before making calls'
    );
  }

  // Get the phone number
  const phoneNumber = await prisma.phoneNumber.findUnique({
    where: { id: fromNumberId },
  });

  if (!phoneNumber || phoneNumber.workspaceId !== workspaceId) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Phone number not found');
  }

  if (!phoneNumber.isActive) {
    throw new ApiError(
      400,
      ErrorCode.VALIDATION_ERROR,
      'Phone number is not active'
    );
  }

  // Check wallet balance
  const hasCredits = await hasSufficientCredits(
    workspaceId,
    config.call.minimumWalletBalanceCents
  );

  if (!hasCredits) {
    throw new ApiError(
      402,
      ErrorCode.INSUFFICIENT_CREDITS,
      'Insufficient wallet balance. Please add credits to continue.'
    );
  }

  // Create call record in database
  const dbCall = await prisma.conversation.create({
    data: {
      workspaceId,
      agentId: assistantId,
      phoneNumberId: fromNumberId,
      callerNumber: toNumber,
      direction: 'outbound',
      status: 'queued',
      metadata: metadata || {},
    },
  });

  // Map database call to our Call type
  const call: Call = {
    id: dbCall.id,
    workspaceId: dbCall.workspaceId,
    assistantId: dbCall.agentId || undefined,
    phoneNumberId: dbCall.phoneNumberId || undefined,
    direction: CallDirection.OUTBOUND,
    status: CallStatus.QUEUED,
    fromNumber: phoneNumber.phoneNumber,
    toNumber,
    provider: 'twilio',
    providerCallId: '', // Will be updated after Twilio call initiation
    metadata: metadata || {},
    createdAt: dbCall.createdAt,
    updatedAt: dbCall.updatedAt,
  };

  try {
    // Initialize voice engine session
    const sessionResult = await voiceEngineClient.startCallSession({
      callId: call.id,
      assistantConfig: assistant.config,
      direction: 'outbound',
      fromNumber: phoneNumber.phoneNumber,
      toNumber,
    });

    // Update call with provider call ID if available
    if (sessionResult.providerCallId) {
      await prisma.conversation.update({
        where: { id: call.id },
        data: {
          twilioCallSid: sessionResult.providerCallId,
          status: 'ringing',
        },
      });
      call.providerCallId = sessionResult.providerCallId;
      call.status = CallStatus.RINGING;
    }

    logger.info(
      { callId: call.id, providerCallId: call.providerCallId },
      'Outbound call initiated successfully'
    );

    return {
      call,
      sessionToken: sessionResult.sessionToken,
    };
  } catch (error) {
    // Update call status to failed
    await prisma.conversation.update({
      where: { id: call.id },
      data: {
        status: 'failed',
        endedAt: new Date(),
      },
    });

    call.status = CallStatus.FAILED;

    logger.error(
      { callId: call.id, error: (error as Error).message },
      'Failed to initiate outbound call'
    );

    throw new ApiError(
      500,
      ErrorCode.PROVIDER_ERROR,
      'Failed to initiate call. Please try again.'
    );
  }
}

// ============================================================================
// Inbound Call Handling
// ============================================================================

interface TwilioWebhookParams {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  [key: string]: string;
}

interface InboundCallResult {
  call: Call;
  twimlResponse: string;
  sessionToken?: string;
}

/**
 * Handle an inbound call from Twilio webhook
 * 
 * This function:
 * 1. Finds the phone number being called
 * 2. Gets the assigned assistant
 * 3. Validates wallet balance
 * 4. Creates a call record
 * 5. Returns TwiML to connect to voice engine
 */
export async function handleInboundCall(
  twilioParams: TwilioWebhookParams
): Promise<InboundCallResult> {
  const { CallSid, From, To, CallStatus } = twilioParams;

  logger.info(
    { callSid: CallSid, from: From, to: To, status: CallStatus },
    'Handling inbound call'
  );

  // Find the phone number
  const phoneNumber = await prisma.phoneNumber.findUnique({
    where: { phoneNumber: To },
    include: {
      workspace: true,
    },
  });

  if (!phoneNumber || !phoneNumber.isActive) {
    logger.warn({ to: To }, 'Phone number not found or inactive');
    return {
      call: null as unknown as Call,
      twimlResponse: generateErrorTwiML('Sorry, this number is not available.'),
    };
  }

  // Check if phone number has an assigned assistant
  if (!phoneNumber.agentId) {
    logger.warn({ phoneNumberId: phoneNumber.id }, 'No assistant assigned to phone number');
    return {
      call: null as unknown as Call,
      twimlResponse: generateErrorTwiML(
        'Sorry, this number is not configured. Please try again later.'
      ),
    };
  }

  // Get the assistant
  const assistant = await getAssistantForCall(phoneNumber.agentId);

  // Check wallet balance
  const hasCredits = await hasSufficientCredits(
    phoneNumber.workspaceId,
    config.call.minimumWalletBalanceCents
  );

  if (!hasCredits) {
    logger.warn(
      { workspaceId: phoneNumber.workspaceId },
      'Insufficient credits for inbound call'
    );
    return {
      call: null as unknown as Call,
      twimlResponse: generateErrorTwiML(
        'Sorry, we are unable to take your call at this time. Please try again later.'
      ),
    };
  }

  // Create call record
  const dbCall = await prisma.conversation.create({
    data: {
      workspaceId: phoneNumber.workspaceId,
      agentId: phoneNumber.agentId,
      phoneNumberId: phoneNumber.id,
      callerNumber: From,
      twilioCallSid: CallSid,
      direction: 'inbound',
      status: 'in_progress',
      startedAt: new Date(),
    },
  });

  const call: Call = {
    id: dbCall.id,
    workspaceId: dbCall.workspaceId,
    assistantId: dbCall.agentId || undefined,
    phoneNumberId: dbCall.phoneNumberId || undefined,
    direction: CallDirection.INBOUND,
    status: CallStatus.IN_PROGRESS,
    fromNumber: From,
    toNumber: To,
    provider: 'twilio',
    providerCallId: CallSid,
    startedAt: new Date(),
    metadata: {},
    createdAt: dbCall.createdAt,
    updatedAt: dbCall.updatedAt,
  };

  try {
    // Start voice engine session
    const sessionResult = await voiceEngineClient.startCallSession({
      callId: call.id,
      assistantConfig: assistant.config,
      direction: 'inbound',
      fromNumber: From,
      toNumber: To,
    });

    // Generate TwiML response
    const twimlResponse = generateVoiceTwiML(
      sessionResult.websocketUrl,
      assistant.config.telephony.greetingMessage
    );

    logger.info(
      { callId: call.id, callSid: CallSid },
      'Inbound call handled successfully'
    );

    return {
      call,
      twimlResponse,
      sessionToken: sessionResult.sessionToken,
    };
  } catch (error) {
    // Update call status to failed
    await prisma.conversation.update({
      where: { id: call.id },
      data: {
        status: 'failed',
        endedAt: new Date(),
      },
    });

    logger.error(
      { callId: call.id, error: (error as Error).message },
      'Failed to handle inbound call'
    );

    return {
      call: null as unknown as Call,
      twimlResponse: generateErrorTwiML(
        'Sorry, we are experiencing technical difficulties. Please try again later.'
      ),
    };
  }
}

/**
 * Generate TwiML for voice stream connection
 */
function generateVoiceTwiML(websocketUrl: string, greetingMessage?: string): string {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${greetingMessage ? `<Say>${escapeXml(greetingMessage)}</Say>` : ''}
  <Connect>
    <Stream url="${escapeXml(websocketUrl)}">
      <Parameter name="direction" value="inbound"/>
    </Stream>
  </Connect>
</Response>`;

  return twiml;
}

/**
 * Generate error TwiML response
 */
function generateErrorTwiML(message: string): string {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;

  return twiml;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// Call Status Management
// ============================================================================

interface EndCallInput {
  callId: string;
  duration?: number;
  cost?: number;
  status?: CallStatus;
  recordingUrl?: string;
  recordingDuration?: number;
}

/**
 * End a call and update records
 * 
 * This function:
 * 1. Updates the call record with final details
 * 2. Deducts credits for the call cost
 * 3. Ends the voice engine session
 * 4. Triggers post-call processing (transcript, analysis)
 */
export async function endCall(input: EndCallInput): Promise<Call> {
  const { callId, duration, cost, status = CallStatus.COMPLETED, recordingUrl, recordingDuration } = input;

  logger.info(
    { callId, duration, cost, status },
    'Ending call'
  );

  // Get the call
  const dbCall = await prisma.conversation.findUnique({
    where: { id: callId },
  });

  if (!dbCall) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Call not found');
  }

  // Calculate cost if not provided
  const finalCost = cost ?? calculateCallCost(duration || 0);

  // Update call record
  const updatedDbCall = await prisma.conversation.update({
    where: { id: callId },
    data: {
      status: status.toLowerCase() as any,
      duration: duration || dbCall.duration,
      cost: finalCost,
      recordingUrl: recordingUrl || dbCall.recordingUrl,
      recordingDuration: recordingDuration || dbCall.recordingDuration,
      endedAt: new Date(),
    },
  });

  // Deduct credits for the call
  if (finalCost > 0 && status === CallStatus.COMPLETED) {
    try {
      await deductCredits(
        dbCall.workspaceId,
        finalCost,
        callId,
        `Call charge for ${duration || 0} seconds`
      );
    } catch (error) {
      // Log but don't fail - we'll handle insufficient credits separately
      logger.warn(
        { callId, workspaceId: dbCall.workspaceId, error: (error as Error).message },
        'Failed to deduct credits for call'
      );
    }
  }

  // End voice engine session
  try {
    await voiceEngineClient.endCallSession(callId);
  } catch (error) {
    logger.error(
      { callId, error: (error as Error).message },
      'Failed to end voice engine session'
    );
  }

  // Map to Call type
  const call: Call = {
    id: updatedDbCall.id,
    workspaceId: updatedDbCall.workspaceId,
    assistantId: updatedDbCall.agentId || undefined,
    phoneNumberId: updatedDbCall.phoneNumberId || undefined,
    direction: updatedDbCall.direction as CallDirection,
    status: status,
    fromNumber: updatedDbCall.callerNumber,
    toNumber: '', // Would need to be stored
    provider: 'twilio',
    providerCallId: updatedDbCall.twilioCallSid || '',
    startedAt: updatedDbCall.startedAt || undefined,
    endedAt: updatedDbCall.endedAt || undefined,
    duration: updatedDbCall.duration || undefined,
    cost: updatedDbCall.cost || undefined,
    recordingUrl: updatedDbCall.recordingUrl || undefined,
    recordingDuration: updatedDbCall.recordingDuration || undefined,
    metadata: (updatedDbCall.metadata as Record<string, unknown>) || {},
    createdAt: updatedDbCall.createdAt,
    updatedAt: updatedDbCall.updatedAt,
  };

  logger.info(
    { callId, duration, cost: finalCost },
    'Call ended successfully'
  );

  return call;
}

/**
 * Handle call failure and refund credits if needed
 */
export async function handleCallFailure(
  callId: string,
  reason: string,
  deductAmount: number = 0
): Promise<Call> {
  logger.info(
    { callId, reason, deductAmount },
    'Handling call failure'
  );

  const dbCall = await prisma.conversation.findUnique({
    where: { id: callId },
  });

  if (!dbCall) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Call not found');
  }

  // If we deducted credits but call failed, refund them
  if (deductAmount > 0) {
    try {
      await refundCredits(
        dbCall.workspaceId,
        deductAmount,
        callId,
        `Call failed: ${reason}`
      );
    } catch (error) {
      logger.error(
        { callId, error: (error as Error).message },
        'Failed to refund credits for failed call'
      );
    }
  }

  // Update call status
  const updatedDbCall = await prisma.conversation.update({
    where: { id: callId },
    data: {
      status: 'failed',
      endedAt: new Date(),
    },
  });

  // End voice engine session if exists
  try {
    await voiceEngineClient.endCallSession(callId);
  } catch (error) {
    // Session might not exist, that's ok
  }

  const call: Call = {
    id: updatedDbCall.id,
    workspaceId: updatedDbCall.workspaceId,
    assistantId: updatedDbCall.agentId || undefined,
    phoneNumberId: updatedDbCall.phoneNumberId || undefined,
    direction: updatedDbCall.direction as CallDirection,
    status: CallStatus.FAILED,
    fromNumber: updatedDbCall.callerNumber,
    toNumber: '',
    provider: 'twilio',
    providerCallId: updatedDbCall.twilioCallSid || '',
    startedAt: updatedDbCall.startedAt || undefined,
    endedAt: updatedDbCall.endedAt || undefined,
    metadata: (updatedDbCall.metadata as Record<string, unknown>) || {},
    createdAt: updatedDbCall.createdAt,
    updatedAt: updatedDbCall.updatedAt,
  };

  return call;
}

// ============================================================================
// Transcript Management
// ============================================================================

/**
 * Get call transcript
 * 
 * Retrieves the transcript for a completed call from the database
 * or generates it from stored messages.
 */
export async function getCallTranscript(callId: string): Promise<CallTranscript | null> {
  logger.debug({ callId }, 'Getting call transcript');

  // Get the call
  const dbCall = await prisma.conversation.findUnique({
    where: { id: callId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!dbCall) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Call not found');
  }

  // If no messages, return null
  if (!dbCall.messages || dbCall.messages.length === 0) {
    return null;
  }

  // Convert messages to transcript segments
  const segments: TranscriptSegment[] = dbCall.messages.map((message, index) => {
    const startTime = message.createdAt
      ? (message.createdAt.getTime() - (dbCall.startedAt?.getTime() || dbCall.createdAt.getTime())) / 1000
      : index * 5;

    return {
      id: message.id,
      speaker: message.role === 'assistant' ? 'assistant' : 'customer',
      text: message.content,
      startTime,
      endTime: startTime + 3, // Approximate duration
      confidence: 0.95,
      words: [], // Would need word-level data from STT provider
    };
  });

  // Generate simple sentiment analysis
  const sentiment: SentimentAnalysis = analyzeSentiment(segments);

  const transcript: CallTranscript = {
    id: `transcript_${callId}`,
    callId,
    segments,
    summary: generateSummary(segments),
    sentiment,
    createdAt: dbCall.endedAt || new Date(),
  };

  return transcript;
}

/**
 * Save transcript segment during an active call
 */
export async function saveTranscriptSegment(
  callId: string,
  segment: Omit<TranscriptSegment, 'id'>
): Promise<void> {
  logger.debug(
    { callId, speaker: segment.speaker, text: segment.text.substring(0, 50) },
    'Saving transcript segment'
  );

  await prisma.message.create({
    data: {
      conversationId: callId,
      role: segment.speaker,
      content: segment.text,
      metadata: {
        startTime: segment.startTime,
        endTime: segment.endTime,
        confidence: segment.confidence,
      },
    },
  });
}

/**
 * Simple sentiment analysis based on keyword matching
 * In production, this would use a proper NLP service
 */
function analyzeSentiment(segments: TranscriptSegment[]): SentimentAnalysis {
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'thank', 'thanks', 'perfect', 'awesome'];
  const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'disappointed', 'problem', 'issue', 'complaint'];

  let positiveCount = 0;
  let negativeCount = 0;
  const segmentSentiments: SentimentAnalysis['segments'] = [];

  for (const segment of segments) {
    const text = segment.text.toLowerCase();
    const posMatches = positiveWords.filter(w => text.includes(w)).length;
    const negMatches = negativeWords.filter(w => text.includes(w)).length;

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let score = 0;

    if (posMatches > negMatches) {
      sentiment = 'positive';
      score = Math.min(posMatches * 0.2, 1);
      positiveCount++;
    } else if (negMatches > posMatches) {
      sentiment = 'negative';
      score = -Math.min(negMatches * 0.2, 1);
      negativeCount++;
    }

    segmentSentiments.push({
      time: segment.startTime,
      sentiment,
      score,
    });
  }

  const totalSegments = segments.length;
  let overall: 'positive' | 'neutral' | 'negative' = 'neutral';
  let overallScore = 0;

  if (totalSegments > 0) {
    overallScore = (positiveCount - negativeCount) / totalSegments;
    if (overallScore > 0.2) overall = 'positive';
    else if (overallScore < -0.2) overall = 'negative';
  }

  return {
    overall,
    score: overallScore,
    segments: segmentSentiments,
  };
}

/**
 * Generate a simple summary from transcript segments
 */
function generateSummary(segments: TranscriptSegment[]): string {
  if (segments.length === 0) {
    return 'No transcript available';
  }

  const assistantSegments = segments.filter(s => s.speaker === 'assistant');
  const customerSegments = segments.filter(s => s.speaker === 'customer');

  return `Call with ${customerSegments.length} customer messages and ${assistantSegments.length} assistant responses.`;
}

// ============================================================================
// Call Queries
// ============================================================================

interface ListCallsFilters {
  workspaceId: string;
  status?: CallStatus;
  direction?: CallDirection;
  assistantId?: string;
  phoneNumberId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * List calls for a workspace with optional filters
 */
export async function listCalls(filters: ListCallsFilters): Promise<Call[]> {
  const { workspaceId, status, direction, assistantId, phoneNumberId, startDate, endDate, limit = 50, offset = 0 } = filters;

  const where: any = { workspaceId };

  if (status) {
    where.status = status.toLowerCase();
  }

  if (direction) {
    where.direction = direction.toLowerCase();
  }

  if (assistantId) {
    where.agentId = assistantId;
  }

  if (phoneNumberId) {
    where.phoneNumberId = phoneNumberId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const dbCalls = await prisma.conversation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return dbCalls.map(mapDbCallToCall);
}

/**
 * Get a single call by ID
 */
export async function getCall(callId: string): Promise<Call | null> {
  const dbCall = await prisma.conversation.findUnique({
    where: { id: callId },
  });

  if (!dbCall) return null;

  return mapDbCallToCall(dbCall);
}

/**
 * Get call statistics for a workspace
 */
export async function getCallStats(workspaceId: string): Promise<{
  totalCalls: number;
  totalDuration: number;
  totalCost: number;
  averageDuration: number;
  callsByStatus: Record<string, number>;
}> {
  const calls = await prisma.conversation.findMany({
    where: { workspaceId },
  });

  const totalCalls = calls.length;
  const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
  const totalCost = calls.reduce((sum, c) => sum + (c.cost || 0), 0);
  const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

  const callsByStatus: Record<string, number> = {};
  for (const call of calls) {
    callsByStatus[call.status] = (callsByStatus[call.status] || 0) + 1;
  }

  return {
    totalCalls,
    totalDuration,
    totalCost,
    averageDuration,
    callsByStatus,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map database conversation to Call type
 */
function mapDbCallToCall(dbCall: any): Call {
  return {
    id: dbCall.id,
    workspaceId: dbCall.workspaceId,
    assistantId: dbCall.agentId || undefined,
    phoneNumberId: dbCall.phoneNumberId || undefined,
    direction: (dbCall.direction as CallDirection) || CallDirection.INBOUND,
    status: (dbCall.status as CallStatus) || CallStatus.QUEUED,
    fromNumber: dbCall.callerNumber,
    toNumber: dbCall.phoneNumber?.phoneNumber || '',
    provider: 'twilio',
    providerCallId: dbCall.twilioCallSid || '',
    startedAt: dbCall.startedAt || undefined,
    answeredAt: undefined, // Not stored in current schema
    endedAt: dbCall.endedAt || undefined,
    duration: dbCall.duration || undefined,
    cost: dbCall.cost || undefined,
    recordingUrl: dbCall.recordingUrl || undefined,
    recordingDuration: dbCall.recordingDuration || undefined,
    voicemailUrl: undefined, // Not stored in current schema
    metadata: (dbCall.metadata as Record<string, unknown>) || {},
    createdAt: dbCall.createdAt,
    updatedAt: dbCall.updatedAt,
  };
}

/**
 * Calculate call cost based on duration
 * Uses pricing rates from config
 */
function calculateCallCost(durationSeconds: number): number {
  // Base rate: $0.02 per minute for telephony
  // Plus $0.01 per minute for STT
  // Plus $0.03 per minute for TTS
  // Plus LLM tokens (estimated)
  const durationMinutes = durationSeconds / 60;
  const telephonyCost = 2 * durationMinutes; // cents per minute
  const sttCost = 1 * durationMinutes;
  const ttsCost = 3 * durationMinutes;
  const llmCost = 1 * durationMinutes; // Estimated

  return Math.ceil(telephonyCost + sttCost + ttsCost + llmCost);
}

// ============================================================================
// Call Status Webhook Handlers
// ============================================================================

/**
 * Handle Twilio call status callback
 */
export async function handleTwilioStatusCallback(
  callSid: string,
  status: string,
  duration?: string
): Promise<void> {
  logger.info({ callSid, status, duration }, 'Processing Twilio status callback');

  const dbCall = await prisma.conversation.findFirst({
    where: { twilioCallSid: callSid },
  });

  if (!dbCall) {
    logger.warn({ callSid }, 'Call not found for status callback');
    return;
  }

  const callStatus = mapTwilioStatusToCallStatus(status);

  const updateData: any = {
    status: callStatus.toLowerCase(),
  };

  if (duration) {
    updateData.duration = parseInt(duration, 10);
  }

  if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
    updateData.endedAt = new Date();
  }

  await prisma.conversation.update({
    where: { id: dbCall.id },
    data: updateData,
  });

  // If call completed, process billing
  if (status === 'completed' && updateData.duration) {
    const cost = calculateCallCost(updateData.duration);
    try {
      await deductCredits(
        dbCall.workspaceId,
        cost,
        dbCall.id,
        `Call charge for ${updateData.duration} seconds`
      );
    } catch (error) {
      logger.error(
        { callId: dbCall.id, error: (error as Error).message },
        'Failed to deduct credits after call completion'
      );
    }
  }
}

/**
 * Handle Twilio recording callback
 */
export async function handleTwilioRecordingCallback(
  callSid: string,
  recordingUrl: string,
  recordingDuration?: string
): Promise<void> {
  logger.info({ callSid, recordingUrl }, 'Processing Twilio recording callback');

  const dbCall = await prisma.conversation.findFirst({
    where: { twilioCallSid: callSid },
  });

  if (!dbCall) {
    logger.warn({ callSid }, 'Call not found for recording callback');
    return;
  }

  await prisma.conversation.update({
    where: { id: dbCall.id },
    data: {
      recordingUrl,
      recordingDuration: recordingDuration ? parseInt(recordingDuration, 10) : undefined,
    },
  });
}

/**
 * Map Twilio call status to our CallStatus enum
 */
function mapTwilioStatusToCallStatus(twilioStatus: string): CallStatus {
  const statusMap: Record<string, CallStatus> = {
    queued: CallStatus.QUEUED,
    ringing: CallStatus.RINGING,
    'in-progress': CallStatus.IN_PROGRESS,
    completed: CallStatus.COMPLETED,
    busy: CallStatus.BUSY,
    failed: CallStatus.FAILED,
    'no-answer': CallStatus.NO_ANSWER,
    canceled: CallStatus.CANCELED,
  };

  return statusMap[twilioStatus.toLowerCase()] || CallStatus.FAILED;
}
