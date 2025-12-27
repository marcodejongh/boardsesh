import { jwtDecrypt } from 'jose';
import { hkdf } from '@panva/hkdf';

export interface AuthResult {
  userId: string;
  isAuthenticated: true;
}

/**
 * Derive the encryption key the same way NextAuth does.
 * NextAuth uses HKDF with SHA-256 and a specific info string.
 */
async function deriveEncryptionKey(secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  return await hkdf(
    'sha256',
    encoder.encode(secret),
    '',
    'NextAuth.js Generated Encryption Key',
    32
  );
}

/**
 * Validate a NextAuth JWT token.
 * NextAuth tokens are encrypted JWTs (JWE) using the NEXTAUTH_SECRET.
 *
 * @param token - The JWT token from the client
 * @returns Auth result with userId if valid, null if invalid
 */
export async function validateNextAuthToken(token: string): Promise<AuthResult | null> {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.warn('[Auth] NEXTAUTH_SECRET not configured');
      return null;
    }

    // Derive the encryption key the same way NextAuth does (using HKDF)
    const encryptionKey = await deriveEncryptionKey(secret);

    // Decrypt the NextAuth JWE token
    const { payload } = await jwtDecrypt(token, encryptionKey, {
      clockTolerance: 60, // Allow 60 seconds clock skew
    });

    // NextAuth stores user ID in the 'sub' claim
    const userId = payload.sub as string | undefined;
    if (!userId) {
      console.warn('[Auth] Token missing sub claim');
      return null;
    }

    return {
      userId,
      isAuthenticated: true,
    };
  } catch (error) {
    // Log the error but don't expose details to caller
    if (error instanceof Error) {
      console.warn('[Auth] Token validation failed:', error.message);
    }
    return null;
  }
}

/**
 * Extract auth token from various sources.
 * Checks connection params first, then falls back to URL query params.
 */
export function extractAuthToken(
  connectionParams?: Record<string, unknown>,
  requestUrl?: string
): string | null {
  // Check connection params (preferred method)
  if (connectionParams?.authToken && typeof connectionParams.authToken === 'string') {
    return connectionParams.authToken;
  }

  // Fall back to URL query params
  if (requestUrl) {
    try {
      const url = new URL(requestUrl, 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) {
        return token;
      }
    } catch {
      // Invalid URL, ignore
    }
  }

  return null;
}
