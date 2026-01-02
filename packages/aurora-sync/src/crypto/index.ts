import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const secret = process.env.AURORA_CREDENTIALS_SECRET;
  if (!secret) {
    throw new Error('AURORA_CREDENTIALS_SECRET environment variable is not set');
  }
  // Use PBKDF2 to derive a consistent key from the secret
  return crypto.pbkdf2Sync(secret, 'aurora-credentials-salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a string using AES-256-GCM
 * @param text - The plaintext to encrypt
 * @returns Base64-encoded encrypted string with IV and auth tag
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);

  return combined.toString('base64');
}

/**
 * Decrypts an AES-256-GCM encrypted string
 * @param encryptedText - Base64-encoded encrypted string with IV and auth tag
 * @returns The decrypted plaintext
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedText, 'base64');

  // Extract IV, authTag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
