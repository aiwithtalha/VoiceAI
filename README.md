# 🎙️ Universal Voice AI Platform

A production-ready, real-time voice AI platform enabling businesses to create intelligent voice agents for customer support, sales, scheduling, and more. Built with modern web technologies and best-in-class voice AI services.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Required-blue.svg)](https://docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

---

## 🎯 Overview

The Universal Voice AI Platform provides a complete infrastructure for building, deploying, and managing AI-powered voice agents. The platform integrates with industry-leading services to deliver high-quality voice experiences:

- **Twilio**: Voice infrastructure and call handling
- **Deepgram**: Real-time speech-to-text transcription
- **ElevenLabs**: Natural text-to-speech synthesis
- **OpenAI/Anthropic**: Intelligent conversation handling
- **Stripe**: Subscription and payment management

---

## ✨ Features

### Core Capabilities
- 🔊 **Real-time Voice Conversations** - Sub-second latency voice AI
- 🤖 **AI Agent Management** - Create and configure custom voice agents
- 📞 **Phone Number Integration** - Connect Twilio numbers to agents
- 📊 **Conversation Analytics** - Track and analyze all interactions
- 💳 **Subscription Management** - Built-in billing with Stripe
- 🔐 **OAuth Authentication** - Google & LinkedIn sign-in
- 📱 **Responsive Dashboard** - Manage everything from any device

### Technical Features
- 🐳 **Docker-based Development** - Consistent local environment
- 📦 **Monorepo Architecture** - Shared packages and utilities
- 🔄 **Hot Reload** - Fast development iteration
- 🗄️ **PostgreSQL + Redis** - Reliable data and caching
- 🧪 **Type Safety** - Full TypeScript coverage
- 🚀 **Production Ready** - Optimized builds and deployments

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UNIVERSAL VOICE AI PLATFORM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Web Frontend  │    │   API Service   │    │  Voice Engine   │         │
│  │   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (Node.js)     │         │
│  │   Port: 3000    │    │   Port: 3001    │    │   Port: 3002    │         │
│  └─────────────────┘    └────────┬────────┘    └────────┬────────┘         │
│                                  │                      │                   │
│                                  ▼                      ▼                   │
│                         ┌─────────────────┐    ┌─────────────────┐         │
│                         │    PostgreSQL   │    │     Redis       │         │
│                         │   Port: 5432    │    │   Port: 6379    │         │
│                         └─────────────────┘    └─────────────────┘         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           EXTERNAL INTEGRATIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Twilio     │  │  Deepgram    │  │  ElevenLabs  │  │    Stripe    │    │
│  │  (Voice)     │  │    (STT)     │  │    (TTS)     │  │  (Payments)  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   OpenAI     │  │  Anthropic   │  │ Google/      │                       │
│  │    (LLM)     │  │    (LLM)     │  │  LinkedIn    │                       │
│  └──────────────┘  └──────────────┘  │   (OAuth)    │                       │
│                                      └──────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MONOREPO STRUCTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  voice-ai-platform/                                              │
│  ├── apps/                                                       │
│  │   ├── web/              # Next.js frontend (Port 3000)        │
│  │   │   ├── app/          # App router pages                    │
│  │   │   ├── components/   # React components                    │
│  │   │   └── lib/          # Utilities and hooks                │
│  │   │                                                           │
│  │   ├── api/             # Node.js API (Port 3001)              │
│  │   │   ├── src/                                              │
│  │   │   │   ├── routes/   # API endpoints                       │
│  │   │   │   ├── services/ # Business logic                     │
│  │   │   │   └── middleware/# Auth, validation, etc.            │
│  │   │                                                           │
│  │   └── voice-engine/    # Voice service (Port 3002)            │
│  │       ├── src/                                              │
│  │       │   ├── handlers/ # WebSocket handlers                 │
│  │       │   ├── services/ # STT, TTS, LLM integration          │
│  │       │   └── streams/  # Audio stream management            │
│  │                                                               │
│  ├── packages/                                                   │
│  │   ├── database/        # Prisma schema & client               │
│  │   │   ├── prisma/      # Schema and migrations                │
│  │   │   └── src/         # Database utilities                   │
│  │   │                                                           │
│  │   └── shared/          # Shared types & utilities             │
│  │       ├── types/       # TypeScript type definitions          │
│  │       └── utils/       # Shared utility functions             │
│  │                                                               │
│  ├── docker-compose.yml   # Local development orchestration       │
│  └── package.json         # Workspace configuration               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Caller    │────►│   Twilio    │────►│   Voice     │────►│  Deepgram   │
│  (Phone)    │     │   Webhook   │     │   Engine    │     │    (STT)    │
└─────────────┘     └─────────────┘     └──────┬──────┘     └──────┬──────┘
                                               │                    │
                                               │              Text Input
                                               │                    ▼
                                               │            ┌─────────────┐
                                               │            │  OpenAI/    │
                                               │            │  Anthropic  │
                                               │            │    (LLM)    │
                                               │            └──────┬──────┘
                                               │                   │
                                               │              AI Response
                                               │                   ▼
                                               │            ┌─────────────┐
                                               │            │  ElevenLabs │
                                               │            │    (TTS)    │
                                               │            └──────┬──────┘
                                               │                   │
                                               │              Audio Stream
                                               │                   │
                                               └───────────────────┘
```

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### Required
- **Node.js** 20.x or higher - [Download](https://nodejs.org/)
- **Docker** 24.x or higher - [Download](https://docs.docker.com/get-docker/)
- **Docker Compose** 2.x or higher (included with Docker Desktop)

### Optional (for local development without Docker)
- **PostgreSQL** 15+ - [Download](https://www.postgresql.org/download/)
- **Redis** 7+ - [Download](https://redis.io/download/)

### Verify Installation

```bash
# Check Node.js version
node --version  # Should be v20.x.x or higher

# Check npm version
npm --version   # Should be 10.x.x or higher

# Check Docker version
docker --version

# Check Docker Compose version
docker-compose --version
```

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/voice-ai-platform.git
cd voice-ai-platform
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual API keys and credentials
# See the Environment Setup section below for details
```

### 3. Start with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, API, Voice Engine, Web)
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 4. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Web App | http://localhost:3000 | Main application dashboard |
| API | http://localhost:3001 | REST API endpoints |
| Voice Engine | http://localhost:3002 | WebSocket voice service |
| PostgreSQL | localhost:5432 | Database (if exposed) |
| Redis | localhost:6379 | Cache (if exposed) |

### 5. Optional: Start with Admin Tools

```bash
# Include pgAdmin and Redis Commander
docker-compose --profile tools up --build

# Access admin tools:
# - pgAdmin: http://localhost:5050
# - Redis Commander: http://localhost:8081
```

---

## ⚙️ Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env` and configure the following:

#### Database
```bash
DATABASE_URL=postgresql://voiceai:your_password@localhost:5432/voiceai_platform
POSTGRES_USER=voiceai
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=voiceai_platform
```

#### Redis
```bash
REDIS_URL=redis://:your_password@localhost:6379
REDIS_PASSWORD=your_redis_password
```

#### Authentication
```bash
# Generate secrets with: openssl rand -base64 32
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret
```

### External Service API Keys

#### Twilio (Required for Voice)
1. Create account at [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Get Account SID and Auth Token from Console Dashboard
3. Create API Key at [Console > API Keys](https://www.twilio.com/console/runtime/api-keys)
4. Buy a phone number for voice calls

```bash
TWILIO_ACCOUNT_SID=AC_xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=SK_xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret
```

#### Deepgram (Required for Speech-to-Text)
1. Sign up at [console.deepgram.com](https://console.deepgram.com/)
2. Create API Key

```bash
DEEPGRAM_API_KEY=your_deepgram_api_key
```

#### ElevenLabs (Required for Text-to-Speech)
1. Sign up at [elevenlabs.io](https://elevenlabs.io/)
2. Get API Key from [Settings > API](https://elevenlabs.io/app/settings/api)

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

#### OpenAI (Required for AI)
1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Create API Key at [API Keys](https://platform.openai.com/api-keys)

```bash
OPENAI_API_KEY=sk-your_openai_api_key
```

#### Stripe (Required for Payments)
1. Create account at [stripe.com](https://stripe.com/)
2. Get API Keys from [Dashboard](https://dashboard.stripe.com/apikeys)
3. Create Products and Prices in Dashboard

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

#### OAuth Providers (Optional)

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

**LinkedIn OAuth:**
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create an app
3. Add OAuth 2.0 scopes

```bash
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

---

## 💻 Development

### Local Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate:dev

# Seed database with sample data
npm run db:seed

# Start all services in development mode
npm run dev

# Start with Docker (recommended)
npm run dev:docker

# Start with admin tools
npm run dev:docker:tools
```

### Working with Individual Services

```bash
# Start only the API service
docker-compose up api

# Start only the database services
docker-compose up postgres redis

# View logs for a specific service
docker-compose logs -f api

# Restart a service
docker-compose restart voice-engine
```

### Database Operations

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Create a new migration
npm run db:migrate:dev -- --name add_new_feature

# Reset database (WARNING: deletes all data)
npm run db:reset

# Generate Prisma client after schema changes
npm run db:generate
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check

# Run type checking
npm run type-check
```

### Testing

```bash
# Run all tests
npm run test

# Run E2E tests
npm run test:e2e
```

---

## 🚢 Deployment

### Production Deployment Checklist

- [ ] Set all environment variables for production
- [ ] Change all default passwords
- [ ] Configure production database (RDS, Cloud SQL, etc.)
- [ ] Set up production Redis (ElastiCache, Memorystore, etc.)
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Set up CI/CD pipeline
- [ ] Run security audits
- [ ] Load test the application

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment-Specific URLs

Update your `.env` file for production:

```bash
# Production URLs
APP_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
VOICE_ENGINE_URL=https://voice.yourdomain.com
```

---

## 📚 API Documentation

### API Endpoints

The API service exposes the following endpoints:

#### Authentication
```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
POST   /api/auth/logout            # Logout user
POST   /api/auth/refresh           # Refresh access token
GET    /api/auth/me                # Get current user
```

#### Agents
```
GET    /api/agents                 # List all agents
POST   /api/agents                 # Create new agent
GET    /api/agents/:id             # Get agent details
PUT    /api/agents/:id             # Update agent
DELETE /api/agents/:id             # Delete agent
POST   /api/agents/:id/activate    # Activate agent
POST   /api/agents/:id/deactivate  # Deactivate agent
```

#### Phone Numbers
```
GET    /api/phone-numbers          # List phone numbers
POST   /api/phone-numbers          # Add phone number
PUT    /api/phone-numbers/:id      # Update phone number
DELETE /api/phone-numbers/:id      # Remove phone number
```

#### Conversations
```
GET    /api/conversations          # List conversations
GET    /api/conversations/:id      # Get conversation details
GET    /api/conversations/:id/audio # Get conversation audio
```

#### Webhooks
```
POST   /webhooks/twilio/voice      # Twilio voice webhook
POST   /webhooks/twilio/status     # Twilio status callback
POST   /webhooks/stripe            # Stripe webhook
```

### Voice Engine WebSocket

Connect to the voice engine for real-time audio streaming:

```javascript
const ws = new WebSocket('ws://localhost:3002/voice');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'init',
    agentId: 'your-agent-id',
    sessionId: 'unique-session-id'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle audio chunks, transcriptions, etc.
};
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Use conventional commit messages

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

For support, please:

1. Check the [Documentation](docs/)
2. Search [Existing Issues](https://github.com/your-org/voice-ai-platform/issues)
3. Create a [New Issue](https://github.com/your-org/voice-ai-platform/issues/new)

---

## 🙏 Acknowledgments

- [Twilio](https://www.twilio.com/) for voice infrastructure
- [Deepgram](https://deepgram.com/) for speech recognition
- [ElevenLabs](https://elevenlabs.io/) for voice synthesis
- [OpenAI](https://openai.com/) for AI capabilities
- [Next.js](https://nextjs.org/) for the frontend framework

---

<p align="center">
  Built with ❤️ by the Voice AI Platform Team
</p>
