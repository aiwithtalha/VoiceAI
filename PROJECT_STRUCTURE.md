# Universal Voice AI Platform - Project Structure

## Directory Overview

```
voice-ai-platform/
├── README.md                    # Main project documentation
├── PROJECT_STRUCTURE.md         # This file
├── package.json                 # Root package.json with workspaces
├── turbo.json                   # Turbo configuration for monorepo
├── docker-compose.yml           # Docker Compose for local development
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── .dockerignore                # Docker ignore rules
│
├── apps/                        # Application services
│   ├── web/                     # Next.js frontend (Port 3000)
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── api/                     # Node.js backend API (Port 3001)
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   └── src/
│   │       ├── index.ts         # Main entry point
│   │       ├── routes/          # API route handlers
│   │       │   ├── health.ts
│   │       │   ├── auth.ts
│   │       │   ├── agents.ts
│   │       │   ├── phone-numbers.ts
│   │       │   ├── conversations.ts
│   │       │   └── webhooks.ts
│   │       └── ...
│   │
│   └── voice-engine/            # Real-time voice service (Port 3002)
│       ├── package.json
│       ├── Dockerfile
│       ├── tsconfig.json
│       ├── .env.example
│       └── src/
│           ├── index.ts         # Main entry point
│           ├── services/        # Voice processing services
│           │   ├── VoiceSessionManager.ts
│           │   ├── DeepgramService.ts
│           │   ├── ElevenLabsService.ts
│           │   └── OpenAIService.ts
│           └── ...
│
├── packages/                    # Shared packages
│   ├── database/                # Prisma database package
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── prisma/
│   │       ├── schema.prisma    # Database schema
│   │       └── seed.ts          # Seed data
│   │
│   └── shared/                  # Shared types and utilities
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types/           # TypeScript type definitions
│           ├── utils/           # Utility functions
│           └── constants/       # Shared constants
│
└── docker/                      # Docker configuration
    └── postgres/
        └── init/
            └── 01-init.sql      # PostgreSQL initialization
```

## Services Overview

| Service | Port | Description |
|---------|------|-------------|
| Web (Next.js) | 3000 | Frontend dashboard and UI |
| API (Node.js) | 3001 | REST API for data operations |
| Voice Engine | 3002 | WebSocket voice processing |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching and sessions |
| pgAdmin | 5050 | Database admin UI (optional) |
| Redis Commander | 8081 | Redis admin UI (optional) |

## Quick Commands

```bash
# Start all services
docker-compose up --build

# Start with admin tools
docker-compose --profile tools up --build

# Run database migrations
npm run db:migrate:dev

# Open database GUI
npm run db:studio

# View logs
docker-compose logs -f [service-name]
```
