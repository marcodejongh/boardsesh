/**
 * Environment configuration for encryption
 */

export const ENV_VAR_NAME = 'AURORA_CREDENTIALS_SECRET';
const DEFAULT_DEV_KEY = 'changeme-development-key';

/**
 * Get the encryption secret, with optional development fallback
 * Supports both Vercel (VERCEL_ENV) and Node.js (NODE_ENV) environments
 * @throws Error if secret is not set and not in development mode
 */
export function getEncryptionSecret(): string {
  const secret = process.env[ENV_VAR_NAME];

  if (secret) {
    return secret;
  }

  // Check if we're in development mode
  const isVercelDev = process.env.VERCEL_ENV === 'development';
  const isNodeDev = process.env.NODE_ENV === 'development';
  const isDevelopment = isVercelDev || isNodeDev;

  if (isDevelopment) {
    return DEFAULT_DEV_KEY;
  }

  throw new Error(`${ENV_VAR_NAME} environment variable is not set`);
}
