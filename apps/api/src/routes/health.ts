/**
 * Health Check Routes
 * Provides endpoints for monitoring service health
 */

import { Router } from 'express';
import { PrismaClient } from '@voice-ai/database';
import Redis from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api',
    version: '1.0.0',
  });
});

/**
 * GET /health/detailed
 * Detailed health check with dependency status
 */
router.get('/detailed', async (req, res) => {
  const checks: Record<string, { status: string; responseTime?: number; error?: string }> = {};
  
  // Check database connection
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      responseTime: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
  
  // Check Redis connection
  const redisStart = Date.now();
  try {
    await redis.ping();
    checks.redis = {
      status: 'healthy',
      responseTime: Date.now() - redisStart,
    };
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      responseTime: Date.now() - redisStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
  
  // Determine overall health
  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'api',
    version: '1.0.0',
    checks,
  });
});

/**
 * GET /health/ready
 * Kubernetes readiness probe endpoint
 */
router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

/**
 * GET /health/live
 * Kubernetes liveness probe endpoint
 */
router.get('/live', (req, res) => {
  res.status(200).json({ alive: true });
});

export { router as healthRouter };
