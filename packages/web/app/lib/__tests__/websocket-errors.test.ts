import { describe, it, expect } from 'vitest';
import {
  isOriginError,
  isWebSocketLifecycleError,
  shouldFilterFromSentry,
  ORIGIN_ERROR_PATTERNS,
  WEBSOCKET_LIFECYCLE_PATTERNS,
} from '../websocket-errors';

describe('websocket-errors', () => {
  describe('isOriginError', () => {
    it('should detect "invalid origin" error', () => {
      expect(isOriginError('invalid origin')).toBe(true);
      expect(isOriginError('Error: invalid origin')).toBe(true);
      expect(isOriginError('Invalid Origin')).toBe(true);
    });

    it('should detect "origin not allowed" error', () => {
      expect(isOriginError('origin not allowed')).toBe(true);
      expect(isOriginError('Origin not allowed')).toBe(true);
      expect(isOriginError('Error: Origin not allowed for this request')).toBe(true);
    });

    it('should not match generic errors', () => {
      expect(isOriginError('Network error')).toBe(false);
      expect(isOriginError('Failed to fetch')).toBe(false);
      expect(isOriginError('Connection timeout')).toBe(false);
      expect(isOriginError('original')).toBe(false); // Avoid false positives
    });

    it('should be case insensitive', () => {
      expect(isOriginError('INVALID ORIGIN')).toBe(true);
      expect(isOriginError('Invalid Origin')).toBe(true);
      expect(isOriginError('invalid ORIGIN')).toBe(true);
    });

    it('should handle edge cases safely', () => {
      expect(isOriginError('')).toBe(false);
      // TypeScript enforces string type, but test runtime safety
      expect(isOriginError(undefined as unknown as string)).toBe(false);
      expect(isOriginError(null as unknown as string)).toBe(false);
    });
  });

  describe('isWebSocketLifecycleError', () => {
    it('should detect WebSocket closing state errors', () => {
      expect(isWebSocketLifecycleError('WebSocket is already in CLOSING state')).toBe(true);
      expect(isWebSocketLifecycleError('websocket is already in closing')).toBe(true);
    });

    it('should detect GraphQL subscription errors', () => {
      expect(isWebSocketLifecycleError('GraphQL subscription error')).toBe(true);
      expect(isWebSocketLifecycleError('graphql subscription terminated')).toBe(true);
    });

    it('should NOT match generic WebSocket connection errors (intentionally specific)', () => {
      // These are intentionally NOT matched to avoid suppressing legitimate errors
      expect(isWebSocketLifecycleError('WebSocket connection to wss://example.com failed')).toBe(false);
      expect(isWebSocketLifecycleError('Connection refused')).toBe(false);
    });

    it('should not match generic errors', () => {
      expect(isWebSocketLifecycleError('Network error')).toBe(false);
      expect(isWebSocketLifecycleError('Failed to fetch')).toBe(false);
    });

    it('should handle edge cases safely', () => {
      expect(isWebSocketLifecycleError('')).toBe(false);
      expect(isWebSocketLifecycleError(undefined as unknown as string)).toBe(false);
      expect(isWebSocketLifecycleError(null as unknown as string)).toBe(false);
    });
  });

  describe('shouldFilterFromSentry', () => {
    it('should filter origin errors', () => {
      expect(shouldFilterFromSentry('invalid origin')).toBe(true);
      expect(shouldFilterFromSentry('Origin not allowed')).toBe(true);
    });

    it('should filter WebSocket lifecycle errors', () => {
      expect(shouldFilterFromSentry('WebSocket is already in CLOSING state')).toBe(true);
      expect(shouldFilterFromSentry('graphql subscription error')).toBe(true);
    });

    it('should NOT filter generic network errors', () => {
      // These are legitimate errors that should be reported
      expect(shouldFilterFromSentry('Failed to fetch')).toBe(false);
      expect(shouldFilterFromSentry('Network error')).toBe(false);
      expect(shouldFilterFromSentry('Connection refused')).toBe(false);
      expect(shouldFilterFromSentry('connection closed')).toBe(false);
    });

    it('should NOT filter generic WebSocket errors (to catch legitimate failures)', () => {
      expect(shouldFilterFromSentry('WebSocket connection to wss://example.com failed')).toBe(false);
    });

    it('should NOT filter API errors', () => {
      expect(shouldFilterFromSentry('API request failed')).toBe(false);
      expect(shouldFilterFromSentry('Server error: 500')).toBe(false);
      expect(shouldFilterFromSentry('Unauthorized')).toBe(false);
    });

    it('should handle edge cases safely', () => {
      expect(shouldFilterFromSentry('')).toBe(false);
      expect(shouldFilterFromSentry(undefined as unknown as string)).toBe(false);
      expect(shouldFilterFromSentry(null as unknown as string)).toBe(false);
    });
  });

  describe('exported constants', () => {
    it('should export ORIGIN_ERROR_PATTERNS', () => {
      expect(ORIGIN_ERROR_PATTERNS).toContain('invalid origin');
      expect(ORIGIN_ERROR_PATTERNS).toContain('origin not allowed');
    });

    it('should export WEBSOCKET_LIFECYCLE_PATTERNS with specific patterns only', () => {
      expect(WEBSOCKET_LIFECYCLE_PATTERNS).toContain('websocket is already in closing');
      expect(WEBSOCKET_LIFECYCLE_PATTERNS).toContain('graphql subscription');
      // Should NOT contain overly broad patterns
      expect(WEBSOCKET_LIFECYCLE_PATTERNS).not.toContain('websocket connection to');
      expect(WEBSOCKET_LIFECYCLE_PATTERNS).not.toContain('connection closed');
    });
  });
});
