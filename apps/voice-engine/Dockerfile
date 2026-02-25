# Voice AI Platform - Voice Engine Service Dockerfile
# Multi-stage build for optimal production image size

# ==========================================
# Base Stage - Dependencies
# ==========================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ==========================================
# Dependencies Stage - Install packages
# ==========================================
FROM base AS dependencies
COPY package.json package-lock.json* ./
COPY apps/voice-engine/package.json ./apps/voice-engine/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

# ==========================================
# Development Stage - Local development
# ==========================================
FROM base AS development
ENV NODE_ENV=development
ENV PORT=3002

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3002

CMD ["npm", "run", "dev", "--workspace=@voice-ai/voice-engine"]

# ==========================================
# Builder Stage - Build for production
# ==========================================
FROM base AS builder
ENV NODE_ENV=production

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Generate Prisma client and build
RUN npm run db:generate
RUN npm run build --workspace=@voice-ai/voice-engine

# ==========================================
# Production Stage - Runtime image
# ==========================================
FROM node:20-alpine AS production
ENV NODE_ENV=production
ENV PORT=3002

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/voice-engine/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

USER nodejs

EXPOSE 3002

CMD ["node", "dist/index.js"]
