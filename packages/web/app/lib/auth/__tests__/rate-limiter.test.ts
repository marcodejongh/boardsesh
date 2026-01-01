import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, getClientIp } from '../rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    // Reset the module to clear the in-memory store between tests
    vi.resetModules();
  });

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', async () => {
      const identifier = `test-${Date.now()}-1`;

      // First request should be allowed
      const result1 = checkRateLimit(identifier, 5, 60000);
      expect(result1.limited).toBe(false);
      expect(result1.retryAfterSeconds).toBe(0);

      // Second request should also be allowed
      const result2 = checkRateLimit(identifier, 5, 60000);
      expect(result2.limited).toBe(false);
    });

    it('should block requests when limit is exceeded', async () => {
      const identifier = `test-${Date.now()}-2`;
      const maxRequests = 3;

      // Make requests up to the limit
      for (let i = 0; i < maxRequests; i++) {
        const result = checkRateLimit(identifier, maxRequests, 60000);
        expect(result.limited).toBe(false);
      }

      // The next request should be blocked
      const blockedResult = checkRateLimit(identifier, maxRequests, 60000);
      expect(blockedResult.limited).toBe(true);
      expect(blockedResult.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should use different limits for different identifiers', async () => {
      const identifier1 = `test-${Date.now()}-3a`;
      const identifier2 = `test-${Date.now()}-3b`;

      // Exhaust limit for identifier1
      for (let i = 0; i < 2; i++) {
        checkRateLimit(identifier1, 2, 60000);
      }

      // identifier1 should be blocked
      const result1 = checkRateLimit(identifier1, 2, 60000);
      expect(result1.limited).toBe(true);

      // identifier2 should still be allowed
      const result2 = checkRateLimit(identifier2, 2, 60000);
      expect(result2.limited).toBe(false);
    });

    it('should reset after window expires', async () => {
      const identifier = `test-${Date.now()}-4`;
      const shortWindow = 100; // 100ms window for testing

      // Exhaust the limit
      for (let i = 0; i < 2; i++) {
        checkRateLimit(identifier, 2, shortWindow);
      }

      // Should be blocked
      const blockedResult = checkRateLimit(identifier, 2, shortWindow);
      expect(blockedResult.limited).toBe(true);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, shortWindow + 50));

      // Should be allowed again
      const allowedResult = checkRateLimit(identifier, 2, shortWindow);
      expect(allowedResult.limited).toBe(false);
    });

    it('should use default values when not specified', async () => {
      const identifier = `test-${Date.now()}-5`;

      // Should use defaults (5 requests, 60 seconds)
      const result = checkRateLimit(identifier);
      expect(result.limited).toBe(false);
      expect(result.retryAfterSeconds).toBe(0);
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from single x-forwarded-for value', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '203.0.113.195',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('203.0.113.195');
    });

    it('should use x-real-ip when x-forwarded-for is not present', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '10.0.0.1',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('10.0.0.1');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '10.0.0.1',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return "unknown" when no IP headers are present', () => {
      const request = new Request('http://localhost');

      const ip = getClientIp(request);
      expect(ip).toBe('unknown');
    });

    it('should trim whitespace from IP addresses', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '  192.168.1.1  ',
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe('192.168.1.1');
    });
  });
});
