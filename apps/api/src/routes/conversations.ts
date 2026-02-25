/**
 * Conversation Routes
 * Retrieve and manage conversation history
 */

import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@voice-ai/database';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/conversations
 * List conversations with optional filtering
 */
router.get('/', async (req, res) => {
  const schema = z.object({
    userId: z.string().optional(),
    agentId: z.string().uuid().optional(),
    limit: z.string().default('20'),
    offset: z.string().default('0'),
  });
  
  try {
    const { userId, agentId, limit, offset } = schema.parse(req.query);
    
    const where: any = {};
    if (agentId) where.agentId = agentId;
    if (userId) {
      where.agent = { userId };
    }
    
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { startedAt: 'desc' },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
          phoneNumber: {
            select: {
              phoneNumber: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      prisma.conversation.count({ where }),
    ]);
    
    res.json({
      conversations,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }
    throw error;
  }
});

/**
 * GET /api/conversations/:id
 * Get a single conversation with messages
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          voiceId: true,
        },
      },
      phoneNumber: {
        select: {
          phoneNumber: true,
        },
      },
      messages: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });
  
  if (!conversation) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Conversation not found',
    });
  }
  
  res.json({ conversation });
});

/**
 * GET /api/conversations/:id/audio
 * Get conversation audio recording URL
 */
router.get('/:id/audio', async (req, res) => {
  const { id } = req.params;
  
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      recordingUrl: true,
      recordingDuration: true,
    },
  });
  
  if (!conversation) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Conversation not found',
    });
  }
  
  if (!conversation.recordingUrl) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'No recording available for this conversation',
    });
  }
  
  res.json({
    recordingUrl: conversation.recordingUrl,
    duration: conversation.recordingDuration,
  });
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation and its messages
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  await prisma.conversation.delete({
    where: { id },
  });
  
  res.json({ message: 'Conversation deleted successfully' });
});

export { router as conversationsRouter };
