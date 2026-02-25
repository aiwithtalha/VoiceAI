/**
 * Voice AI Platform - Voice Engine Service
 * Real-time voice processing with WebSocket connections
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { VoiceSessionManager } from './services/VoiceSessionManager';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize voice session manager
const sessionManager = new VoiceSessionManager();

// ==========================================
// HTTP Routes
// ==========================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'voice-engine',
    version: '1.0.0',
    activeSessions: sessionManager.getActiveSessionCount(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Voice AI Platform - Voice Engine',
    version: '1.0.0',
    status: 'running',
    websocket: '/voice',
    health: '/health',
  });
});

// ==========================================
// WebSocket Handling
// ==========================================

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection:', req.url);
  
  // Handle voice session
  sessionManager.handleConnection(ws, req);
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ==========================================
// Server Startup
// ==========================================

server.listen(PORT, () => {
  console.log(`🎙️ Voice Engine running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Voice Engine URL: http://localhost:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/voice`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
