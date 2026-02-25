/**
 * Universal Voice AI Platform - Encryption Utilities
 * 
 * AES-256-GCM encryption for sensitive data like API keys and credentials.
 * Uses Node.js crypto module with authenticated encryption.
 */

import crypto from 'crypto';
import { config } from '../config';
import logger from './logger';

// ============================================================================
// Encryption Configuration
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Derive a 256-bit key from the configured encryption key
function getEncryptionKey(): Buffer {
  return crypto.scryptSync(config.encryption.key, 'voice-ai-salt', KEY_LENGTH);
}

// ============================================================================
// Encryption/Decryption Functions
// ============================================================================

/**
 * Encrypt sensitive data using AES-256-GCM
 * 
 * @param plaintext - Data to encrypt
 * @returns Encrypted data as base64 string (format: iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and ciphertext for storage
    // Format: base64(iv):base64(authTag):base64(ciphertext)
    const result = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    
    return result;
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Encryption failed');
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data that was encrypted with the encrypt function
 * 
 * @param encryptedData - Encrypted data in format iv:authTag:ciphertext
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Split the encrypted data into components
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivBase64, authTagBase64, ciphertext] = parts;
    
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }
    
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid auth tag length');
    }
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Decryption failed');
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt an object (converts to JSON first)
 * 
 * @param data - Object to encrypt
 * @returns Encrypted data as base64 string
 */
export function encryptObject<T extends Record<string, unknown>>(data: T): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt data to an object
 * 
 * @param encryptedData - Encrypted data
 * @returns Decrypted object
 */
export function decryptObject<T extends Record<string, unknown>>(encryptedData: string): T {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted) as T;
}

// ============================================================================
// Field-Level Encryption Helpers
// ============================================================================

/**
 * Encrypt specific fields of an object
 * 
 * @param data - Object containing fields to encrypt
 * @param fields - Array of field names to encrypt
 * @returns Object with specified fields encrypted
 */
export function encryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };
  
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      const value = String(result[field]);
      (result as Record<string, unknown>)[field as string] = encrypt(value);
    }
  }
  
  return result;
}

/**
 * Decrypt specific fields of an object
 * 
 * @param data - Object containing encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns Object with specified fields decrypted
 */
export function decryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };
  
  for (const field of fields) {
    const value = result[field];
    if (value !== undefined && value !== null && typeof value === 'string') {
      try {
        (result as Record<string, unknown>)[field as string] = decrypt(value);
      } catch {
        // If decryption fails, keep original value (might not be encrypted)
        logger.warn({ field: String(field) }, 'Failed to decrypt field, keeping original value');
      }
    }
  }
  
  return result;
}

// ============================================================================
// API Key Encryption
// ============================================================================

/**
 * Encrypt an API key for storage
 * 
 * @param apiKey - API key to encrypt
 * @returns Encrypted API key
 */
export function encryptApiKey(apiKey: string): string {
  return encrypt(apiKey);
}

/**
 * Decrypt an API key
 * 
 * @param encryptedApiKey - Encrypted API key
 * @returns Decrypted API key
 */
export function decryptApiKey(encryptedApiKey: string): string {
  return decrypt(encryptedApiKey);
}

// ============================================================================
// Credential Encryption (for integration credentials)
// ============================================================================

/**
 * Encrypt integration credentials object
 * 
 * @param credentials - Credentials object to encrypt
 * @returns Encrypted credentials string
 */
export function encryptCredentials(credentials: Record<string, string>): string {
  return encryptObject(credentials);
}

/**
 * Decrypt integration credentials
 * 
 * @param encryptedCredentials - Encrypted credentials string
 * @returns Decrypted credentials object
 */
export function decryptCredentials(encryptedCredentials: string): Record<string, string> {
  return decryptObject(encryptedCredentials);
}

// ============================================================================
// Hashing Functions (for passwords and verification)
// ============================================================================

/**
 * Hash a password using bcrypt
 * 
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const saltRounds = 12; // Higher is more secure but slower
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * 
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 * 
 * @param length - Length of the token in bytes (default: 32)
 * @returns Random token as hex string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random string (URL-safe base64)
 * 
 * @param length - Length of the string in bytes (default: 32)
 * @returns Random URL-safe string
 */
export function generateUrlSafeToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

// ============================================================================
// HMAC Functions (for webhook signatures)
// ============================================================================

/**
 * Generate HMAC signature for data
 * 
 * @param data - Data to sign
 * @param secret - Secret key
 * @returns HMAC signature as hex string
 */
export function generateHmac(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * 
 * @param data - Data that was signed
 * @param signature - Signature to verify
 * @param secret - Secret key
 * @returns True if signature is valid
 */
export function verifyHmac(data: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHmac(data, secret);
  
  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}
