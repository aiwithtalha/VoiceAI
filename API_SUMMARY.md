# Voice AI Platform - Backend API Summary

This document provides a comprehensive overview of the backend API services, routes, and utilities created for the Voice AI Platform.

## 📁 Project Structure

```
/mnt/okcomputer/output/voice-ai-platform/apps/api/src/
├── config/
│   └── index.ts              # Environment configuration
├── middleware/
│   ├── auth.ts               # JWT & API key authentication
│   ├── workspace.ts          # Workspace context validation
│   ├── rateLimit.ts          # Rate limiting middleware
│   └── errorHandler.ts       # Global error handling
├── routes/
│   ├── auth.ts               # Authentication endpoints
│   ├── billing.ts            # Wallet & billing endpoints
│   ├── assistants.ts         # Assistant CRUD endpoints
│   ├── calls.ts              # Call management endpoints
│   ├── phone-numbers.ts      # Phone number management
│   ├── webhooks.ts           # Twilio & Stripe webhooks
│   ├── workspaces.ts         # Workspace management
│   ├── team.ts               # Team member management
│   ├── tools.ts              # Tool management
│   └── integrations.ts       # Third-party integrations
├── services/
│   ├── auth.ts               # Authentication service
│   ├── billing.ts            # Billing & wallet service
│   ├── assistants.ts         # Assistant management service
│   ├── call.ts               # Call lifecycle service
│   ├── voice-engine-client.ts # Voice Engine HTTP client
│   └── tools.ts              # Tool execution service
├── utils/
│   ├── encryption.ts         # AES-256 encryption utilities
│   ├── jwt.ts                # JWT token utilities
│   ├── webhook.ts            # Webhook signature utilities
│   └── logger.ts             # Structured logging
└── types/
    └── index.ts              # TypeScript type definitions
```

---

## 🔧 Services

### 1. Billing Service (`src/services/billing.ts`)

Handles wallet management, Stripe integration, and credit transactions.

#### Functions:

| Function | Description |
|----------|-------------|
| `getWallet(workspaceId)` | Get or create wallet for a workspace |
| `getWalletBalance(workspaceId)` | Get current wallet balance in cents |
| `hasSufficientCredits(workspaceId, amount)` | Check if workspace has enough credits |
| `deductCredits(workspaceId, amount, callId, description?)` | Atomically deduct credits for call costs |
| `addCredits(workspaceId, amount, description, metadata?)` | Add credits after successful payment |
| `refundCredits(workspaceId, amount, callId, reason)` | Refund credits for failed calls |
| `addBonusCredits(workspaceId, amount, reason)` | Add promotional/referral credits |
| `createCheckoutSession({workspaceId, amount, successUrl, cancelUrl})` | Create Stripe checkout session |
| `createTopUpSession(workspaceId, amount, successUrl?, cancelUrl?)` | Convenience alias for checkout session |
| `handleStripeWebhook(payload, signature)` | Process Stripe webhook events |
| `getTransactions(workspaceId, options?)` | Get transaction history |
| `getInvoices(workspaceId)` | Get invoice history |
| `updateAutoRechargeSettings(workspaceId, settings)` | Configure auto-recharge |
| `getPricingRates()` | Get current pricing rates |
| `estimateCallCost(durationMinutes, providers)` | Estimate call cost |

---

### 2. Assistant Service (`src/services/assistants.ts`)

Manages AI assistant CRUD operations, publishing, and versioning.

#### Functions:

| Function | Description |
|----------|-------------|
| `createAssistantService(workspaceId, userId, input)` | Create a new assistant |
| `updateAssistantService(assistantId, input)` | Update an existing assistant |
| `getAssistant(assistantId)` | Get assistant by ID |
| `getAssistantForCall(assistantId)` | Get assistant config for voice engine |
| `listAssistants(workspaceId)` | List all assistants for workspace |
| `deleteAssistantService(assistantId)` | Delete an assistant |
| `publishAssistant(assistantId, userId)` | Publish assistant (makes active) |
| `unpublishAssistant(assistantId)` | Unpublish assistant |
| `createNewVersion(assistantId, userId, configChanges)` | Create new version |
| `getAssistantVersionHistory(assistantId)` | Get version history |
| `rollbackToVersion(assistantId, versionNumber, userId)` | Rollback to specific version |
| `listTemplates()` | List available templates |
| `getTemplate(templateId)` | Get specific template |
| `createAssistantFromTemplate(workspaceId, userId, templateId, name)` | Create from template |
| `getDefaultAssistantConfig()` | Get default configuration |

---

### 3. Call Service (`src/services/call.ts`)

Manages call lifecycle, telephony integration, and transcripts.

#### Functions:

| Function | Description |
|----------|-------------|
| `initiateOutboundCall(input)` | Start an outbound call |
| `handleInboundCall(twilioParams)` | Handle incoming Twilio webhook |
| `endCall(input)` | End a call and process billing |
| `handleCallFailure(callId, reason, deductAmount?)` | Handle failed calls with refund |
| `getCallTranscript(callId)` | Retrieve call transcript |
| `saveTranscriptSegment(callId, segment)` | Save transcript during call |
| `listCalls(filters)` | List calls with filters |
| `getCall(callId)` | Get single call details |
| `getCallStats(workspaceId)` | Get workspace call statistics |
| `handleTwilioStatusCallback(callSid, status, duration?)` | Process Twilio status |
| `handleTwilioRecordingCallback(callSid, recordingUrl, duration?)` | Process recording |

---

### 4. Voice Engine Client (`src/services/voice-engine-client.ts`)

HTTP client for communicating with the Voice Engine service.

#### Functions:

| Function | Description |
|----------|-------------|
| `startCallSession(input)` | Initialize voice engine session |
| `endCallSession(callId)` | Terminate voice engine session |
| `getSessionStatus(callId)` | Get session status |
| `sendSessionMessage(callId, message)` | Send message to active session |
| `injectAssistantMessage(callId, text)` | Make assistant speak text |
| `triggerFunctionCall(callId, functionName, parameters)` | Trigger function during call |
| `transferCall(callId, transferTo)` | Transfer call to number |
| `healthCheck()` | Check voice engine health |
| `validateSessionToken(token, callId)` | Validate WebSocket token |

#### Utility Functions:

| Function | Description |
|----------|-------------|
| `getCallWebsocketUrl(callId, sessionToken)` | Generate WebSocket URL |
| `isVoiceEngineHealthy()` | Check if voice engine is healthy |
| `formatAssistantConfigForVoiceEngine(config)` | Format config for API |

---

## 🛣️ Routes

### 1. Billing Routes (`src/routes/billing.ts`)

Base path: `/v1/billing`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/wallet` | Get wallet details | Yes |
| GET | `/balance` | Get wallet balance only | Yes |
| POST | `/topup` | Create checkout session | Yes |
| POST | `/webhook` | Stripe webhook handler | No (signature verified) |
| GET | `/transactions` | Get transaction history | Yes |
| GET | `/invoices` | Get invoice history | Yes |
| GET | `/invoices/:invoiceId/download` | Download invoice PDF | Yes |
| GET | `/pricing` | Get pricing rates | No |
| POST | `/estimate` | Estimate call cost | Yes |
| GET | `/auto-recharge` | Get auto-recharge settings | Yes |
| PATCH | `/auto-recharge` | Update auto-recharge settings | Yes |
| GET | `/usage` | Get usage statistics | Yes |

---

### 2. Assistants Routes (`src/routes/assistants.ts`)

Base path: `/v1/assistants`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List all assistants | Yes |
| POST | `/` | Create new assistant | Yes (Admin) |
| GET | `/templates` | List templates | Yes |
| GET | `/templates/:templateId` | Get template | Yes |
| POST | `/from-template` | Create from template | Yes (Admin) |
| GET | `/:assistantId` | Get assistant details | Yes |
| PATCH | `/:assistantId` | Update assistant | Yes (Admin) |
| DELETE | `/:assistantId` | Delete assistant | Yes (Admin) |
| POST | `/:assistantId/publish` | Publish assistant | Yes (Admin) |
| POST | `/:assistantId/unpublish` | Unpublish assistant | Yes (Admin) |
| POST | `/:assistantId/versions` | Create new version | Yes (Admin) |
| GET | `/:assistantId/versions` | Get version history | Yes |
| POST | `/:assistantId/rollback` | Rollback to version | Yes (Admin) |
| POST | `/:assistantId/clone` | Clone assistant | Yes (Admin) |

---

### 3. Calls Routes (`src/routes/calls.ts`)

Base path: `/v1/calls`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List calls with filters | Yes |
| POST | `/` | Initiate outbound call | Yes |
| GET | `/stats` | Get call statistics | Yes |
| GET | `/:callId` | Get call details | Yes |
| GET | `/:callId/transcript` | Get call transcript | Yes |
| GET | `/:callId/recording` | Get recording URL | Yes |
| POST | `/:callId/end` | End active call | Yes |
| POST | `/:callId/fail` | Mark call as failed | Yes |
| GET | `/:callId/analysis` | Get call analysis | Yes |

---

### 4. Phone Numbers Routes (`src/routes/phone-numbers.ts`)

Base path: `/v1/phone-numbers`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/available` | Search available numbers | Yes (Admin) |
| POST | `/` | Purchase phone number | Yes (Admin) |
| GET | `/` | List workspace numbers | Yes |
| GET | `/:phoneNumberId` | Get number details | Yes |
| DELETE | `/:phoneNumberId` | Release number | Yes (Admin) |
| PATCH | `/:phoneNumberId/assistant` | Assign assistant | Yes (Admin) |
| PATCH | `/:phoneNumberId/settings` | Update settings | Yes (Admin) |
| GET | `/providers` | List providers | Yes |

---

### 5. Webhooks Routes (`src/routes/webhooks.ts`)

Base path: `/webhooks`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/twilio/voice` | Incoming call webhook | No (Twilio signed) |
| POST | `/twilio/status` | Call status callback | No (Twilio signed) |
| POST | `/twilio/recording` | Recording callback | No (Twilio signed) |
| POST | `/twilio/fallback` | Fallback handler | No |
| POST | `/stripe` | Stripe events | No (Stripe signed) |
| POST | `/custom/:webhookId` | Custom webhooks | Varies |
| GET | `/health` | Webhook health check | No |

---

### 6. Authentication Routes (`src/routes/auth.ts`)

Base path: `/v1/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login with email/password |
| POST | `/logout` | Logout user |
| POST | `/refresh` | Refresh access token |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with token |
| GET | `/me` | Get current user |
| GET | `/google` | Google OAuth login |
| GET | `/google/callback` | Google OAuth callback |
| GET | `/linkedin` | LinkedIn OAuth login |
| GET | `/linkedin/callback` | LinkedIn OAuth callback |

---

### 7. Workspace Routes (`src/routes/workspaces.ts`)

Base path: `/v1/workspaces`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user workspaces |
| POST | `/` | Create workspace |
| GET | `/:workspaceId` | Get workspace details |
| PATCH | `/:workspaceId` | Update workspace |
| DELETE | `/:workspaceId` | Delete workspace |
| GET | `/:workspaceId/settings` | Get settings |
| PATCH | `/:workspaceId/settings` | Update settings |
| GET | `/:workspaceId/api-keys` | List API keys |
| POST | `/:workspaceId/api-keys` | Create API key |
| DELETE | `/:workspaceId/api-keys/:keyId` | Revoke API key |

---

## 🔐 Middleware

### Authentication Middleware (`src/middleware/auth.ts`)

| Middleware | Description |
|------------|-------------|
| `authenticateJwt` | Verify JWT access token |
| `optionalAuthenticateJwt` | Optional JWT verification |
| `authenticateApiKey` | Verify API key |
| `authenticate` | Try JWT, fallback to API key |
| `requireWorkspaceRoles(...roles)` | Require specific workspace roles |
| `requireWorkspaceOwner` | Require workspace ownership |
| `requireWorkspaceAdmin` | Require admin or owner role |

### Workspace Middleware (`src/middleware/workspace.ts`)

| Middleware | Description |
|------------|-------------|
| `workspaceMiddleware` | Extract and validate workspace ID |
| `optionalWorkspaceMiddleware` | Optional workspace context |
| `requireActiveWorkspace` | Ensure workspace is active |
| `workspaceParamMiddleware` | Validate workspace ID parameter |

---

## 🛠️ Utilities

### Encryption (`src/utils/encryption.ts`)

| Function | Description |
|----------|-------------|
| `encrypt(plaintext)` | AES-256-GCM encryption |
| `decrypt(encryptedData)` | AES-256-GCM decryption |
| `encryptObject(data)` | Encrypt JSON object |
| `decryptObject(encryptedData)` | Decrypt to object |
| `encryptFields(data, fields)` | Encrypt specific fields |
| `decryptFields(data, fields)` | Decrypt specific fields |
| `encryptApiKey(apiKey)` | Encrypt API key |
| `decryptApiKey(encryptedApiKey)` | Decrypt API key |
| `encryptCredentials(credentials)` | Encrypt credentials object |
| `decryptCredentials(encryptedCredentials)` | Decrypt credentials |
| `hashPassword(password)` | bcrypt password hash |
| `verifyPassword(password, hash)` | Verify password |
| `generateSecureToken(length?)` | Generate random token |
| `generateUrlSafeToken(length?)` | Generate URL-safe token |
| `generateHmac(data, secret)` | Generate HMAC signature |
| `verifyHmac(data, signature, secret)` | Verify HMAC signature |

### JWT Utilities (`src/utils/jwt.ts`)

| Function | Description |
|----------|-------------|
| `generateAccessToken(payload)` | Generate JWT access token |
| `verifyAccessToken(token)` | Verify and decode access token |
| `decodeAccessToken(token)` | Decode without verification |
| `generateRefreshToken(payload)` | Generate refresh token |
| `verifyRefreshToken(token)` | Verify refresh token |
| `generateTokenPair(payload)` | Generate both tokens |
| `refreshAccessToken(refreshToken)` | Refresh access token |
| `getTokenExpiration(token)` | Get expiration timestamp |
| `isTokenExpired(token)` | Check if token expired |
| `getTimeUntilExpiration(token)` | Get time until expiration |
| `generateApiKey()` | Generate secure API key |
| `getApiKeyPrefix(apiKey)` | Get API key prefix for display |
| `hashApiKey(apiKey)` | Hash API key for storage |
| `verifyApiKey(apiKey, hash)` | Verify API key against hash |

### Webhook Utilities (`src/utils/webhook.ts`)

| Function | Description |
|----------|-------------|
| `generateWebhookSignature(payload, secret, timestamp?)` | Sign webhook payload |
| `generateWebhookHeaders(payload, secret)` | Generate webhook headers |
| `parseSignatureHeader(signatureHeader)` | Parse signature header |
| `verifyWebhookSignature(payload, signatureHeader, secret, tolerance?)` | Verify signature |
| `verifyWebhookRequest(rawBody, headers, secret)` | Verify from request |
| `generateWebhookSecret()` | Generate new webhook secret |
| `generateWebhookEndpointId()` | Generate endpoint ID |
| `createWebhookPayload(event, data)` | Create standard payload |
| `generateWebhookId()` | Generate unique event ID |
| `deliverWebhook(url, payload, secret, timeout?)` | Deliver webhook |
| `eventMatchesPattern(event, pattern)` | Match event to pattern |
| `shouldDeliverEvent(event, subscribedEvents)` | Check if should deliver |
| `calculateRetryDelay(attempt, baseDelay?, maxDelay?)` | Calculate backoff |
| `shouldRetryWebhook(result, maxAttempts?, currentAttempt?)` | Check if should retry |

---

## 📊 Type Definitions

Key types are defined in `src/types/index.ts`:

- `User` - User account information
- `Workspace` - Workspace/organization data
- `Assistant` - AI assistant configuration
- `AssistantConfig` - Voice, LLM, STT, telephony settings
- `Call` - Call record and metadata
- `CallTranscript` - Transcript with segments
- `PhoneNumber` - Phone number details
- `Wallet` - Wallet balance and settings
- `Transaction` - Credit transaction record
- `Tool` - Custom tool definition
- `ApiError` - Custom error class

---

## 🔌 Integration Points

### External Services

| Service | Integration |
|---------|-------------|
| **Stripe** | Payment processing, subscriptions |
| **Twilio** | Telephony, voice calls, SMS |
| **Deepgram** | Speech-to-text |
| **ElevenLabs** | Text-to-speech |
| **OpenAI** | LLM (GPT-4, GPT-3.5) |
| **Anthropic** | LLM (Claude) |
| **Google OAuth** | Social login |
| **LinkedIn OAuth** | Social login |

### Internal Services

| Service | Purpose |
|---------|---------|
| **Voice Engine** | Real-time voice processing |
| **Database** | PostgreSQL via Prisma |
| **Redis** | Caching, session storage (optional) |

---

## 🚀 Getting Started

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/voice_ai

# JWT
JWT_SECRET=your-32-char-secret-here
JWT_REFRESH_SECRET=your-32-char-refresh-secret

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_API_KEY=...
TWILIO_API_SECRET=...

# Provider API Keys
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Voice Engine
VOICE_ENGINE_URL=http://localhost:3002
VOICE_ENGINE_WS_URL=ws://localhost:3002
VOICE_ENGINE_API_KEY=...
```

### Running the API

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check
```

---

## 📄 License

Private - Voice AI Platform
