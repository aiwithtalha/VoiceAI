# Voice AI Platform - Database Package

PostgreSQL database schema with Prisma ORM for a multi-tenant Universal Voice AI Platform.

## 📁 Package Structure

```
packages/database/
├── prisma/
│   ├── schema.prisma          # Main Prisma schema definition
│   ├── seed.ts                # Development seed data
│   └── migrations/
│       └── 20250101000000_init/
│           └── migration.sql  # Initial migration
├── src/
│   ├── client.ts              # Prisma client singleton
│   └── index.ts               # Package exports
├── generated/                 # Generated Prisma client (after build)
│   └── client/
├── package.json
└── README.md
```

## 🏗️ Architecture Overview

### Multi-Tenant Design

The platform uses **workspace-based tenancy** with complete data isolation:

- Each workspace is a separate tenant
- All entities belong to a workspace via `workspaceId`
- Row-level security (RLS) policies for additional protection
- Users can belong to multiple workspaces with different roles

### Core Entities

```
┌─────────────────────────────────────────────────────────────────┐
│                         WORKSPACE                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Members    │  │    Wallet    │  │  Assistants  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Phone Numbers │  │    Calls     │  │    Tools     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Integrations  │  │   Webhooks   │  │  Audit Logs  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Schema Documentation

### 1. Workspace & Tenancy

#### `Workspace`
The root entity for multi-tenant isolation.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Workspace display name |
| `slug` | String | Unique URL-friendly identifier |
| `plan` | Enum | FREE, STARTER, PRO, ENTERPRISE |
| `status` | Enum | ACTIVE, SUSPENDED, PENDING_DELETION, DELETED |
| `settings` | JSON | Workspace-specific configuration |
| `metadata` | JSON | Custom metadata (industry, size, etc.) |

#### `User`
Platform users (can belong to multiple workspaces).

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `email` | String | Unique email address |
| `name` | String | Display name |
| `authProvider` | Enum | EMAIL, GOOGLE, GITHUB, MICROSOFT, SAML |
| `preferences` | JSON | User preferences (theme, notifications) |

#### `WorkspaceMember`
RBAC membership linking users to workspaces.

| Field | Type | Description |
|-------|------|-------------|
| `role` | Enum | OWNER, ADMIN, MEMBER, VIEWER |
| `status` | Enum | PENDING, ACCEPTED, DECLINED, EXPIRED |
| `permissions` | JSON | Granular permission overrides |

### 2. Billing & Wallet

#### `Wallet`
Pay-as-you-go credit system per workspace.

| Field | Type | Description |
|-------|------|-------------|
| `balance` | Decimal | Current credit balance |
| `autoTopUp` | Boolean | Enable automatic top-ups |
| `autoTopUpAmount` | Decimal | Amount to add on auto-top-up |
| `lowBalanceThreshold` | Decimal | Alert threshold |
| `monthlyBudget` | Decimal | Spending limit |

#### `Transaction`
All wallet activity (credits, charges, refunds).

| Field | Type | Description |
|-------|------|-------------|
| `type` | Enum | CREDIT_PURCHASE, CREDIT_REFUND, USAGE_CHARGE, etc. |
| `amount` | Decimal | Transaction amount |
| `referenceId` | String | Related entity (call, invoice) |

#### `Invoice`
Monthly billing invoices.

| Field | Type | Description |
|-------|------|-------------|
| `invoiceNumber` | String | Unique invoice number |
| `periodStart/End` | DateTime | Billing period |
| `lineItems` | JSON | Detailed charges |
| `stripeInvoiceId` | String | Stripe integration |

### 3. Assistants

#### `Assistant`
AI voice assistant configuration.

| Field | Type | Description |
|-------|------|-------------|
| `agentSpec` | JSON | Complete assistant configuration |
| `providerConfig` | JSON | Provider-specific settings |
| `status` | Enum | DRAFT, PUBLISHED, ARCHIVED, DISABLED |
| `currentVersion` | Int | Current version number |
| `totalCalls` | Int | Lifetime call count |

**Agent Spec Structure:**
```json
{
  "name": "Support Agent",
  "firstMessage": "Hello! How can I help?",
  "systemPrompt": "You are a helpful support agent...",
  "llm": { "provider": "openai", "model": "gpt-4o" },
  "voice": { "provider": "elevenlabs", "voiceId": "..." },
  "transcriber": { "provider": "deepgram", "model": "nova-2" },
  "tools": ["transfer_call", "create_ticket"]
}
```

#### `AssistantVersion`
Version history for assistants.

| Field | Type | Description |
|-------|------|-------------|
| `version` | Int | Version number |
| `agentSpec` | JSON | Snapshot of configuration |
| `changelog` | String | Change description |

#### `Template`
Reusable assistant templates.

| Field | Type | Description |
|-------|------|-------------|
| `category` | Enum | SUPPORT, SALES, BOOKING, SURVEY, etc. |
| `agentSpec` | JSON | Template configuration |
| `isPublic` | Boolean | Available to all workspaces |

### 4. Voice & Providers

#### `Voice`
Available voice options from providers.

| Field | Type | Description |
|-------|------|-------------|
| `provider` | Enum | ELEVENLABS, OPENAI, AZURE, etc. |
| `providerVoiceId` | String | Provider's voice identifier |
| `language` | String | ISO 639-1 language code |
| `costPerMinute` | Decimal | Pricing per minute |

#### `ProviderConfig`
Workspace provider API configurations.

| Field | Type | Description |
|-------|------|-------------|
| `provider` | Enum | Voice provider |
| `type` | Enum | LLM, VOICE, TELEPHONY, TRANSCRIPTION |
| `config` | JSON | Provider settings |
| `encryptedApiKey` | String | Encrypted API key |
| `isDefault` | Boolean | Default for this provider type |

### 5. Phone Numbers

#### `PhoneNumber`
Purchased phone numbers.

| Field | Type | Description |
|-------|------|-------------|
| `number` | String | E.164 format phone number |
| `provider` | Enum | TWILIO, VONAGE, TELNYX, PLIVO |
| `providerSid` | String | Provider's identifier |
| `type` | Enum | INBOUND, OUTBOUND, BOTH |
| `monthlyCost` | Decimal | Recurring cost |

#### `PhoneNumberAssignment`
Dynamic phone number routing.

| Field | Type | Description |
|-------|------|-------------|
| `priority` | Int | Routing priority |
| `scheduleConfig` | JSON | Time-based routing rules |

### 6. Calls

#### `Call`
Complete call records with analytics.

| Field | Type | Description |
|-------|------|-------------|
| `direction` | Enum | INBOUND, OUTBOUND |
| `status` | Enum | QUEUED, RINGING, IN_PROGRESS, COMPLETED, etc. |
| `duration` | Int | Call duration in seconds |
| `cost` | Decimal | Total call cost |
| `costBreakdown` | JSON | Detailed cost breakdown |
| `transcript` | JSON | Array of utterances |
| `summary` | Text | AI-generated summary |
| `outcome` | Enum | SUCCESS, FAILED, VOICEMAIL, etc. |
| `extractedFields` | JSON | Extracted data (email, date, etc.) |
| `sentiment` | Enum | POSITIVE, NEUTRAL, NEGATIVE |
| `sentimentScore` | Float | Sentiment confidence |
| `qualityScore` | Int | Call quality (0-100) |

**Transcript Structure:**
```json
[
  { "speaker": "assistant", "text": "Hello!", "timestamp": 0 },
  { "speaker": "user", "text": "Hi there", "timestamp": 2.5 }
]
```

#### `CallEvent`
Real-time call event stream.

| Field | Type | Description |
|-------|------|-------------|
| `type` | Enum | INITIATED, RINGING, ANSWERED, SPEECH_DETECTED, etc. |
| `payload` | JSON | Event-specific data |

#### `CallToolExecution`
Tool calls during conversations.

| Field | Type | Description |
|-------|------|-------------|
| `input` | JSON | Tool input parameters |
| `output` | JSON | Tool output |
| `status` | Enum | PENDING, RUNNING, SUCCESS, FAILED, etc. |
| `retryCount` | Int | Number of retry attempts |

### 7. Tools

#### `Tool`
Custom and predefined tools.

| Field | Type | Description |
|-------|------|-------------|
| `type` | Enum | PREDEFINED, CUSTOM, INTEGRATION |
| `parameterSchema` | JSON | JSON Schema for parameters |
| `responseSchema` | JSON | JSON Schema for response |
| `implementation` | Text | Custom tool code |
| `timeoutMs` | Int | Execution timeout |

#### `ToolExecution`
Tool execution logs.

| Field | Type | Description |
|-------|------|-------------|
| `source` | String | API, call, webhook, etc. |
| `durationMs` | Int | Execution time |

### 8. Integrations

#### `Integration`
Third-party service integrations.

| Field | Type | Description |
|-------|------|-------------|
| `type` | Enum | GOOGLE_SHEETS, GOOGLE_CALENDAR, SLACK, etc. |
| `config` | JSON | Integration settings |
| `oauthToken` | JSON | Encrypted OAuth tokens |
| `status` | Enum | PENDING, CONNECTED, DISCONNECTED, ERROR |

#### `Webhook`
Outbound webhook configurations.

| Field | Type | Description |
|-------|------|-------------|
| `url` | String | Webhook endpoint |
| `events` | JSON | Subscribed events |
| `secret` | String | Signature verification |
| `maxRetries` | Int | Retry attempts |

#### `WebhookDelivery`
Webhook delivery attempts.

| Field | Type | Description |
|-------|------|-------------|
| `status` | Enum | PENDING, DELIVERED, FAILED, RETRYING |
| `responseStatus` | Int | HTTP response code |
| `attemptNumber` | Int | Current attempt |

### 9. Audit Logs

#### `AuditLog`
Comprehensive audit trail.

| Field | Type | Description |
|-------|------|-------------|
| `action` | String | e.g., "assistant.create", "call.initiated" |
| `entity` | String | Entity type |
| `changes` | JSON | Before/after values |
| `severity` | Enum | DEBUG, INFO, WARNING, ERROR, CRITICAL |

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### Environment Variables

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/voice_ai_platform"
```

### Usage

```typescript
import { prisma, Workspace, PlanType } from '@voice-ai/database';

// Create workspace
const workspace = await prisma.workspace.create({
  data: {
    name: 'My Workspace',
    slug: 'my-workspace',
    plan: PlanType.PRO,
  },
});

// Query with relations
const workspaceWithMembers = await prisma.workspace.findUnique({
  where: { id: workspaceId },
  include: {
    members: {
      include: { user: true },
    },
    wallet: true,
  },
});

// Query calls with pagination
const calls = await prisma.call.findMany({
  where: { workspaceId },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: 0,
});
```

## 📈 Indexes

The schema includes strategic indexes for performance:

- **Workspace queries**: `slug`, `status`, `plan`, `createdAt`
- **Call queries**: `workspaceId`, `assistantId`, `status`, `createdAt`, `fromNumber`, `toNumber`
- **Billing queries**: `walletId`, `type`, `createdAt`
- **Audit queries**: `workspaceId`, `action`, `entity`, `createdAt`

## 🔒 Security

- **UUID primary keys** prevent enumeration attacks
- **Row-level security** policies on all tables
- **Encrypted API keys** in provider configs
- **Webhook signature verification** with secrets
- **Audit logging** for all significant actions

## 🔄 Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_new_feature

# Deploy to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## 🧪 Testing

```bash
# Run seed for fresh data
npx prisma db seed

# Studio for data inspection
npx prisma studio
```

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Design Best Practices](https://pris.ly/d/database-design)
