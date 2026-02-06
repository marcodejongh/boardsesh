import type { IncomingMessage, ServerResponse } from 'http';

// Vercel preview deployment pattern: https://boardsesh-{hash}-marcodejonghs-projects.vercel.app
const VERCEL_PREVIEW_REGEX = /^https:\/\/boardsesh-[a-z0-9]+-marcodejonghs-projects\.vercel\.app$/;

let allowedOrigins: string[] = [];

/**
 * Initialize CORS with allowed origins based on environment
 */
export function initCors(boardseshUrl: string): void {
  allowedOrigins = [boardseshUrl];

  // Also allow www subdomain variant
  try {
    const url = new URL(boardseshUrl);
    if (!url.hostname.startsWith('www.')) {
      allowedOrigins.push(`${url.protocol}//www.${url.hostname}`);
    }
  } catch {
    // Invalid URL, skip www variant
  }

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
    allowedOrigins.push('http://localhost:3001', 'http://127.0.0.1:3001'); // For multi-instance testing

    // Allow additional origins for LAN/mobile testing via DEV_ALLOWED_ORIGINS env var
    // Example: DEV_ALLOWED_ORIGINS=http://192.168.0.201:3000,http://192.168.1.100:3000
    const devAllowedOrigins = process.env.DEV_ALLOWED_ORIGINS;
    if (devAllowedOrigins) {
      devAllowedOrigins.split(',').forEach(origin => {
        const trimmed = origin.trim();
        if (trimmed) {
          allowedOrigins.push(trimmed);
        }
      });
    }
  }
}

/**
 * Check if an origin is allowed (includes Vercel preview deployments)
 */
export function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  return VERCEL_PREVIEW_REGEX.test(origin);
}

/**
 * Apply CORS headers to a response.
 * Returns false if this was an OPTIONS request and response was sent.
 * Returns true if processing should continue.
 */
export function applyCorsHeaders(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return false; // Signal that response was sent
  }

  return true; // Continue processing
}

/**
 * Get the list of allowed origins (for WebSocket verification)
 */
export function getAllowedOrigins(): string[] {
  return allowedOrigins;
}
