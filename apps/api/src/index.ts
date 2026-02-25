/**
 * Universal Voice AI Platform - Main Server
 * 
 * Express application setup with middleware, routes, and error handling.
 * Entry point for the Voice AI Platform API.
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import logger from './utils/logger';

// Middleware imports
import {
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
  requestLoggingMiddleware,
  securityHeadersMiddleware,
} from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimit';

// Route imports
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import teamRoutes from './routes/team';
import billingRoutes from './routes/billing';
import assistantRoutes from './routes/assistants';
import phoneNumberRoutes from './routes/phone-numbers';
import callRoutes from './routes/calls';
import toolRoutes from './routes/tools';
import integrationRoutes from './routes/integrations';
import webhooksRouter from './routes/webhooks';

// ============================================================================
// Express App Initialization
// ============================================================================

const app = express();

// ============================================================================
// Global Middleware
// ============================================================================

/**
 * Request ID middleware - must be first to track all requests
 */
app.use(requestIdMiddleware);

/**
 * Security middleware
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for webhooks
}));

app.use(securityHeadersMiddleware);

/**
 * CORS configuration
 */
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow configured frontend URL
    if (origin === config.server.frontendUrl) {
      return callback(null, true);
    }
    
    // In development, allow localhost
    if (config.server.isDevelopment && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Workspace-Id',
    'X-Request-Id',
  ],
}));

/**
 * Body parsing middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request logging middleware
 */
app.use(requestLoggingMiddleware);

/**
 * Rate limiting middleware
 */
app.use(generalRateLimiter);

// ============================================================================
// Health Check Endpoints
// ============================================================================

/**
 * Basic health check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: config.server.env,
    },
  });
});

/**
 * Kubernetes-style health check
 */
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

/**
 * Readiness probe - checks if app is ready to serve traffic
 */
app.get('/ready', async (_req: Request, res: Response) => {
  // TODO: Add database connectivity check
  // TODO: Add external service health checks
  
  const checks = {
    database: true, // Placeholder
    redis: config.redis.url ? true : null, // Optional
  };
  
  const allHealthy = Object.values(checks).every((check) => check === true || check === null);
  
  if (allHealthy) {
    res.status(200).json({
      success: true,
      data: {
        status: 'ready',
        checks,
      },
    });
  } else {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service is not ready',
        checks,
      },
    });
  }
});

/**
 * Liveness probe - checks if app is running
 */
app.get('/live', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// ============================================================================
// API Routes
// ============================================================================

const API_VERSION = '/v1';

// Authentication routes
app.use(`${API_VERSION}/auth`, authRoutes);

// Workspace routes
app.use(`${API_VERSION}/workspaces`, workspaceRoutes);

// Team management routes
app.use(`${API_VERSION}/teams`, teamRoutes);

// Billing routes
app.use(`${API_VERSION}/billing`, billingRoutes);

// Assistant routes
app.use(`${API_VERSION}/assistants`, assistantRoutes);

// Phone number routes
app.use(`${API_VERSION}/phone-numbers`, phoneNumberRoutes);

// Call routes
app.use(`${API_VERSION}/calls`, callRoutes);

// Tool routes
app.use(`${API_VERSION}/tools`, toolRoutes);

// Integration routes
app.use(`${API_VERSION}/integrations`, integrationRoutes);

// ============================================================================
// Webhook Routes (separate from API routes for different auth)
// ============================================================================

// Mount webhooks router
// Note: Stripe webhook needs raw body for signature verification
// This is handled in the webhooks router itself
app.use('/webhooks', webhooksRouter);

// ============================================================================
// Error Handling
// ============================================================================

/**
 * 404 handler for undefined routes
 */
app.use(notFoundHandler);

/**
 * Global error handler
 */
app.use(errorHandler);

// ============================================================================
// Server Startup
// ============================================================================

const PORT = config.server.port;
const HOST = config.server.host;

const server = app.listen(PORT, HOST, () => {
  logger.info(
    {
      port: PORT,
      host: HOST,
      env: config.server.env,
      apiUrl: config.server.apiUrl,
    },
    '🚀 Voice AI Platform API server started'
  );
  
  // Log configuration status
  logger.info({
    stripe: config.stripe.secretKey ? 'configured' : 'not configured',
    twilio: config.twilio.accountSid ? 'configured' : 'not configured',
    googleOAuth: config.oauth.google.clientId ? 'configured' : 'not configured',
    linkedinOAuth: config.oauth.linkedin.clientId ? 'configured' : 'not configured',
    deepgram: config.providers.deepgram.apiKey ? 'configured' : 'not configured',
    elevenlabs: config.providers.elevenlabs.apiKey ? 'configured' : 'not configured',
    openai: config.providers.openai.apiKey ? 'configured' : 'not configured',
  }, 'Provider configuration status');
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

const gracefulShutdown = (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    // await prisma.$disconnect();
    
    // Close Redis connections
    // await redis.quit();
    
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled rejection');
  process.exit(1);
});

// ============================================================================
// Export for testing
// ============================================================================

export default app;
