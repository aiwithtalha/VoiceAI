/**
 * Universal Voice AI Platform - Authentication Routes
 * 
 * Express routes for user authentication, OAuth, and OTP.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  register,
  login,
  handleGoogleOAuth,
  handleLinkedInOAuth,
  refreshTokens,
  logout,
  sendOtp,
  verifyOtp,
  requestPasswordReset,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  changePassword,
} from '../services/auth';
import { authenticateJwt } from '../middleware/auth';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const oauthSchema = z.object({
  code: z.string().min(1, 'OAuth code is required'),
  redirectUri: z.string().url('Invalid redirect URI'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const otpSendSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format. Use E.164 format (+1234567890)'),
});

const otpVerifySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  code: z.string().length(6, 'OTP code must be 6 digits'),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /auth/register
 * Register a new user with email and password
 */
router.post(
  '/register',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const input = registerSchema.parse(req.body);
    const result = await register(input);
    
    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /auth/login
 * Login with email and password
 */
router.post(
  '/login',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const input = loginSchema.parse(req.body);
    const result = await login(input);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /auth/google
 * Google OAuth callback handler
 */
router.post(
  '/google',
  asyncHandler(async (req: Request, res: Response) => {
    const input = oauthSchema.parse(req.body);
    const result = await handleGoogleOAuth(input.code, input.redirectUri);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /auth/linkedin
 * LinkedIn OAuth callback handler
 */
router.post(
  '/linkedin',
  asyncHandler(async (req: Request, res: Response) => {
    const input = oauthSchema.parse(req.body);
    const result = await handleLinkedInOAuth(input.code, input.redirectUri);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const input = refreshSchema.parse(req.body);
    const tokens = await refreshTokens(input.refreshToken);
    
    res.status(200).json({
      success: true,
      data: { tokens },
    });
  })
);

/**
 * POST /auth/logout
 * Logout user (invalidate tokens)
 */
router.post(
  '/logout',
  authenticateJwt,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const refreshToken = req.body.refreshToken;
    
    if (req.user) {
      await logout(req.user.userId, refreshToken);
    }
    
    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  })
);

/**
 * POST /auth/otp/send
 * Send OTP to phone number for demo calls
 */
router.post(
  '/otp/send',
  otpRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const input = otpSendSchema.parse(req.body);
    const result = await sendOtp(input.phoneNumber);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /auth/otp/verify
 * Verify OTP code
 */
router.post(
  '/otp/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const input = otpVerifySchema.parse(req.body);
    const isValid = await verifyOtp(input.sessionId, input.code);
    
    res.status(200).json({
      success: true,
      data: { valid: isValid },
    });
  })
);

/**
 * POST /auth/password/reset-request
 * Request password reset email
 */
router.post(
  '/password/reset-request',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const input = passwordResetRequestSchema.parse(req.body);
    await requestPasswordReset(input.email);
    
    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      data: { message: 'If an account exists, a reset email has been sent' },
    });
  })
);

/**
 * POST /auth/password/reset
 * Reset password with token
 */
router.post(
  '/password/reset',
  asyncHandler(async (req: Request, res: Response) => {
    const input = passwordResetSchema.parse(req.body);
    await resetPassword(input.token, input.newPassword);
    
    res.status(200).json({
      success: true,
      data: { message: 'Password reset successfully' },
    });
  })
);

// ============================================================================
// User Profile Routes
// ============================================================================

/**
 * GET /auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticateJwt,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    
    const profile = await getUserProfile(req.user.userId);
    
    res.status(200).json({
      success: true,
      data: profile,
    });
  })
);

/**
 * PATCH /auth/me
 * Update current user profile
 */
router.patch(
  '/me',
  authenticateJwt,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    
    const input = updateProfileSchema.parse(req.body);
    const profile = await updateUserProfile(req.user.userId, input);
    
    res.status(200).json({
      success: true,
      data: profile,
    });
  })
);

/**
 * POST /auth/password/change
 * Change user password
 */
router.post(
  '/password/change',
  authenticateJwt,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }
    
    const input = changePasswordSchema.parse(req.body);
    await changePassword(req.user.userId, input.currentPassword, input.newPassword);
    
    res.status(200).json({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  })
);

export default router;
