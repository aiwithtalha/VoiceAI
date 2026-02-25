/**
 * Universal Voice AI Platform - JWT Utilities
 * 
 * JWT token generation, verification, and refresh token management.
 * Uses jsonwebtoken library with secure defaults.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from './logger';
import { UserJwtPayload } from '../types';

// ============================================================================
// Token Types
// ============================================================================

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface DecodedToken extends UserJwtPayload {
  iat: number;
  exp: number;
}

// ============================================================================
// Access Token Functions
// ============================================================================

/**
 * Generate a new access token for a user
 * @param payload - User data to encode in the token
 * @returns JWT access token string
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email },
    config.jwt.secret,
    {
      expiresIn: config.jwt.accessExpiry,
      issuer: 'voice-ai-platform',
      audience: 'voice-ai-api',
    }
  );
}

/**
 * Verify and decode an access token
 * @param token - JWT access token to verify
 * @returns Decoded token payload or null if invalid
 */
export function verifyAccessToken(token: string): UserJwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'voice-ai-platform',
      audience: 'voice-ai-api',
    }) as UserJwtPayload;
    
    return decoded;
  } catch (error) {
    logger.debug({ error: (error as Error).message }, 'Access token verification failed');
    return null;
  }
}

/**
 * Decode an access token without verification
 * Useful for getting payload from expired tokens
 * @param token - JWT access token to decode
 * @returns Decoded token payload or null
 */
export function decodeAccessToken(token: string): UserJwtPayload | null {
  try {
    const decoded = jwt.decode(token) as UserJwtPayload | null;
    return decoded;
  } catch (error) {
    logger.debug({ error: (error as Error).message }, 'Access token decode failed');
    return null;
  }
}

// ============================================================================
// Refresh Token Functions
// ============================================================================

/**
 * Generate a new refresh token for a user
 * @param payload - User data to encode in the token
 * @returns JWT refresh token string
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, type: 'refresh' },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiry,
      issuer: 'voice-ai-platform',
      audience: 'voice-ai-api',
    }
  );
}

/**
 * Verify and decode a refresh token
 * @param token - JWT refresh token to verify
 * @returns Decoded token payload or null if invalid
 */
export function verifyRefreshToken(token: string): (UserJwtPayload & { type: string }) | null {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'voice-ai-platform',
      audience: 'voice-ai-api',
    }) as UserJwtPayload & { type: string };
    
    // Verify it's actually a refresh token
    if (decoded.type !== 'refresh') {
      logger.warn('Token type mismatch - expected refresh token');
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.debug({ error: (error as Error).message }, 'Refresh token verification failed');
    return null;
  }
}

// ============================================================================
// Token Pair Functions
// ============================================================================

/**
 * Generate both access and refresh tokens for a user
 * @param payload - User data to encode in the tokens
 * @returns TokenPair containing both tokens and expiry info
 */
export function generateTokenPair(payload: TokenPayload): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Calculate expiry in seconds from the access token
  const decoded = jwt.decode(accessToken) as { exp: number; iat: number };
  const expiresIn = decoded.exp - decoded.iat;
  
  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Refresh an access token using a valid refresh token
 * @param refreshToken - Valid refresh token
 * @returns New token pair or null if refresh token is invalid
 */
export function refreshAccessToken(refreshToken: string): TokenPair | null {
  const decoded = verifyRefreshToken(refreshToken);
  
  if (!decoded) {
    return null;
  }
  
  // Generate new token pair
  return generateTokenPair({
    userId: decoded.userId,
    email: decoded.email,
  });
}

// ============================================================================
// Token Metadata Functions
// ============================================================================

/**
 * Get token expiration time in milliseconds
 * @param token - JWT token
 * @returns Expiration timestamp in milliseconds or null
 */
export function getTokenExpiration(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    return decoded?.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token - JWT token
 * @returns True if token is expired or invalid
 */
export function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiration(token);
  if (!exp) return true;
  return Date.now() >= exp;
}

/**
 * Get time until token expiration in milliseconds
 * @param token - JWT token
 * @returns Milliseconds until expiration, 0 if expired, null if invalid
 */
export function getTimeUntilExpiration(token: string): number | null {
  const exp = getTokenExpiration(token);
  if (!exp) return null;
  const timeLeft = exp - Date.now();
  return timeLeft > 0 ? timeLeft : 0;
}

// ============================================================================
// API Key Token Functions (for workspace API keys)
// ============================================================================

/**
 * Generate a secure API key token
 * These are opaque tokens, not JWTs, for API key authentication
 * @returns Random API key string
 */
export function generateApiKey(): string {
  const crypto = require('crypto');
  return `va_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Generate API key prefix for display purposes
 * @param apiKey - Full API key
 * @returns First 8 characters of the key
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12);
}

/**
 * Hash an API key for storage
 * @param apiKey - API key to hash
 * @returns Hashed API key
 */
export function hashApiKey(apiKey: string): string {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', config.encryption.key).update(apiKey).digest('hex');
}

/**
 * Verify an API key against its hash
 * @param apiKey - API key to verify
 * @param hash - Stored hash
 * @returns True if API key matches the hash
 */
export function verifyApiKey(apiKey: string, hash: string): boolean {
  const computedHash = hashApiKey(apiKey);
  // Use timing-safe comparison to prevent timing attacks
  const crypto = require('crypto');
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(hash, 'hex')
  );
}
