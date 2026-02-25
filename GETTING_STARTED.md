# Universal Voice AI Platform - Getting Started Guide

## 🎉 Project Successfully Built!

This is a production-grade, self-serve Voice AI Platform that enables businesses to create, deploy, and manage real-time AI voice agents.

---

## 📁 Project Structure

```
voice-ai-platform/
├── apps/
│   ├── web/              # Next.js 14+ frontend (Port 3000)
│   ├── api/              # Node.js/Express backend API (Port 3001)
│   └── voice-engine/     # Real-time voice processing service (Port 3002)
├── packages/
│   ├── database/         # Prisma ORM with PostgreSQL schema
│   └── shared/           # Shared types and utilities
├── docker-compose.yml    # Full local development stack
└── README.md            # Full documentation
```

---

## 🚀 Quick Start (5 minutes)

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development without Docker)
- Git

### 1. Clone and Setup

```bash
cd /mnt/okcomputer/output/voice-ai-platform

# Copy environment file
cp .env.example .env

# Edit .env with your API keys (see Configuration section below)
nano .env
```

### 2. Start All Services

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d

# View logs
docker-compose logs -f
```

### 3. Access the Application

| Service      | URL                   | Description                |
| ------------ | --------------------- | -------------------------- |
| Web App      | http://localhost:3000 | Dashboard & Public Website |
| API          | http://localhost:3001 | REST API                   |
| Voice Engine | ws://localhost:3002   | WebSocket for calls        |
| PostgreSQL   | localhost:5432        | Database                   |
| Redis        | localhost:6379        | Cache                      |

### 4. Initialize Database

```bash
# In a new terminal
docker-compose exec api npx prisma migrate dev
docker-compose exec api npx prisma db seed
```

---

## 🔐 Required Configuration

Edit `.env` file with your actual API keys:

### Authentication

```env
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NEXTAUTH_SECRET=your-nextauth-secret-key
```

### Twilio (Telephony)

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY=
TWILIO_API_SECRET=
```

### AI Providers

```env
# Deepgram (Speech-to-Text)
DEEPGRAM_API_KEY=

# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=

# OpenAI (LLM)
OPENAI_API_KEY=

# Optional: Anthropic
ANTHROPIC_API_KEY=
```

### Stripe (Billing)

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

### OAuth (Optional)

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

---

## 🧪 Testing the Platform

### 1. Create an Account

- Visit http://localhost:3000
- Click "Get Started"
- Register with email or use Google/LinkedIn OAuth

### 2. Complete Onboarding

- Select your use case (Sales, Support, Booking, etc.)
- Choose a template or start from scratch
- Configure providers (Twilio, Deepgram, ElevenLabs, OpenAI)

### 3. Build Your First AI Agent

- Use the Composer (chat-to-agent builder)
- Define agent goal and conversation flow
- Select voice and language
- Test with the built-in simulator

### 4. Get a Phone Number

- Go to Phone Numbers section
- Search by area code
- Purchase a number ($1-3/month)
- Assign to your assistant

### 5. Add Credits

- Go to Billing section
- Top up with test card: `4242 4242 4242 4242`
- Any future date, any CVC

### 6. Make a Test Call

- Click "Test Call" on your assistant
- Enter your phone number
- Receive a call from your AI agent!

---

## 📚 Key Features

### ✅ Implemented

| Feature            | Status | Description                                 |
| ------------------ | ------ | ------------------------------------------- |
| **Auth**           | ✅     | Email/password, Google, LinkedIn OAuth, OTP |
| **Dashboard**      | ✅     | Complete dashboard with all modules         |
| **Composer**       | ✅     | Chat-to-agent builder with templates        |
| **Voice Engine**   | ✅     | Real-time streaming with barge-in           |
| **Providers**      | ✅     | Twilio, Deepgram, ElevenLabs, OpenAI        |
| **Phone Numbers**  | ✅     | Buy, assign, manage numbers                 |
| **Billing**        | ✅     | Wallet credits, Stripe, 30s billing         |
| **Call Logs**      | ✅     | Transcripts, recordings, summaries          |
| **Tools**          | ✅     | 6 predefined + custom tool builder          |
| **Integrations**   | ✅     | Google Calendar, Sheets, Webhooks           |
| **Team/RBAC**      | ✅     | Multi-user with roles                       |
| **Public Website** | ✅     | Landing, pricing, docs, demo                |

---

## 🏗 Architecture

### Voice Pipeline

```
Inbound Call → Twilio → WebSocket → Deepgram STT → OpenAI LLM → ElevenLabs TTS → Twilio → Caller
                    ↓
              Tool Execution (Calendar, SMS, Transfer)
                    ↓
              Billing (30s increments)
```

### Tech Stack

| Layer    | Technology                                  |
| -------- | ------------------------------------------- |
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend  | Node.js, Express, TypeScript                |
| Database | PostgreSQL 15, Prisma ORM                   |
| Cache    | Redis                                       |
| Voice    | Twilio, Deepgram, ElevenLabs                |
| AI       | OpenAI GPT-4o-mini                          |
| Billing  | Stripe                                      |
| Deploy   | Docker, Docker Compose                      |

---

## 🛠 Development Commands

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up web
docker-compose up api
docker-compose up voice-engine

# View logs
docker-compose logs -f [service]

# Restart service
docker-compose restart [service]

# Database migrations
docker-compose exec api npx prisma migrate dev

# Database seed
docker-compose exec api npx prisma db seed

# Open Prisma Studio
docker-compose exec api npx prisma studio

# Install dependencies
docker-compose exec web npm install [package]
docker-compose exec api npm install [package]

# Run tests
docker-compose exec api npm test
docker-compose exec web npm test
```

---

## 📖 API Documentation

### Authentication

All API requests require authentication:

```bash
# Using JWT
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/v1/assistants

# Using API Key
curl -H "X-API-Key: YOUR_API_KEY" \
  http://localhost:3001/v1/assistants
```

### Key Endpoints

| Endpoint                | Method | Description               |
| ----------------------- | ------ | ------------------------- |
| `/v1/auth/login`        | POST   | Login with email/password |
| `/v1/auth/register`     | POST   | Register new account      |
| `/v1/assistants`        | GET    | List assistants           |
| `/v1/assistants`        | POST   | Create assistant          |
| `/v1/assistants/:id`    | GET    | Get assistant details     |
| `/v1/calls`             | GET    | List calls                |
| `/v1/calls/:id`         | GET    | Get call details          |
| `/v1/billing/wallet`    | GET    | Get wallet balance        |
| `/v1/billing/topup`     | POST   | Create top-up session     |
| `/v1/phone-numbers`     | GET    | List phone numbers        |
| `/v1/phone-numbers/buy` | POST   | Purchase number           |

Full API documentation: http://localhost:3000/docs

---

## 🔧 Troubleshooting

### Issue: Services won't start

```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### Issue: Database connection failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database URL in .env
# Should be: postgresql://postgres:password@postgres:5432/voiceai
```

### Issue: Voice calls not working

```bash
# Check Twilio credentials in .env
# Verify webhook URL is configured in Twilio console
# Check voice-engine logs: docker-compose logs voice-engine
```

### Issue: Billing not working

```bash
# Check Stripe keys in .env
# Verify Stripe webhook endpoint is configured
# Check API logs: docker-compose logs api
```

---

## 🚀 Production Deployment

### 1. Environment Setup

```bash
# Set production environment
export NODE_ENV=production

# Generate strong secrets
openssl rand -base64 32
```

### 2. Database

- Use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- Enable automated backups
- Configure connection pooling (PgBouncer)

### 3. Redis

- Use managed Redis (AWS ElastiCache, Redis Cloud)
- Enable persistence

### 4. SSL/TLS

- Use Let's Encrypt or managed certificates
- Configure HTTPS in docker-compose

### 5. Monitoring

- Set up logging aggregation (ELK, Datadog)
- Configure alerting (PagerDuty, Opsgenie)
- Monitor call quality and latency

---

## 📞 Support

For issues and questions:

1. Check the logs: `docker-compose logs -f`
2. Review API documentation: http://localhost:3000/docs
3. Check the README.md for detailed architecture

---

## 📝 License

MIT License - See LICENSE file for details

---

**Built with ❤️ by the Voice AI Platform Team**
