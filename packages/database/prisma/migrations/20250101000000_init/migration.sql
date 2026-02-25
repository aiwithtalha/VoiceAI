-- Voice AI Platform - Initial Schema Migration
-- Multi-tenant SaaS with workspace isolation

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE "PlanType" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_DELETION', 'DELETED');
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'GITHUB', 'MICROSOFT', 'SAML');
CREATE TYPE "TransactionType" AS ENUM ('CREDIT_PURCHASE', 'CREDIT_REFUND', 'CREDIT_GRANT', 'USAGE_CHARGE', 'USAGE_ADJUSTMENT', 'BONUS');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'UNCOLLECTIBLE', 'VOID');
CREATE TYPE "AssistantStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DISABLED');
CREATE TYPE "TemplateCategory" AS ENUM ('GENERAL', 'SUPPORT', 'SALES', 'BOOKING', 'SURVEY', 'REMINDER', 'CUSTOM_SERVICE', 'HEALTHCARE', 'FINANCE', 'EDUCATION');
CREATE TYPE "VoiceProvider" AS ENUM ('ELEVENLABS', 'OPENAI', 'AZURE', 'GOOGLE', 'PLAYHT', 'DEEPGRAM', 'CARTESIA');
CREATE TYPE "ProviderType" AS ENUM ('LLM', 'VOICE', 'TELEPHONY', 'TRANSCRIPTION');
CREATE TYPE "ProviderConfigStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
CREATE TYPE "PhoneNumberType" AS ENUM ('INBOUND', 'OUTBOUND', 'BOTH');
CREATE TYPE "PhoneNumberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_RELEASE', 'RELEASED');
CREATE TYPE "TelephonyProvider" AS ENUM ('TWILIO', 'VONAGE', 'TELNYX', 'PLIVO');
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "CallStatus" AS ENUM ('QUEUED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER', 'CANCELED', 'VOICEMAIL');
CREATE TYPE "CallOutcome" AS ENUM ('SUCCESS', 'FAILED', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'CALLBACK_REQUESTED', 'APPOINTMENT_BOOKED', 'TRANSFERRED', 'HANGUP');
CREATE TYPE "CallEventType" AS ENUM ('INITIATED', 'RINGING', 'ANSWERED', 'SPEECH_DETECTED', 'SILENCE_DETECTED', 'DTMF_RECEIVED', 'TRANSFERRED', 'VOICEMAIL_LEFT', 'COMPLETED', 'FAILED', 'RECORDING_AVAILABLE', 'TRANSCRIPT_AVAILABLE');
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
CREATE TYPE "ToolType" AS ENUM ('PREDEFINED', 'CUSTOM', 'INTEGRATION');
CREATE TYPE "ToolExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'RETRYING', 'CANCELLED');
CREATE TYPE "IntegrationType" AS ENUM ('GOOGLE_SHEETS', 'GOOGLE_CALENDAR', 'GOOGLE_CONTACTS', 'MICROSOFT_TEAMS', 'SLACK', 'ZAPIER', 'MAKE', 'HUBSPOT', 'SALESFORCE', 'ZENDESK', 'CUSTOM_API');
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR', 'EXPIRED');
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING');
CREATE TYPE "AuditSeverity" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NEUTRAL');

-- ============================================
-- WORKSPACE & TENANCY
-- ============================================

CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workspaces_slug_key" UNIQUE ("slug")
);

CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");
CREATE INDEX "workspaces_status_idx" ON "workspaces"("status");
CREATE INDEX "workspaces_plan_idx" ON "workspaces"("plan");
CREATE INDEX "workspaces_createdAt_idx" ON "workspaces"("createdAt");

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "avatar" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "authId" TEXT,
    "passwordHash" TEXT,
    "preferences" JSONB DEFAULT '{}',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email")
);

CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_authProvider_idx" ON "users"("authProvider");
CREATE INDEX "users_authId_idx" ON "users"("authId");

CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "invitedBy" UUID,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "permissions" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workspace_members_workspaceId_userId_key" UNIQUE ("workspaceId", "userId")
);

CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");
CREATE INDEX "workspace_members_role_idx" ON "workspace_members"("role");
CREATE INDEX "workspace_members_status_idx" ON "workspace_members"("status");

ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- BILLING & WALLET
-- ============================================

CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "balance" DECIMAL(12, 4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "autoTopUp" BOOLEAN NOT NULL DEFAULT false,
    "autoTopUpAmount" DECIMAL(12, 4),
    "lowBalanceThreshold" DECIMAL(12, 4) DEFAULT 10.00,
    "monthlyBudget" DECIMAL(12, 4),
    "billingEmail" TEXT,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wallets_workspaceId_key" UNIQUE ("workspaceId")
);

CREATE INDEX "wallets_workspaceId_idx" ON "wallets"("workspaceId");
CREATE INDEX "wallets_stripeCustomerId_idx" ON "wallets"("stripeCustomerId");

ALTER TABLE "wallets" ADD CONSTRAINT "wallets_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "walletId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12, 4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "referenceId" TEXT,
    "referenceType" TEXT,
    "processedBy" UUID,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");
CREATE INDEX "transactions_type_idx" ON "transactions"("type");
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");
CREATE INDEX "transactions_referenceId_idx" ON "transactions"("referenceId");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" 
    FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(12, 4) NOT NULL,
    "taxAmount" DECIMAL(12, 4) DEFAULT 0,
    "totalAmount" DECIMAL(12, 4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "pdfUrl" TEXT,
    "lineItems" JSONB DEFAULT '[]',
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoices_invoiceNumber_key" UNIQUE ("invoiceNumber")
);

CREATE INDEX "invoices_workspaceId_idx" ON "invoices"("workspaceId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");
CREATE INDEX "invoices_stripeInvoiceId_idx" ON "invoices"("stripeInvoiceId");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- VOICE & PROVIDERS
-- ============================================

CREATE TABLE "voices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "VoiceProvider" NOT NULL,
    "providerVoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender",
    "language" TEXT NOT NULL,
    "accent" TEXT,
    "ageRange" TEXT,
    "previewUrl" TEXT,
    "sampleText" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "costPerMinute" DECIMAL(8, 6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "voices_provider_providerVoiceId_key" UNIQUE ("provider", "providerVoiceId")
);

CREATE INDEX "voices_provider_idx" ON "voices"("provider");
CREATE INDEX "voices_language_idx" ON "voices"("language");
CREATE INDEX "voices_isActive_idx" ON "voices"("isActive");

CREATE TABLE "provider_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "provider" "VoiceProvider" NOT NULL,
    "type" "ProviderType" NOT NULL,
    "config" JSONB DEFAULT '{}',
    "encryptedApiKey" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "status" "ProviderConfigStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "provider_configs_workspaceId_provider_type_key" UNIQUE ("workspaceId", "provider", "type")
);

CREATE INDEX "provider_configs_workspaceId_idx" ON "provider_configs"("workspaceId");
CREATE INDEX "provider_configs_provider_idx" ON "provider_configs"("provider");
CREATE INDEX "provider_configs_type_idx" ON "provider_configs"("type");

ALTER TABLE "provider_configs" ADD CONSTRAINT "provider_configs_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- ASSISTANTS
-- ============================================

CREATE TABLE "templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL DEFAULT 'GENERAL',
    "agentSpec" JSONB NOT NULL DEFAULT '{}',
    "providerConfig" JSONB DEFAULT '{}',
    "recommendedVoiceId" UUID,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "templates_category_idx" ON "templates"("category");
CREATE INDEX "templates_isPublic_idx" ON "templates"("isPublic");

ALTER TABLE "templates" ADD CONSTRAINT "templates_recommendedVoiceId_fkey" 
    FOREIGN KEY ("recommendedVoiceId") REFERENCES "voices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "assistants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AssistantStatus" NOT NULL DEFAULT 'DRAFT',
    "agentSpec" JSONB NOT NULL DEFAULT '{}',
    "providerConfig" JSONB DEFAULT '{}',
    "defaultVoiceId" UUID,
    "templateId" UUID,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" UUID,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assistants_workspaceId_idx" ON "assistants"("workspaceId");
CREATE INDEX "assistants_status_idx" ON "assistants"("status");
CREATE INDEX "assistants_templateId_idx" ON "assistants"("templateId");
CREATE INDEX "assistants_createdAt_idx" ON "assistants"("createdAt");

ALTER TABLE "assistants" ADD CONSTRAINT "assistants_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_defaultVoiceId_fkey" 
    FOREIGN KEY ("defaultVoiceId") REFERENCES "voices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_templateId_fkey" 
    FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "assistant_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assistantId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "agentSpec" JSONB NOT NULL DEFAULT '{}',
    "changelog" TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assistant_versions_assistantId_version_key" UNIQUE ("assistantId", "version")
);

CREATE INDEX "assistant_versions_assistantId_idx" ON "assistant_versions"("assistantId");

ALTER TABLE "assistant_versions" ADD CONSTRAINT "assistant_versions_assistantId_fkey" 
    FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- PHONE NUMBERS
-- ============================================

CREATE TABLE "phone_numbers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "provider" "TelephonyProvider" NOT NULL,
    "providerSid" TEXT,
    "assistantId" UUID,
    "type" "PhoneNumberType" NOT NULL DEFAULT 'BOTH',
    "status" "PhoneNumberStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB DEFAULT '{}',
    "webhookUrl" TEXT,
    "monthlyCost" DECIMAL(8, 4),
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "phone_numbers_workspaceId_number_key" UNIQUE ("workspaceId", "number")
);

CREATE INDEX "phone_numbers_workspaceId_idx" ON "phone_numbers"("workspaceId");
CREATE INDEX "phone_numbers_number_idx" ON "phone_numbers"("number");
CREATE INDEX "phone_numbers_assistantId_idx" ON "phone_numbers"("assistantId");
CREATE INDEX "phone_numbers_status_idx" ON "phone_numbers"("status");

ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_assistantId_fkey" 
    FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "phone_number_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phoneNumberId" UUID NOT NULL,
    "assistantId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "assignedBy" UUID,
    "reason" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "scheduleConfig" JSONB DEFAULT '{}',

    CONSTRAINT "phone_number_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "phone_number_assignments_phoneNumberId_idx" ON "phone_number_assignments"("phoneNumberId");
CREATE INDEX "phone_number_assignments_assistantId_idx" ON "phone_number_assignments"("assistantId");
CREATE INDEX "phone_number_assignments_assignedAt_idx" ON "phone_number_assignments"("assignedAt");

ALTER TABLE "phone_number_assignments" ADD CONSTRAINT "phone_number_assignments_phoneNumberId_fkey" 
    FOREIGN KEY ("phoneNumberId") REFERENCES "phone_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "phone_number_assignments" ADD CONSTRAINT "phone_number_assignments_assistantId_fkey" 
    FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CALLS
-- ============================================

CREATE TABLE "calls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "assistantId" UUID,
    "phoneNumberId" UUID,
    "direction" "CallDirection" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'QUEUED',
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "provider" "TelephonyProvider" NOT NULL,
    "providerCallSid" TEXT,
    "startedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "cost" DECIMAL(10, 6),
    "costBreakdown" JSONB DEFAULT '{}',
    "recordingUrl" TEXT,
    "recordingDuration" INTEGER,
    "transcript" JSONB DEFAULT '[]',
    "summary" TEXT,
    "outcome" "CallOutcome",
    "outcomeReason" TEXT,
    "extractedFields" JSONB DEFAULT '{}',
    "sentiment" "Sentiment",
    "sentimentScore" REAL,
    "qualityScore" INTEGER,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calls_workspaceId_idx" ON "calls"("workspaceId");
CREATE INDEX "calls_assistantId_idx" ON "calls"("assistantId");
CREATE INDEX "calls_phoneNumberId_idx" ON "calls"("phoneNumberId");
CREATE INDEX "calls_status_idx" ON "calls"("status");
CREATE INDEX "calls_direction_idx" ON "calls"("direction");
CREATE INDEX "calls_createdAt_idx" ON "calls"("createdAt");
CREATE INDEX "calls_startedAt_idx" ON "calls"("startedAt");
CREATE INDEX "calls_fromNumber_idx" ON "calls"("fromNumber");
CREATE INDEX "calls_toNumber_idx" ON "calls"("toNumber");
CREATE INDEX "calls_outcome_idx" ON "calls"("outcome");

ALTER TABLE "calls" ADD CONSTRAINT "calls_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calls" ADD CONSTRAINT "calls_assistantId_fkey" 
    FOREIGN KEY ("assistantId") REFERENCES "assistants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calls" ADD CONSTRAINT "calls_phoneNumberId_fkey" 
    FOREIGN KEY ("phoneNumberId") REFERENCES "phone_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "call_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "callId" UUID NOT NULL,
    "type" "CallEventType" NOT NULL,
    "payload" JSONB DEFAULT '{}',
    "providerEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "call_events_callId_idx" ON "call_events"("callId");
CREATE INDEX "call_events_type_idx" ON "call_events"("type");
CREATE INDEX "call_events_createdAt_idx" ON "call_events"("createdAt");

ALTER TABLE "call_events" ADD CONSTRAINT "call_events_callId_fkey" 
    FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "call_tool_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "callId" UUID NOT NULL,
    "toolId" UUID NOT NULL,
    "input" JSONB DEFAULT '{}',
    "output" JSONB DEFAULT '{}',
    "status" "ToolExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "error" TEXT,
    "errorCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_tool_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "call_tool_executions_callId_idx" ON "call_tool_executions"("callId");
CREATE INDEX "call_tool_executions_toolId_idx" ON "call_tool_executions"("toolId");
CREATE INDEX "call_tool_executions_status_idx" ON "call_tool_executions"("status");
CREATE INDEX "call_tool_executions_createdAt_idx" ON "call_tool_executions"("createdAt");

ALTER TABLE "call_tool_executions" ADD CONSTRAINT "call_tool_executions_callId_fkey" 
    FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- TOOLS
-- ============================================

CREATE TABLE "tools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ToolType" NOT NULL DEFAULT 'CUSTOM',
    "predefinedKey" TEXT,
    "parameterSchema" JSONB NOT NULL DEFAULT '{}',
    "responseSchema" JSONB DEFAULT '{}',
    "config" JSONB DEFAULT '{}',
    "implementation" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" REAL,
    "avgExecutionMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tools_workspaceId_name_key" UNIQUE ("workspaceId", "name")
);

CREATE INDEX "tools_workspaceId_idx" ON "tools"("workspaceId");
CREATE INDEX "tools_type_idx" ON "tools"("type");
CREATE INDEX "tools_isActive_idx" ON "tools"("isActive");
CREATE INDEX "tools_predefinedKey_idx" ON "tools"("predefinedKey");

ALTER TABLE "tools" ADD CONSTRAINT "tools_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "call_tool_executions" ADD CONSTRAINT "call_tool_executions_toolId_fkey" 
    FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tool_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "toolId" UUID NOT NULL,
    "callId" UUID,
    "input" JSONB DEFAULT '{}',
    "output" JSONB DEFAULT '{}',
    "status" "ToolExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "errorCode" TEXT,
    "durationMs" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'api',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tool_executions_toolId_idx" ON "tool_executions"("toolId");
CREATE INDEX "tool_executions_callId_idx" ON "tool_executions"("callId");
CREATE INDEX "tool_executions_status_idx" ON "tool_executions"("status");
CREATE INDEX "tool_executions_createdAt_idx" ON "tool_executions"("createdAt");

ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_toolId_fkey" 
    FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- INTEGRATIONS
-- ============================================

CREATE TABLE "integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB DEFAULT '{}',
    "oauthToken" JSONB DEFAULT '{}',
    "tokenExpiresAt" TIMESTAMP(3),
    "refreshToken" TEXT,
    "connectedAccount" JSONB DEFAULT '{}',
    "webhookUrl" TEXT,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integrations_workspaceId_type_name_key" UNIQUE ("workspaceId", "type", "name")
);

CREATE INDEX "integrations_workspaceId_idx" ON "integrations"("workspaceId");
CREATE INDEX "integrations_type_idx" ON "integrations"("type");
CREATE INDEX "integrations_status_idx" ON "integrations"("status");

ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "secret" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryIntervalMs" INTEGER NOT NULL DEFAULT 5000,
    "customHeaders" JSONB DEFAULT '{}',
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhooks_workspaceId_idx" ON "webhooks"("workspaceId");
CREATE INDEX "webhooks_isActive_idx" ON "webhooks"("isActive");

ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhookId" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB DEFAULT '{}',
    "requestBody" TEXT,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "responseHeaders" JSONB DEFAULT '{}',
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "signature" TEXT,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_deliveries_webhookId_idx" ON "webhook_deliveries"("webhookId");
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries"("status");
CREATE INDEX "webhook_deliveries_attemptedAt_idx" ON "webhook_deliveries"("attemptedAt");
CREATE INDEX "webhook_deliveries_event_idx" ON "webhook_deliveries"("event");

ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_fkey" 
    FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID,
    "changes" JSONB DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_workspaceId_idx" ON "audit_logs"("workspaceId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "voices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assistants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assistant_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phone_numbers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phone_number_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "call_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "call_tool_executions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_executions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE "workspaces" IS 'Multi-tenant workspace isolation';
COMMENT ON TABLE "workspace_members" IS 'Workspace membership with RBAC';
COMMENT ON TABLE "users" IS 'Platform users (can belong to multiple workspaces)';
COMMENT ON TABLE "wallets" IS 'Pay-as-you-go credit wallet per workspace';
COMMENT ON TABLE "transactions" IS 'All wallet transactions (credits, charges, refunds)';
COMMENT ON TABLE "invoices" IS 'Monthly billing invoices';
COMMENT ON TABLE "assistants" IS 'AI voice assistants';
COMMENT ON TABLE "assistant_versions" IS 'Version history for assistants';
COMMENT ON TABLE "templates" IS 'Reusable assistant templates';
COMMENT ON TABLE "voices" IS 'Available voice options from providers';
COMMENT ON TABLE "provider_configs" IS 'Workspace provider API configurations';
COMMENT ON TABLE "phone_numbers" IS 'Purchased phone numbers';
COMMENT ON TABLE "phone_number_assignments" IS 'Dynamic phone number routing';
COMMENT ON TABLE "calls" IS 'Call records with transcripts and analytics';
COMMENT ON TABLE "call_events" IS 'Real-time call event stream';
COMMENT ON TABLE "call_tool_executions" IS 'Tool calls during conversations';
COMMENT ON TABLE "tools" IS 'Custom and predefined tools';
COMMENT ON TABLE "tool_executions" IS 'Tool execution logs';
COMMENT ON TABLE "integrations" IS 'Third-party service integrations';
COMMENT ON TABLE "webhooks" IS 'Outbound webhook configurations';
COMMENT ON TABLE "webhook_deliveries" IS 'Webhook delivery attempts';
COMMENT ON TABLE "audit_logs" IS 'Comprehensive audit trail';
