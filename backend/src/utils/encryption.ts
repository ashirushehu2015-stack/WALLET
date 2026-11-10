import crypto from 'crypto';
import { logger } from '../config/logger';

const CURRENT_KEY_VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes auth tag

/**
 * Derives authoritative 256-bit (32-byte) encryption key from environment.
 * Never stores keys in the database.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || process.env.KYC_ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, 'hex');
    }
    // Hash to exactly 32 bytes if provided as a passphrase
    return crypto.createHash('sha256').update(envKey).digest();
  }

  // Fallback for development/testing derived deterministically from JWT_SECRET
  const fallbackSource = process.env.JWT_SECRET || 'mangapay_default_encryption_secret_must_change_in_prod';
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Fatal Security Error: ENCRYPTION_KEY must be configured in production environment.');
  }
  return crypto.createHash('sha256').update(fallbackSource).digest();
}

/**
 * Encrypt sensitive plaintext identity identifier (BVN/NIN) using AES-256-GCM.
 * Formats output as authenticated versioned token: v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptIdentifier(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') {
    return plaintext;
  }

  // If already encrypted, return without re-encrypting
  if (isEncrypted(plaintext)) {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext.trim(), 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypt sensitive identity identifier using AES-256-GCM.
 * Enforces cryptographic authentication-tag verification.
 */
export function decryptIdentifier(encryptedToken: string): string {
  if (!encryptedToken || typeof encryptedToken !== 'string') {
    return encryptedToken;
  }

  // If not formatted with version prefix, handle as unmigrated plaintext
  if (!isEncrypted(encryptedToken)) {
    return encryptedToken;
  }

  const parts = encryptedToken.split(':');
  if (parts.length !== 4) {
    throw new Error('Malformed encrypted identifier token structure.');
  }

  const [version, ivHex, authTagHex, ciphertextHex] = parts;

  if (version !== 'v1') {
    throw new Error(`Unsupported encryption key version: ${version}`);
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (error: any) {
    logger.error('Cryptographic Decryption Error: Authentication tag mismatch or corrupt ciphertext');
    throw new Error('Authentication tag verification failed: Identity data corrupted, tampered or invalid key.');
  }
}

/**
 * Check if a string is formatted as an AES-256-GCM encrypted token
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^v\d+:[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(value.trim());
}

/**
 * Mask BVN / NIN for safe administrative display and audit logs.
 * Example: '22212345678' -> '*******5678'
 * Never exposes full identifier values in API responses or logs.
 */
export function maskIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;

  // If encrypted, decrypt first to extract last 4 digits
  let plain = value;
  if (isEncrypted(value)) {
    try {
      plain = decryptIdentifier(value);
    } catch {
      return '****ENCRYPTED****';
    }
  }

  const clean = plain.trim();
  if (clean.length <= 4) {
    return '****';
  }

  const visible = clean.slice(-4);
  const maskedCount = Math.max(0, clean.length - 4);
  return '*'.repeat(maskedCount) + visible;
}
