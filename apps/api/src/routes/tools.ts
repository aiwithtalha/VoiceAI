/**
 * Tools Routes
 * 
 * API endpoints for managing tools:
 * - List predefined tools
 * - CRUD operations for custom tools
 * - Test tool execution
 * 
 * @module routes/tools
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { predefinedTools, getToolById, getToolsByCategoryMap } from '../data/predefined-tools';
import { executeTool, ToolExecutionContext } from '../services/tools-framework';
import { executeCustomTool, testCustomToolConfig, validateCustomToolInput } from '../services/custom-tools';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const CreateCustomToolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  auth: z.object({
    type: z.enum(['none', 'bearer', 'basic', 'api_key', 'oauth2']),
    bearerToken: z.string().optional(),
    basicAuth: z.object({
      username: z.string(),
      password: z.string(),
    }).optional(),
    apiKey: z.object({
      key: z.string(),
      value: z.string(),
      in: z.enum(['header', 'query']),
    }).optional(),
    integrationToken: z.string().optional(),
  }).optional(),
  timeout: z.number().min(1000).max(30000).optional(),
  retries: z.number().min(0).max(3).optional(),
  inputSchema: z.record(z.any()).optional(),
  bodyTemplate: z.record(z.any()).optional(),
  responseTransform: z.object({
    extractPath: z.string().optional(),
    fieldMapping: z.record(z.string()).optional(),
    defaults: z.record(z.any()).optional(),
  }).optional(),
});

const UpdateCustomToolSchema = CreateCustomToolSchema.partial();

const TestToolSchema = z.object({
  input: z.record(z.any()),
});

// ============================================================================
// Predefined Tools Routes
// ============================================================================

/**
 * GET /tools
 * List all predefined tools
 */
router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response) => {
    const { category } = req.query;

    let tools = predefinedTools;

    // Filter by category if specified
    if (category) {
      tools = tools.filter(t => t.category === category);
    }

    // Format response
    const formattedTools = tools.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      inputSchema: tool.inputSchema,
      examples: tool.examples,
      requiredIntegrations: tool.requiredIntegrations,
    }));

    res.json({
      success: true,
      data: formattedTools,
    });
  }
);

/**
 * GET /tools/categories
 * List tools grouped by category
 */
router.get(
  '/categories',
  requireAuth,
  async (req: Request, res: Response) => {
    const toolsByCategory = getToolsByCategoryMap();

    const formatted = Object.entries(toolsByCategory).map(([category, tools]) => ({
      category,
      tools: tools.map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        examples: tool.examples,
        requiredIntegrations: tool.requiredIntegrations,
      })),
    }));

    res.json({
      success: true,
      data: formatted,
    });
  }
);

/**
 * GET /tools/:id
 * Get a specific predefined tool
 */
router.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const tool = getToolById(id);

    if (!tool) {
      throw new ApiError(404, 'Tool not found');
    }

    res.json({
      success: true,
      data: {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        inputSchema: tool.inputSchema,
        examples: tool.examples,
        requiredIntegrations: tool.requiredIntegrations,
      },
    });
  }
);

// ============================================================================
// Custom Tools Routes
// ============================================================================

/**
 * GET /tools/custom
 * List custom tools for the workspace
 */
router.get(
  '/custom',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;

    const customTools = await prisma.customTool.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        method: true,
        url: true,
        headers: true,
        auth: true,
        timeout: true,
        retries: true,
        inputSchema: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format response - mask sensitive auth data
    const formattedTools = customTools.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      method: tool.method,
      url: tool.url,
      headers: tool.headers,
      authType: (tool.auth as any)?.type || 'none',
      timeout: tool.timeout,
      retries: tool.retries,
      inputSchema: tool.inputSchema,
      isActive: tool.isActive,
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
    }));

    res.json({
      success: true,
      data: formattedTools,
    });
  }
);

/**
 * POST /tools/custom
 * Create a new custom tool
 */
router.post(
  '/custom',
  requireAuth,
  requireWorkspace,
  validateRequest(CreateCustomToolSchema),
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const toolData = req.body;

    logger.info({ workspaceId, toolName: toolData.name }, 'Creating custom tool');

    // Validate input schema if provided
    if (toolData.inputSchema) {
      const validation = validateCustomToolInput(toolData.inputSchema, {});
      if (!validation.valid) {
        throw new ApiError(400, `Invalid input schema: ${validation.errors?.join(', ')}`);
      }
    }

    // Create the custom tool
    const customTool = await prisma.customTool.create({
      data: {
        workspaceId,
        name: toolData.name,
        description: toolData.description,
        method: toolData.method,
        url: toolData.url,
        headers: toolData.headers || {},
        auth: toolData.auth || { type: 'none' },
        timeout: toolData.timeout || 10000,
        retries: toolData.retries || 1,
        inputSchema: toolData.inputSchema || {},
        bodyTemplate: toolData.bodyTemplate,
        responseTransform: toolData.responseTransform,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: customTool.id,
        name: customTool.name,
        description: customTool.description,
        method: customTool.method,
        url: customTool.url,
        isActive: customTool.isActive,
        createdAt: customTool.createdAt,
      },
      message: 'Custom tool created successfully',
    });
  }
);

/**
 * GET /tools/custom/:id
 * Get a specific custom tool
 */
router.get(
  '/custom/:id',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;

    const customTool = await prisma.customTool.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!customTool) {
      throw new ApiError(404, 'Custom tool not found');
    }

    res.json({
      success: true,
      data: {
        id: customTool.id,
        name: customTool.name,
        description: customTool.description,
        method: customTool.method,
        url: customTool.url,
        headers: customTool.headers,
        authType: (customTool.auth as any)?.type || 'none',
        timeout: customTool.timeout,
        retries: customTool.retries,
        inputSchema: customTool.inputSchema,
        bodyTemplate: customTool.bodyTemplate,
        responseTransform: customTool.responseTransform,
        isActive: customTool.isActive,
        createdAt: customTool.createdAt,
        updatedAt: customTool.updatedAt,
      },
    });
  }
);

/**
 * PUT /tools/custom/:id
 * Update a custom tool
 */
router.put(
  '/custom/:id',
  requireAuth,
  requireWorkspace,
  validateRequest(UpdateCustomToolSchema),
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;
    const updateData = req.body;

    // Check if tool exists and belongs to workspace
    const existingTool = await prisma.customTool.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existingTool) {
      throw new ApiError(404, 'Custom tool not found');
    }

    logger.info({ workspaceId, toolId: id }, 'Updating custom tool');

    // Update the tool
    const updatedTool = await prisma.customTool.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        id: updatedTool.id,
        name: updatedTool.name,
        description: updatedTool.description,
        method: updatedTool.method,
        url: updatedTool.url,
        isActive: updatedTool.isActive,
        updatedAt: updatedTool.updatedAt,
      },
      message: 'Custom tool updated successfully',
    });
  }
);

/**
 * DELETE /tools/custom/:id
 * Delete a custom tool
 */
router.delete(
  '/custom/:id',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;

    // Check if tool exists and belongs to workspace
    const existingTool = await prisma.customTool.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existingTool) {
      throw new ApiError(404, 'Custom tool not found');
    }

    logger.info({ workspaceId, toolId: id }, 'Deleting custom tool');

    await prisma.customTool.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Custom tool deleted successfully',
    });
  }
);

/**
 * POST /tools/custom/:id/test
 * Test a custom tool
 */
router.post(
  '/custom/:id/test',
  requireAuth,
  requireWorkspace,
  validateRequest(TestToolSchema),
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;
    const { input } = req.body;

    // Get the custom tool
    const customTool = await prisma.customTool.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!customTool) {
      throw new ApiError(404, 'Custom tool not found');
    }

    // Create execution context
    const context: ToolExecutionContext = {
      callId: `test_${Date.now()}`,
      workspaceId,
      agentId: 'test-agent',
      sessionId: `test_session_${Date.now()}`,
      collectedData: {},
      integrationTokens: {},
    };

    // Execute the custom tool
    const result = await executeCustomTool(
      {
        id: customTool.id,
        workspaceId: customTool.workspaceId,
        name: customTool.name,
        description: customTool.description,
        method: customTool.method as any,
        url: customTool.url,
        headers: customTool.headers as Record<string, string> || {},
        auth: customTool.auth as any,
        timeout: customTool.timeout || 10000,
        retries: customTool.retries || 1,
        inputSchema: customTool.inputSchema as Record<string, any> || {},
        bodyTemplate: customTool.bodyTemplate as Record<string, any> || undefined,
        responseTransform: customTool.responseTransform as any,
        isActive: customTool.isActive,
        createdAt: customTool.createdAt,
        updatedAt: customTool.updatedAt,
      },
      input,
      context
    );

    res.json({
      success: result.success,
      data: result.data,
      error: result.error,
      statusCode: result.statusCode,
      duration: result.duration,
    });
  }
);

/**
 * POST /tools/custom/:id/validate
 * Validate custom tool configuration without executing
 */
router.post(
  '/custom/:id/validate',
  requireAuth,
  requireWorkspace,
  validateRequest(TestToolSchema),
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;
    const { input } = req.body;

    // Get the custom tool
    const customTool = await prisma.customTool.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!customTool) {
      throw new ApiError(404, 'Custom tool not found');
    }

    // Test the configuration
    const validation = testCustomToolConfig(
      {
        id: customTool.id,
        workspaceId: customTool.workspaceId,
        name: customTool.name,
        description: customTool.description,
        method: customTool.method as any,
        url: customTool.url,
        headers: customTool.headers as Record<string, string> || {},
        auth: customTool.auth as any,
        timeout: customTool.timeout || 10000,
        retries: customTool.retries || 1,
        inputSchema: customTool.inputSchema as Record<string, any> || {},
        bodyTemplate: customTool.bodyTemplate as Record<string, any> || undefined,
        responseTransform: customTool.responseTransform as any,
        isActive: customTool.isActive,
        createdAt: customTool.createdAt,
        updatedAt: customTool.updatedAt,
      },
      input
    );

    res.json({
      success: validation.valid,
      data: {
        valid: validation.valid,
        errors: validation.errors,
        preview: validation.preview,
      },
    });
  }
);

/**
 * PATCH /tools/custom/:id/toggle
 * Toggle custom tool active status
 */
router.patch(
  '/custom/:id/toggle',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;

    const customTool = await prisma.customTool.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!customTool) {
      throw new ApiError(404, 'Custom tool not found');
    }

    const updatedTool = await prisma.customTool.update({
      where: { id },
      data: {
        isActive: !customTool.isActive,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        id: updatedTool.id,
        isActive: updatedTool.isActive,
      },
      message: `Custom tool ${updatedTool.isActive ? 'enabled' : 'disabled'}`,
    });
  }
);

// ============================================================================
// Tool Testing Routes
// ============================================================================

/**
 * POST /tools/:id/test
 * Test a predefined tool
 */
router.post(
  '/:id/test',
  requireAuth,
  requireWorkspace,
  validateRequest(TestToolSchema),
  async (req: Request, res: Response) => {
    const workspaceId = req.workspace!.id;
    const { id } = req.params;
    const { input } = req.body;

    // Check if it's a predefined tool
    const predefinedTool = getToolById(id);

    if (!predefinedTool) {
      throw new ApiError(404, 'Tool not found');
    }

    // Create execution context
    const context: ToolExecutionContext = {
      callId: `test_${Date.now()}`,
      workspaceId,
      agentId: 'test-agent',
      sessionId: `test_session_${Date.now()}`,
      collectedData: {},
      integrationTokens: {},
    };

    // Execute the tool
    const result = await executeTool(id, input, context);

    res.json({
      success: result.success,
      data: result.data,
      error: result.error,
      duration: result.duration,
      timestamp: result.timestamp,
    });
  }
);

/**
 * GET /tools/:id/schema
 * Get JSON schema for a tool
 */
router.get(
  '/:id/schema',
  requireAuth,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const tool = getToolById(id);

    if (!tool) {
      throw new ApiError(404, 'Tool not found');
    }

    res.json({
      success: true,
      data: {
        id: tool.id,
        name: tool.name,
        schema: tool.inputSchema,
      },
    });
  }
);

export default router;
