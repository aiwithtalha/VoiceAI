// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: string;
  lastLoginAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  settings: WorkspaceSettings;
  createdAt: string;
}

export interface WorkspaceSettings {
  timezone: string;
  currency: string;
  webhookUrl?: string;
  complianceSettings: ComplianceSettings;
}

export interface ComplianceSettings {
  hipaaEnabled: boolean;
  gdprEnabled: boolean;
  soc2Enabled: boolean;
  recordingConsent: 'always' | 'optional' | 'never';
  dataRetentionDays: number;
}

// Assistant Types
export interface Assistant {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: number;
  spec: AgentSpec;
  phoneNumberId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  analytics?: AssistantAnalytics;
}

export interface AgentSpec {
  name: string;
  description?: string;
  systemPrompt: string;
  firstMessage?: string;
  providerConfig: ProviderConfig;
  voiceConfig: VoiceConfig;
  tools: ToolConfig[];
  variables: Record<string, string>;
  knowledgeBase?: KnowledgeBaseConfig;
  advanced?: AdvancedConfig;
}

export interface ProviderConfig {
  telephonyProvider: 'twilio' | 'vonage' | 'plivo' | 'custom';
  sttProvider: 'deepgram' | 'assemblyai' | 'google' | 'azure';
  llmProvider: 'openai' | 'anthropic' | 'google' | 'azure' | 'custom';
  ttsProvider: 'elevenlabs' | 'openai' | 'google' | 'azure' | 'playht';
  llmModel: string;
}

export interface VoiceConfig {
  provider: string;
  voiceId: string;
  name?: string;
  language?: string;
  accent?: string;
  gender?: 'male' | 'female' | 'neutral';
  settings?: {
    stability?: number;
    similarityBoost?: number;
    speed?: number;
  };
}

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  type: 'predefined' | 'custom';
  parameters: Record<string, unknown>;
}

export interface KnowledgeBaseConfig {
  documents: Document[];
  searchSettings: {
    topK: number;
    threshold: number;
  };
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'txt' | 'docx' | 'url';
  content?: string;
  url?: string;
  status: 'processing' | 'ready' | 'error';
}

export interface AdvancedConfig {
  maxDurationSeconds: number;
  silenceTimeoutMs: number;
  interruptEnabled: boolean;
  emotionDetection: boolean;
  sentimentAnalysis: boolean;
  callTransferEnabled: boolean;
  voicemailDetection: boolean;
}

export interface AssistantAnalytics {
  totalCalls: number;
  avgDuration: number;
  successRate: number;
  costPerCall: number;
  lastCallAt?: string;
}

// Call Types
export interface Call {
  id: string;
  assistantId: string;
  assistantName?: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  duration: number;
  cost: number;
  startedAt: string;
  endedAt?: string;
  transcript?: TranscriptMessage[];
  summary?: string;
  outcomes?: CallOutcome[];
  recordingUrl?: string;
  errorMessage?: string;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  latencyMs?: number;
}

export interface CallOutcome {
  key: string;
  value: string;
  confidence: number;
}

// Phone Number Types
export interface PhoneNumber {
  id: string;
  number: string;
  provider: string;
  country: string;
  region?: string;
  assistantId?: string;
  status: 'active' | 'inactive' | 'pending';
  monthlyCost: number;
  createdAt: string;
}

// Voice Types
export interface Voice {
  id: string;
  name: string;
  provider: string;
  language: string;
  accent?: string;
  gender: 'male' | 'female' | 'neutral';
  previewUrl?: string;
  isCloned: boolean;
  isPremium: boolean;
}

// Billing Types
export interface Wallet {
  balance: number;
  currency: string;
  autoTopupEnabled: boolean;
  autoTopupThreshold?: number;
  autoTopupAmount?: number;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void';
  periodStart: string;
  periodEnd: string;
  pdfUrl?: string;
  createdAt: string;
  paidAt?: string;
}

// API Key Types
export interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// Integration Types
export interface Integration {
  id: string;
  provider: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt?: string;
  settings?: Record<string, unknown>;
}

// Team Types
export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  lastActiveAt?: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

// Stats Types
export interface DashboardStats {
  callsToday: number;
  callsChange: number;
  activeCalls: number;
  walletBalance: number;
  avgDuration: number;
  durationChange: number;
  successRate: number;
  successChange: number;
  totalCost: number;
  costChange: number;
}

// Template Types
export interface AssistantTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  spec: Partial<AgentSpec>;
}
