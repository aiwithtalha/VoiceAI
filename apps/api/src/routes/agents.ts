/**
 * AI Agent Routes
 * CRUD operations for voice AI agents
 */

import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@voice-ai/database';

const router = Router();
const prisma = new PrismaClient();

// Validation schema for agent creation/update
const agentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  voiceId: z.string().optional(),
  language: z.string().default('en-US'),
  systemPrompt: z.string().max(4000).optional(),
  greeting: z.string().max(500).optional(),
  maxDuration: z.number().min(60).max(3600).default(300),
  recordCalls: z.boolean().default(true),
  enableTranscription: z.boolean().default(true),
  aiModel: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3']).default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
});

/**
 * GET /api/agents
 * List all agents for the authenticated user
 */
router.get('/', async (req, res) => {
  // TODO: Get userId from authenticated session
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'userId is required',
    });
  }
  
  const agents = await prisma.agent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      voiceId: true,
      language: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          conversations: true,
        },
      },
    },
  });
  
  res.json({ agents });
});

/**
 * POST /api/agents
 * Create a new agent
 */
router.post('/', async (req, res) => {
  try {
    const data = agentSchema.parse(req.body);
    // TODO: Get userId from authenticated session
    const userId = req.body.userId as string;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required',
      });
    }
    
    const agent = await prisma.agent.create({
      data: {
        ...data,
        userId,
      },
    });
    
    res.status(201).json({ agent });
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
 * GET /api/agents/:id
 * Get a single agent by ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      phoneNumbers: true,
      _count: {
        select: {
          conversations: true,
        },
      },
    },
  });
  
  if (!agent) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Agent not found',
    });
  }
  
  res.json({ agent });
});

/**
 * PUT /api/agents/:id
 * Update an agent
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = agentSchema.partial().parse(req.body);
    
    const agent = await prisma.agent.update({
      where: { id },
      data,
    });
    
    res.json({ agent });
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
 * DELETE /api/agents/:id
 * Delete an agent
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  await prisma.agent.delete({
    where: { id },
  });
  
  res.json({ message: 'Agent deleted successfully' });
});

/**
 * POST /api/agents/:id/activate
 * Activate an agent
 */
router.post('/:id/activate', async (req, res) => {
  const { id } = req.params;
  
  const agent = await prisma.agent.update({
    where: { id },
    data: { isActive: true },
  });
  
  res.json({ agent });
});

/**
 * POST /api/agents/:id/deactivate
 * Deactivate an agent
 */
router.post('/:id/deactivate', async (req, res) => {
  const { id } = req.params;
  
  const agent = await prisma.agent.update({
    where: { id },
    data: { isActive: false },
  });
  
  res.json({ agent });
});

export { router as agentsRouter };
