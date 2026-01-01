/**
 * Simple in-memory rate limiter for API endpoints.
 * Uses a sliding window algorithm with per-IP tracking.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Store rate limit state per identifier (usually IP address)
const rateLimitMap = new Map<string, RateLimitEntry>();

// Default limits for email endpoints (stricter than general API)
const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 5; // 5 requests per minute per IP for email endpoints

/**
 * Check if a request should be rate limited.
 * @param identifier - The unique identifier (e.g., IP address)
 * @param maxRequests - Maximum requests allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @returns Object with limited flag and retry-after seconds
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // If no entry or window expired, create new entry
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { limited: false, retryAfterSeconds: 0 };
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  // Increment counter
  entry.count++;
  return { limited: false, retryAfterSeconds: 0 };
}

/**
 * Get client IP address from request headers.
 * Handles common proxy headers.
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, the first one is the client
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to a default identifier if no IP available
  return 'unknown';
}

// Periodically clean up expired entries to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [identifier, entry] of rateLimitMap) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(identifier);
      }
    }
  }, 60_000); // Clean up every minute
}
