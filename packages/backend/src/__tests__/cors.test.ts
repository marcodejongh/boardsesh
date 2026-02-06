import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initCors, isOriginAllowed, applyCorsHeaders, getAllowedOrigins } from '../handlers/cors';

describe('CORS Handler', () => {
  beforeEach(() => {
    // Reset to a known state before each test
    initCors('https://boardsesh.com');
  });

  describe('initCors', () => {
    it('adds the provided URL to allowed origins', () => {
      initCors('https://example.com');
      expect(getAllowedOrigins()).toContain('https://example.com');
    });

    it('adds www. subdomain variant when hostname does not start with www.', () => {
      initCors('https://boardsesh.com');
      const origins = getAllowedOrigins();
      expect(origins).toContain('https://boardsesh.com');
      expect(origins).toContain('https://www.boardsesh.com');
    });

    it('skips www. variant when hostname already starts with www.', () => {
      initCors('https://www.boardsesh.com');
      const origins = getAllowedOrigins();
      expect(origins).toContain('https://www.boardsesh.com');
      // Should NOT have https://www.www.boardsesh.com
      expect(origins).not.toContain('https://www.www.boardsesh.com');
    });

    it('handles invalid URL gracefully without crashing', () => {
      expect(() => initCors('not-a-valid-url')).not.toThrow();
      // The invalid string is still added as-is
      expect(getAllowedOrigins()).toContain('not-a-valid-url');
    });

    it('adds localhost origins in non-production env', () => {
      // vitest env is 'test', not 'production'
      initCors('https://boardsesh.com');
      const origins = getAllowedOrigins();
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://127.0.0.1:3000');
      expect(origins).toContain('http://localhost:3001');
      expect(origins).toContain('http://127.0.0.1:3001');
    });

    it('parses DEV_ALLOWED_ORIGINS env var (comma-separated, trimmed)', () => {
      process.env.DEV_ALLOWED_ORIGINS = ' http://192.168.0.1:3000 , http://10.0.0.1:3000 ';
      initCors('https://boardsesh.com');
      const origins = getAllowedOrigins();
      expect(origins).toContain('http://192.168.0.1:3000');
      expect(origins).toContain('http://10.0.0.1:3000');
      delete process.env.DEV_ALLOWED_ORIGINS;
    });

    it('ignores empty strings from DEV_ALLOWED_ORIGINS', () => {
      process.env.DEV_ALLOWED_ORIGINS = 'http://192.168.0.1:3000,,, ,';
      initCors('https://boardsesh.com');
      const origins = getAllowedOrigins();
      expect(origins).toContain('http://192.168.0.1:3000');
      // Should not contain empty strings
      expect(origins.every((o) => o.length > 0)).toBe(true);
      delete process.env.DEV_ALLOWED_ORIGINS;
    });
  });

  describe('isOriginAllowed', () => {
    beforeEach(() => {
      initCors('https://boardsesh.com');
    });

    it('returns true for origins in the allowed list', () => {
      expect(isOriginAllowed('https://boardsesh.com')).toBe(true);
      expect(isOriginAllowed('https://www.boardsesh.com')).toBe(true);
    });

    it('returns true for Vercel preview deployments matching regex', () => {
      expect(
        isOriginAllowed('https://boardsesh-abc123-marcodejonghs-projects.vercel.app'),
      ).toBe(true);
    });

    it('returns false for origins not in list and not matching regex', () => {
      expect(isOriginAllowed('https://evil.com')).toBe(false);
      expect(isOriginAllowed('https://notboardsesh.com')).toBe(false);
    });

    it('returns false for partial regex matches with wrong prefix', () => {
      expect(
        isOriginAllowed('http://boardsesh-abc123-marcodejonghs-projects.vercel.app'),
      ).toBe(false); // http not https
    });

    it('returns false for partial regex matches with wrong suffix', () => {
      expect(
        isOriginAllowed('https://boardsesh-abc123-marcodejonghs-projects.vercel.app.evil.com'),
      ).toBe(false);
    });

    it('returns true for localhost origins in non-production', () => {
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:3001')).toBe(true);
    });
  });

  describe('applyCorsHeaders', () => {
    function createMockReq(method: string, origin?: string) {
      return {
        method,
        headers: origin ? { origin } : {},
      } as unknown as import('http').IncomingMessage;
    }

    function createMockRes() {
      const headers: Record<string, string> = {};
      return {
        setHeader: vi.fn((key: string, value: string) => {
          headers[key] = value;
        }),
        writeHead: vi.fn(),
        end: vi.fn(),
        _headers: headers,
      } as unknown as import('http').ServerResponse & { _headers: Record<string, string> };
    }

    it('sets Access-Control-Allow-Origin to request origin when allowed', () => {
      const req = createMockReq('GET', 'https://boardsesh.com');
      const res = createMockRes();
      applyCorsHeaders(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://boardsesh.com');
    });

    it('sets Access-Control-Allow-Credentials to true when origin is allowed', () => {
      const req = createMockReq('GET', 'https://boardsesh.com');
      const res = createMockRes();
      applyCorsHeaders(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    it('does NOT set origin-specific headers when origin is not allowed', () => {
      const req = createMockReq('GET', 'https://evil.com');
      const res = createMockRes();
      applyCorsHeaders(req, res);

      expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.anything());
      expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', expect.anything());
    });

    it('always sets Access-Control-Allow-Methods', () => {
      const req = createMockReq('GET', 'https://evil.com');
      const res = createMockRes();
      applyCorsHeaders(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    });

    it('always sets Access-Control-Allow-Headers', () => {
      const req = createMockReq('GET');
      const res = createMockRes();
      applyCorsHeaders(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    });

    it('returns false and sends 200 for OPTIONS requests', () => {
      const req = createMockReq('OPTIONS', 'https://boardsesh.com');
      const res = createMockRes();
      const result = applyCorsHeaders(req, res);

      expect(result).toBe(false);
      expect(res.writeHead).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
    });

    it('returns true for non-OPTIONS requests', () => {
      const req = createMockReq('GET', 'https://boardsesh.com');
      const res = createMockRes();
      const result = applyCorsHeaders(req, res);

      expect(result).toBe(true);
      expect(res.writeHead).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it('returns true for POST requests', () => {
      const req = createMockReq('POST', 'https://boardsesh.com');
      const res = createMockRes();
      const result = applyCorsHeaders(req, res);

      expect(result).toBe(true);
    });
  });

  describe('getAllowedOrigins', () => {
    it('returns the current allowed origins list', () => {
      initCors('https://test.com');
      const origins = getAllowedOrigins();
      expect(Array.isArray(origins)).toBe(true);
      expect(origins).toContain('https://test.com');
    });
  });
});
