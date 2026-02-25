/**
 * Universal Voice AI Platform - Assistants Service
 * 
 * Handles assistant CRUD operations, publishing, versioning, and templates.
 */

import logger from '../utils/logger';
import { ApiError, ErrorCode, Assistant, AssistantConfig, AssistantVersion, AssistantTemplate } from '../types';

// ============================================================================
// Mock Database Functions
// ============================================================================

const assistants: Map<string, Assistant> = new Map();
const assistantVersions: Map<string, AssistantVersion[]> = new Map();
const templates: Map<string, AssistantTemplate> = new Map();

async function findAssistantById(id: string): Promise<Assistant | null> {
  return assistants.get(id) || null;
}

async function findAssistantsByWorkspaceId(workspaceId: string): Promise<Assistant[]> {
  const result: Assistant[] = [];
  for (const assistant of assistants.values()) {
    if (assistant.workspaceId === workspaceId) {
      result.push(assistant);
    }
  }
  return result;
}

async function createAssistant(data: Partial<Assistant>): Promise<Assistant> {
  const assistant: Assistant = {
    id: `asst_${Date.now()}`,
    workspaceId: data.workspaceId!,
    name: data.name!,
    description: data.description,
    isPublished: false,
    isTemplate: false,
    templateId: data.templateId,
    version: 1,
    config: data.config!,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: undefined,
    createdBy: data.createdBy!,
  };
  assistants.set(assistant.id, assistant);
  return assistant;
}

async function updateAssistant(id: string, data: Partial<Assistant>): Promise<Assistant> {
  const assistant = assistants.get(id);
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  // Cannot update published assistant directly
  if (assistant.isPublished && data.config) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Cannot modify published assistant. Create a new version instead.');
  }
  
  const updated = { ...assistant, ...data, updatedAt: new Date() };
  assistants.set(id, updated);
  return updated;
}

async function deleteAssistant(id: string): Promise<void> {
  assistants.delete(id);
  assistantVersions.delete(id);
}

async function createAssistantVersion(data: Partial<AssistantVersion>): Promise<AssistantVersion> {
  const version: AssistantVersion = {
    id: `ver_${Date.now()}`,
    assistantId: data.assistantId!,
    version: data.version!,
    config: data.config!,
    createdAt: new Date(),
    createdBy: data.createdBy!,
  };
  
  const versions = assistantVersions.get(data.assistantId!) || [];
  versions.push(version);
  assistantVersions.set(data.assistantId!, versions);
  
  return version;
}

async function getAssistantVersions(assistantId: string): Promise<AssistantVersion[]> {
  return assistantVersions.get(assistantId) || [];
}

async function findTemplates(): Promise<AssistantTemplate[]> {
  return Array.from(templates.values()).filter((t) => t.isPublic);
}

async function findTemplateById(id: string): Promise<AssistantTemplate | null> {
  return templates.get(id) || null;
}

// ============================================================================
// Default Assistant Config
// ============================================================================

export function getDefaultAssistantConfig(): AssistantConfig {
  return {
    voice: {
      provider: 'elevenlabs',
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Default ElevenLabs voice
      speed: 1.0,
      stability: 0.5,
      similarityBoost: 0.75,
    },
    llm: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 150,
      systemPrompt: 'You are a helpful AI assistant. Be concise and professional in your responses.',
    },
    stt: {
      provider: 'deepgram',
      language: 'en-US',
      model: 'nova-2',
    },
    telephony: {
      provider: 'twilio',
      greetingMessage: 'Hello, thank you for calling. How can I help you today?',
      voicemailMessage: 'Please leave a message after the beep.',
      maxCallDuration: 3600,
    },
    tools: [],
    variables: {},
  };
}

// ============================================================================
// Assistant CRUD Operations
// ============================================================================

interface CreateAssistantInput {
  name: string;
  description?: string;
  templateId?: string;
  config?: Partial<AssistantConfig>;
}

/**
 * Create a new assistant
 */
export async function createAssistantService(
  workspaceId: string,
  userId: string,
  input: CreateAssistantInput
): Promise<Assistant> {
  logger.info({ workspaceId, name: input.name }, 'Creating new assistant');
  
  let config = getDefaultAssistantConfig();
  
  // If template ID provided, use template config as base
  if (input.templateId) {
    const template = await findTemplateById(input.templateId);
    if (template) {
      config = { ...template.config };
      logger.info({ templateId: input.templateId }, 'Using template config');
    }
  }
  
  // Merge with provided config
  if (input.config) {
    config = {
      ...config,
      ...input.config,
      voice: { ...config.voice, ...input.config.voice },
      llm: { ...config.llm, ...input.config.llm },
      stt: { ...config.stt, ...input.config.stt },
      telephony: { ...config.telephony, ...input.config.telephony },
    };
  }
  
  const assistant = await createAssistant({
    workspaceId,
    name: input.name,
    description: input.description,
    templateId: input.templateId,
    config,
    createdBy: userId,
  });
  
  logger.info({ assistantId: assistant.id }, 'Assistant created successfully');
  return assistant;
}

interface UpdateAssistantInput {
  name?: string;
  description?: string;
  config?: Partial<AssistantConfig>;
}

/**
 * Update an assistant
 */
export async function updateAssistantService(
  assistantId: string,
  input: UpdateAssistantInput
): Promise<Assistant> {
  logger.info({ assistantId }, 'Updating assistant');
  
  const assistant = await findAssistantById(assistantId);
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  const updateData: Partial<Assistant> = {};
  
  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  
  if (input.config) {
    updateData.config = {
      ...assistant.config,
      ...input.config,
      voice: { ...assistant.config.voice, ...input.config.voice },
      llm: { ...assistant.config.llm, ...input.config.llm },
      stt: { ...assistant.config.stt, ...input.config.stt },
      telephony: { ...assistant.config.telephony, ...input.config.telephony },
    };
  }
  
  const updated = await updateAssistant(assistantId, updateData);
  logger.info({ assistantId }, 'Assistant updated successfully');
  
  return updated;
}

/**
 * Get assistant by ID
 */
export async function getAssistant(assistantId: string): Promise<Assistant> {
  const assistant = await findAssistantById(assistantId);
  
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  return assistant;
}

/**
 * Get assistant configuration for a call
 * 
 * This function retrieves the full assistant configuration needed by the voice engine
 * to process a call. It validates that the assistant is published and returns
 * all configuration including voice, LLM, STT, and telephony settings.
 */
export async function getAssistantForCall(assistantId: string): Promise<Assistant> {
  logger.debug({ assistantId }, 'Getting assistant for call');
  
  const assistant = await findAssistantById(assistantId);
  
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  // For calls, we require the assistant to be published
  // This ensures only tested and approved configurations are used
  if (!assistant.isPublished) {
    logger.warn(
      { assistantId, workspaceId: assistant.workspaceId },
      'Attempted to use unpublished assistant for call'
    );
    throw new ApiError(
      400,
      ErrorCode.VALIDATION_ERROR,
      'Assistant must be published before it can be used for calls'
    );
  }
  
  // Validate that the assistant has all required configuration
  const config = assistant.config;
  
  if (!config.voice?.voiceId) {
    throw new ApiError(
      400,
      ErrorCode.VALIDATION_ERROR,
      'Assistant voice configuration is incomplete'
    );
  }
  
  if (!config.llm?.systemPrompt) {
    throw new ApiError(
      400,
      ErrorCode.VALIDATION_ERROR,
      'Assistant LLM configuration is incomplete'
    );
  }
  
  if (!config.stt?.language) {
    throw new ApiError(
      400,
      ErrorCode.VALIDATION_ERROR,
      'Assistant STT configuration is incomplete'
    );
  }
  
  logger.debug(
    { assistantId, workspaceId: assistant.workspaceId },
    'Assistant retrieved successfully for call'
  );
  
  return assistant;
}

/**
 * List assistants for a workspace
 */
export async function listAssistants(workspaceId: string): Promise<Assistant[]> {
  return findAssistantsByWorkspaceId(workspaceId);
}

/**
 * Delete an assistant
 */
export async function deleteAssistantService(assistantId: string): Promise<void> {
  logger.info({ assistantId }, 'Deleting assistant');
  
  const assistant = await findAssistantById(assistantId);
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  await deleteAssistant(assistantId);
  logger.info({ assistantId }, 'Assistant deleted successfully');
}

// ============================================================================
// Publishing & Versioning
// ============================================================================

/**
 * Publish an assistant
 * Creates a version snapshot and marks as published
 */
export async function publishAssistant(
  assistantId: string,
  userId: string
): Promise<Assistant> {
  logger.info({ assistantId }, 'Publishing assistant');
  
  const assistant = await findAssistantById(assistantId);
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  if (assistant.isPublished) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Assistant is already published');
  }
  
  // Create version snapshot
  await createAssistantVersion({
    assistantId,
    version: assistant.version,
    config: assistant.config,
    createdBy: userId,
  });
  
  // Mark as published
  const published = await updateAssistant(assistantId, {
    isPublished: true,
    publishedAt: new Date(),
  });
  
  logger.info({ assistantId, version: assistant.version }, 'Assistant published successfully');
  return published;
}

/**
 * Unpublish an assistant
 */
export async function unpublishAssistant(assistantId: string): Promise<Assistant> {
  logger.info({ assistantId }, 'Unpublishing assistant');
  
  const assistant = await findAssistantById(assistantId);
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  if (!assistant.isPublished) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Assistant is not published');
  }
  
  const unpublished = await updateAssistant(assistantId, {
    isPublished: false,
    publishedAt: undefined,
  });
  
  logger.info({ assistantId }, 'Assistant unpublished successfully');
  return unpublished;
}

/**
 * Create a new version of an assistant
 */
export async function createNewVersion(
  assistantId: string,
  userId: string,
  configChanges: Partial<AssistantConfig>
): Promise<Assistant> {
  logger.info({ assistantId }, 'Creating new assistant version');
  
  const assistant = await findAssistantById(assistantId);
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  // Save current version
  await createAssistantVersion({
    assistantId,
    version: assistant.version,
    config: assistant.config,
    createdBy: userId,
  });
  
  // Create new config
  const newConfig = {
    ...assistant.config,
    ...configChanges,
    voice: { ...assistant.config.voice, ...configChanges.voice },
    llm: { ...assistant.config.llm, ...configChanges.llm },
    stt: { ...assistant.config.stt, ...configChanges.stt },
    telephony: { ...assistant.config.telephony, ...configChanges.telephony },
  };
  
  // Update assistant with new version
  const updated = await updateAssistant(assistantId, {
    version: assistant.version + 1,
    config: newConfig,
    isPublished: false,
    publishedAt: undefined,
  });
  
  logger.info({ assistantId, newVersion: updated.version }, 'New version created successfully');
  return updated;
}

/**
 * Get version history for an assistant
 */
export async function getAssistantVersionHistory(assistantId: string): Promise<AssistantVersion[]> {
  const assistant = await findAssistantById(assistantId);
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  return getAssistantVersions(assistantId);
}

/**
 * Rollback to a specific version
 */
export async function rollbackToVersion(
  assistantId: string,
  versionNumber: number,
  userId: string
): Promise<Assistant> {
  logger.info({ assistantId, version: versionNumber }, 'Rolling back assistant version');
  
  const assistant = await findAssistantById(assistantId);
  if (!assistant) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Assistant not found');
  }
  
  const versions = await getAssistantVersions(assistantId);
  const targetVersion = versions.find((v) => v.version === versionNumber);
  
  if (!targetVersion) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, `Version ${versionNumber} not found`);
  }
  
  // Save current state before rollback
  await createAssistantVersion({
    assistantId,
    version: assistant.version,
    config: assistant.config,
    createdBy: userId,
  });
  
  // Rollback to target version
  const rolledBack = await updateAssistant(assistantId, {
    version: assistant.version + 1,
    config: targetVersion.config,
    isPublished: false,
    publishedAt: undefined,
  });
  
  logger.info({ assistantId, rolledBackTo: versionNumber }, 'Assistant rolled back successfully');
  return rolledBack;
}

// ============================================================================
// Templates
// ============================================================================

/**
 * List available assistant templates
 */
export async function listTemplates(): Promise<AssistantTemplate[]> {
  return findTemplates();
}

/**
 * Get a specific template
 */
export async function getTemplate(templateId: string): Promise<AssistantTemplate> {
  const template = await findTemplateById(templateId);
  
  if (!template) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Template not found');
  }
  
  return template;
}

/**
 * Create assistant from template
 */
export async function createAssistantFromTemplate(
  workspaceId: string,
  userId: string,
  templateId: string,
  name: string
): Promise<Assistant> {
  logger.info({ templateId, workspaceId }, 'Creating assistant from template');
  
  const template = await findTemplateById(templateId);
  if (!template) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Template not found');
  }
  
  const assistant = await createAssistant({
    workspaceId,
    name,
    description: template.description,
    templateId,
    config: { ...template.config },
    createdBy: userId,
  });
  
  logger.info({ assistantId: assistant.id, templateId }, 'Assistant created from template');
  return assistant;
}

// ============================================================================
// Initialize Default Templates
// ============================================================================

export function initializeDefaultTemplates(): void {
  const defaultTemplates: Omit<AssistantTemplate, 'id' | 'createdAt'>[] = [
    {
      name: 'Customer Support',
      description: 'A friendly assistant for handling customer support inquiries',
      category: 'support',
      icon: 'headset',
      config: {
        ...getDefaultAssistantConfig(),
        llm: {
          ...getDefaultAssistantConfig().llm,
          systemPrompt: `You are a customer support representative. Be friendly, patient, and helpful. 
Listen to customer concerns and provide clear solutions. If you cannot resolve an issue, 
offer to escalate to a human agent.`,
        },
        telephony: {
          ...getDefaultAssistantConfig().telephony,
          greetingMessage: 'Thank you for calling customer support. My name is AI Assistant. How may I help you today?',
        },
      },
      isPublic: true,
    },
    {
      name: 'Sales Representative',
      description: 'An assistant focused on sales calls and lead qualification',
      category: 'sales',
      icon: 'trending-up',
      config: {
        ...getDefaultAssistantConfig(),
        llm: {
          ...getDefaultAssistantConfig().llm,
          systemPrompt: `You are a sales representative. Be enthusiastic and professional. 
Qualify leads by asking about their needs and budget. Highlight product benefits 
and try to schedule a demo or meeting.`,
        },
        telephony: {
          ...getDefaultAssistantConfig().telephony,
          greetingMessage: 'Hello! This is the sales team. I\'d love to learn about your needs. How can I assist you?',
        },
      },
      isPublic: true,
    },
    {
      name: 'Appointment Scheduler',
      description: 'An assistant for booking and managing appointments',
      category: 'scheduling',
      icon: 'calendar',
      config: {
        ...getDefaultAssistantConfig(),
        llm: {
          ...getDefaultAssistantConfig().llm,
          systemPrompt: `You are an appointment scheduler. Help callers book, reschedule, or cancel appointments. 
Collect necessary information like name, contact details, and preferred time slots. 
Confirm all details before finalizing.`,
        },
        telephony: {
          ...getDefaultAssistantConfig().telephony,
          greetingMessage: 'Thank you for calling. I can help you schedule or manage your appointment. What would you like to do?',
        },
      },
      isPublic: true,
    },
    {
      name: 'Receptionist',
      description: 'A professional receptionist for handling incoming calls',
      category: 'reception',
      icon: 'phone',
      config: {
        ...getDefaultAssistantConfig(),
        llm: {
          ...getDefaultAssistantConfig().llm,
          systemPrompt: `You are a professional receptionist. Greet callers warmly, 
identify their needs, and route them to the appropriate department or person. 
Take detailed messages when needed.`,
        },
        telephony: {
          ...getDefaultAssistantConfig().telephony,
          greetingMessage: 'Good day! Thank you for calling. How may I direct your call?',
        },
      },
      isPublic: true,
    },
  ];
  
  for (const templateData of defaultTemplates) {
    const template: AssistantTemplate = {
      ...templateData,
      id: `tmpl_${templateData.name.toLowerCase().replace(/\s+/g, '_')}`,
      createdAt: new Date(),
    };
    templates.set(template.id, template);
  }
  
  logger.info({ count: defaultTemplates.length }, 'Default templates initialized');
}

// Initialize templates on module load
initializeDefaultTemplates();
