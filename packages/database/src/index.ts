/**
 * Voice AI Platform - Database Package
 * Exports Prisma client and utilities
 */

export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';

// Re-export types for convenience
export type {
  User,
  Agent,
  PhoneNumber,
  Conversation,
  Message,
  Subscription,
  WebhookEvent,
  SubscriptionStatus,
  ConversationStatus,
  MessageRole,
} from '@prisma/client';
