/**
 * Universal Voice AI Platform - Authentication Service
 * 
 * Handles user authentication, registration, OAuth flows, and OTP for demo calls.
 * Manages JWT tokens and session management.
 */

import { hashPassword, verifyPassword, generateSecureToken } from '../utils/encryption';
import { generateTokenPair, refreshAccessToken, TokenPair } from '../utils/jwt';
import { config } from '../config';
import logger from '../utils/logger';
import {
  User,
  AuthProvider,
  OtpSession,
  ApiError,
  ErrorCode,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface OAuthInput {
  provider: AuthProvider;
  code: string;
  redirectUri: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  tokens: TokenPair;
}

export interface OtpResult {
  sessionId: string;
  expiresAt: Date;
}

// ============================================================================
// Mock Database Functions
// ============================================================================

// In production, these would use Prisma client
// For now, we'll create placeholder functions

const users: Map<string, User> = new Map();
const otpSessions: Map<string, OtpSession> = new Map();

async function findUserByEmail(email: string): Promise<User | null> {
  // TODO: Replace with Prisma query
  // return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  
  for (const user of users.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) {
      return user;
    }
  }
  return null;
}

async function findUserById(id: string): Promise<User | null> {
  // TODO: Replace with Prisma query
  return users.get(id) || null;
}

async function findUserByGoogleId(googleId: string): Promise<User | null> {
  // TODO: Replace with Prisma query
  for (const user of users.values()) {
    if (user.googleId === googleId) {
      return user;
    }
  }
  return null;
}

async function findUserByLinkedInId(linkedinId: string): Promise<User | null> {
  // TODO: Replace with Prisma query
  for (const user of users.values()) {
    if (user.linkedinId === linkedinId) {
      return user;
    }
  }
  return null;
}

async function createUser(data: Partial<User>): Promise<User> {
  // TODO: Replace with Prisma query
  const user: User = {
    id: generateSecureToken(16),
    email: data.email!,
    passwordHash: data.passwordHash,
    firstName: data.firstName!,
    lastName: data.lastName!,
    avatarUrl: data.avatarUrl,
    googleId: data.googleId,
    linkedinId: data.linkedinId,
    emailVerified: data.emailVerified || false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: undefined,
  };
  users.set(user.id, user);
  return user;
}

async function updateUser(id: string, data: Partial<User>): Promise<User> {
  // TODO: Replace with Prisma query
  const user = users.get(id);
  if (!user) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'User not found');
  }
  const updated = { ...user, ...data, updatedAt: new Date() };
  users.set(id, updated);
  return updated;
}

async function createOtpSession(data: Partial<OtpSession>): Promise<OtpSession> {
  // TODO: Replace with Prisma query
  const session: OtpSession = {
    id: generateSecureToken(16),
    phoneNumber: data.phoneNumber!,
    code: data.code!,
    attempts: 0,
    maxAttempts: data.maxAttempts || config.otp.maxAttempts,
    expiresAt: data.expiresAt!,
    verifiedAt: undefined,
    createdAt: new Date(),
  };
  otpSessions.set(session.id, session);
  return session;
}

async function findOtpSessionById(id: string): Promise<OtpSession | null> {
  // TODO: Replace with Prisma query
  return otpSessions.get(id) || null;
}

async function updateOtpSession(id: string, data: Partial<OtpSession>): Promise<OtpSession> {
  // TODO: Replace with Prisma query
  const session = otpSessions.get(id);
  if (!session) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'OTP session not found');
  }
  const updated = { ...session, ...data };
  otpSessions.set(id, updated);
  return updated;
}

// ============================================================================
// Registration & Login
// ============================================================================

/**
 * Register a new user with email and password
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  logger.info({ email: input.email }, 'Attempting user registration');
  
  // Check if user already exists
  const existingUser = await findUserByEmail(input.email);
  if (existingUser) {
    logger.warn({ email: input.email }, 'Registration failed: email already exists');
    throw new ApiError(409, ErrorCode.VALIDATION_ERROR, 'Email already registered');
  }
  
  // Validate password strength
  if (input.password.length < 8) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Password must be at least 8 characters');
  }
  
  // Hash password
  const passwordHash = await hashPassword(input.password);
  
  // Create user
  const user = await createUser({
    email: input.email.toLowerCase(),
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    emailVerified: false,
  });
  
  logger.info({ userId: user.id }, 'User registered successfully');
  
  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
  });
  
  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;
  
  return {
    user: userWithoutPassword,
    tokens,
  };
}

/**
 * Login user with email and password
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  logger.info({ email: input.email }, 'Attempting user login');
  
  // Find user
  const user = await findUserByEmail(input.email);
  if (!user) {
    logger.warn({ email: input.email }, 'Login failed: user not found');
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Invalid email or password');
  }
  
  // Check if user has password (OAuth-only users won't have one)
  if (!user.passwordHash) {
    logger.warn({ userId: user.id }, 'Login failed: user has no password set');
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Please use social login or set a password');
  }
  
  // Verify password
  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    logger.warn({ userId: user.id }, 'Login failed: invalid password');
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Invalid email or password');
  }
  
  // Update last login
  await updateUser(user.id, { lastLoginAt: new Date() });
  
  logger.info({ userId: user.id }, 'User logged in successfully');
  
  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
  });
  
  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;
  
  return {
    user: userWithoutPassword,
    tokens,
  };
}

// ============================================================================
// OAuth Handlers
// ============================================================================

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleOAuth(code: string, redirectUri: string): Promise<AuthResult> {
  logger.info('Processing Google OAuth callback');
  
  if (!config.oauth.google.clientId || !config.oauth.google.clientSecret) {
    throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Google OAuth not configured');
  }
  
  try {
    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.oauth.google.clientId,
        client_secret: config.oauth.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      logger.error({ error }, 'Google token exchange failed');
      throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid OAuth code');
    }
    
    const tokenData = await tokenResponse.json() as { access_token: string };
    
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    if (!userResponse.ok) {
      throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Failed to get user info from Google');
    }
    
    const googleUser = await userResponse.json() as {
      id: string;
      email: string;
      given_name: string;
      family_name: string;
      picture?: string;
      verified_email: boolean;
    };
    
    // Check if user exists
    let user = await findUserByGoogleId(googleUser.id);
    
    if (!user) {
      // Check if user exists with same email
      user = await findUserByEmail(googleUser.email);
      
      if (user) {
        // Link Google account to existing user
        user = await updateUser(user.id, {
          googleId: googleUser.id,
          emailVerified: googleUser.verified_email || user.emailVerified,
        });
        logger.info({ userId: user.id }, 'Linked Google account to existing user');
      } else {
        // Create new user
        user = await createUser({
          email: googleUser.email.toLowerCase(),
          firstName: googleUser.given_name,
          lastName: googleUser.family_name,
          avatarUrl: googleUser.picture,
          googleId: googleUser.id,
          emailVerified: googleUser.verified_email,
        });
        logger.info({ userId: user.id }, 'Created new user from Google OAuth');
      }
    }
    
    // Update last login
    await updateUser(user.id, { lastLoginAt: new Date() });
    
    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
    });
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      tokens,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error({ error: (error as Error).message }, 'Google OAuth processing failed');
    throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'OAuth processing failed');
  }
}

/**
 * Handle LinkedIn OAuth callback
 */
export async function handleLinkedInOAuth(code: string, redirectUri: string): Promise<AuthResult> {
  logger.info('Processing LinkedIn OAuth callback');
  
  if (!config.oauth.linkedin.clientId || !config.oauth.linkedin.clientSecret) {
    throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'LinkedIn OAuth not configured');
  }
  
  try {
    // Exchange code for tokens with LinkedIn
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.oauth.linkedin.clientId,
        client_secret: config.oauth.linkedin.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      logger.error({ error }, 'LinkedIn token exchange failed');
      throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid OAuth code');
    }
    
    const tokenData = await tokenResponse.json() as { access_token: string };
    
    // Get user info from LinkedIn
    const userResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    if (!userResponse.ok) {
      throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Failed to get user info from LinkedIn');
    }
    
    const linkedInUser = await userResponse.json() as {
      id: string;
      localizedFirstName: string;
      localizedLastName: string;
    };
    
    // Get email from LinkedIn
    const emailResponse = await fetch(
      'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    
    let email = '';
    if (emailResponse.ok) {
      const emailData = await emailResponse.json() as {
        elements: Array<{ 'handle~': { emailAddress: string } }>;
      };
      email = emailData.elements[0]?.['handle~']?.emailAddress || '';
    }
    
    // Check if user exists
    let user = await findUserByLinkedInId(linkedInUser.id);
    
    if (!user) {
      if (email) {
        user = await findUserByEmail(email);
      }
      
      if (user) {
        // Link LinkedIn account to existing user
        user = await updateUser(user.id, {
          linkedinId: linkedInUser.id,
        });
        logger.info({ userId: user.id }, 'Linked LinkedIn account to existing user');
      } else {
        // Create new user
        user = await createUser({
          email: email.toLowerCase(),
          firstName: linkedInUser.localizedFirstName,
          lastName: linkedInUser.localizedLastName,
          linkedinId: linkedInUser.id,
          emailVerified: true, // LinkedIn verifies emails
        });
        logger.info({ userId: user.id }, 'Created new user from LinkedIn OAuth');
      }
    }
    
    // Update last login
    await updateUser(user.id, { lastLoginAt: new Date() });
    
    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
    });
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      tokens,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error({ error: (error as Error).message }, 'LinkedIn OAuth processing failed');
    throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'OAuth processing failed');
  }
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Refresh access token using refresh token
 */
export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  logger.debug('Attempting token refresh');
  
  const tokens = refreshAccessToken(refreshToken);
  
  if (!tokens) {
    logger.warn('Token refresh failed: invalid refresh token');
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Invalid or expired refresh token');
  }
  
  logger.debug('Token refresh successful');
  return tokens;
}

/**
 * Logout user (invalidate tokens)
 * In a stateless JWT system, this is typically handled client-side
 * For server-side token invalidation, you'd use a token blacklist
 */
export async function logout(_userId: string, _refreshToken: string): Promise<void> {
  logger.info({ userId: _userId }, 'User logged out');
  
  // TODO: Add refresh token to blacklist in Redis
  // await redis.sadd('token:blacklist', refreshToken);
  // await redis.expire('token:blacklist', 7 * 24 * 60 * 60); // 7 days
}

// ============================================================================
// OTP for Demo Calls
// ============================================================================

/**
 * Generate a random 6-digit OTP code
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to phone number for demo calls
 */
export async function sendOtp(phoneNumber: string): Promise<OtpResult> {
  logger.info({ phoneNumber }, 'Sending OTP for demo call');
  
  // Validate phone number format (E.164)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid phone number format. Use E.164 format (+1234567890)');
  }
  
  // Generate OTP code
  const code = generateOtpCode();
  
  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);
  
  // Create OTP session
  const session = await createOtpSession({
    phoneNumber,
    code,
    maxAttempts: config.otp.maxAttempts,
    expiresAt,
  });
  
  // TODO: Send OTP via SMS using Twilio or similar
  // await sendSms(phoneNumber, `Your Voice AI Platform verification code is: ${code}`);
  
  // For development, log the code
  if (config.server.isDevelopment) {
    logger.info({ phoneNumber, code }, 'OTP generated (development mode)');
  }
  
  logger.info({ sessionId: session.id }, 'OTP sent successfully');
  
  return {
    sessionId: session.id,
    expiresAt,
  };
}

/**
 * Verify OTP code
 */
export async function verifyOtp(sessionId: string, code: string): Promise<boolean> {
  logger.info({ sessionId }, 'Verifying OTP');
  
  // Find OTP session
  const session = await findOtpSessionById(sessionId);
  
  if (!session) {
    logger.warn({ sessionId }, 'OTP verification failed: session not found');
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'OTP session not found');
  }
  
  // Check if already verified
  if (session.verifiedAt) {
    logger.warn({ sessionId }, 'OTP verification failed: already verified');
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'OTP already verified');
  }
  
  // Check if expired
  if (new Date() > session.expiresAt) {
    logger.warn({ sessionId }, 'OTP verification failed: expired');
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'OTP has expired');
  }
  
  // Check attempts
  if (session.attempts >= session.maxAttempts) {
    logger.warn({ sessionId }, 'OTP verification failed: max attempts exceeded');
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Maximum attempts exceeded');
  }
  
  // Increment attempts
  await updateOtpSession(sessionId, { attempts: session.attempts + 1 });
  
  // Verify code
  if (session.code !== code) {
    logger.warn({ sessionId }, 'OTP verification failed: invalid code');
    return false;
  }
  
  // Mark as verified
  await updateOtpSession(sessionId, { verifiedAt: new Date() });
  
  logger.info({ sessionId }, 'OTP verified successfully');
  return true;
}

// ============================================================================
// Password Reset
// ============================================================================

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  logger.info({ email }, 'Password reset requested');
  
  const user = await findUserByEmail(email);
  
  if (!user) {
    // Don't reveal if email exists
    logger.info({ email }, 'Password reset: user not found (silent)');
    return;
  }
  
  // Generate reset token
  const resetToken = generateSecureToken(32);
  
  // TODO: Store reset token in database with expiry
  // await prisma.passwordReset.create({
  //   data: {
  //     userId: user.id,
  //     token: resetToken,
  //     expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  //   },
  // });
  
  // TODO: Send reset email
  // await sendEmail({
  //   to: user.email,
  //   subject: 'Password Reset Request',
  //   template: 'password-reset',
  //   data: { resetToken, user },
  // });
  
  logger.info({ userId: user.id }, 'Password reset email sent');
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  logger.info('Processing password reset');
  
  // TODO: Validate reset token
  // const resetRecord = await prisma.passwordReset.findFirst({
  //   where: {
  //     token,
  //     expiresAt: { gt: new Date() },
  //     usedAt: null,
  //   },
  // });
  //
  // if (!resetRecord) {
  //   throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid or expired reset token');
  // }
  
  // Validate password strength
  if (newPassword.length < 8) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Password must be at least 8 characters');
  }
  
  // Hash new password
  const passwordHash = await hashPassword(newPassword);
  
  // TODO: Update user password and mark token as used
  // await prisma.user.update({
  //   where: { id: resetRecord.userId },
  //   data: { passwordHash },
  // });
  //
  // await prisma.passwordReset.update({
  //   where: { id: resetRecord.id },
  //   data: { usedAt: new Date() },
  // });
  
  logger.info('Password reset successful');
}

// ============================================================================
// User Profile
// ============================================================================

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
  const user = await findUserById(userId);
  
  if (!user) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'User not found');
  }
  
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; avatarUrl?: string }
): Promise<Omit<User, 'passwordHash'>> {
  const user = await updateUser(userId, {
    firstName: data.firstName,
    lastName: data.lastName,
    avatarUrl: data.avatarUrl,
  });
  
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await findUserById(userId);
  
  if (!user) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'User not found');
  }
  
  if (!user.passwordHash) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'User has no password set');
  }
  
  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Current password is incorrect');
  }
  
  // Validate new password
  if (newPassword.length < 8) {
    throw new ApiError(400, ErrorCode.VALIDATION_ERROR, 'Password must be at least 8 characters');
  }
  
  // Hash and update password
  const passwordHash = await hashPassword(newPassword);
  await updateUser(userId, { passwordHash });
  
  logger.info({ userId }, 'Password changed successfully');
}
