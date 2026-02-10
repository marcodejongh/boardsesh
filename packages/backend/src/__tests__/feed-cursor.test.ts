import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, encodeOffsetCursor, decodeOffsetCursor } from '../utils/feed-cursor';

describe('Feed Cursor', () => {
  describe('encodeCursor', () => {
    it('should encode a cursor from a string timestamp and id', () => {
      const cursor = encodeCursor('2024-01-15T10:30:00.000Z', 42);
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
    });

    it('should encode a cursor from a Date object and id', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const cursor = encodeCursor(date, 42);
      expect(typeof cursor).toBe('string');
    });

    it('should produce base64url-safe output (no +, /, =)', () => {
      const cursor = encodeCursor('2024-01-15T10:30:00.000Z', 999999);
      expect(cursor).not.toMatch(/[+/=]/);
    });
  });

  describe('decodeCursor', () => {
    it('should decode a valid cursor', () => {
      const encoded = encodeCursor('2024-01-15T10:30:00.000Z', 42);
      const decoded = decodeCursor(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded!.createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(decoded!.id).toBe(42);
    });

    it('should round-trip a Date object', () => {
      const date = new Date('2024-06-01T12:00:00.000Z');
      const encoded = encodeCursor(date, 100);
      const decoded = decodeCursor(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded!.createdAt).toBe(date.toISOString());
      expect(decoded!.id).toBe(100);
    });

    it('should return null for invalid base64', () => {
      expect(decodeCursor('not-valid-base64!!!')).toBeNull();
    });

    it('should return null for valid base64 but invalid JSON', () => {
      const encoded = Buffer.from('not json').toString('base64url');
      expect(decodeCursor(encoded)).toBeNull();
    });

    it('should return null for JSON missing required fields', () => {
      const encoded = Buffer.from(JSON.stringify({ x: 1 })).toString('base64url');
      expect(decodeCursor(encoded)).toBeNull();
    });

    it('should return null for JSON with wrong types', () => {
      const encoded = Buffer.from(JSON.stringify({ t: 123, i: 'not-a-number' })).toString('base64url');
      expect(decodeCursor(encoded)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(decodeCursor('')).toBeNull();
    });
  });

  describe('round-trip', () => {
    it('should preserve large IDs', () => {
      const id = 9007199254740991; // Number.MAX_SAFE_INTEGER
      const encoded = encodeCursor('2024-12-31T23:59:59.999Z', id);
      const decoded = decodeCursor(encoded);
      expect(decoded!.id).toBe(id);
    });

    it('should preserve id=0', () => {
      const encoded = encodeCursor('2024-01-01T00:00:00.000Z', 0);
      const decoded = decodeCursor(encoded);
      // id=0 is falsy but should still decode (typeof check, not truthiness)
      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe(0);
    });
  });

  describe('encodeOffsetCursor', () => {
    it('should encode an offset', () => {
      const cursor = encodeOffsetCursor(20);
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
    });

    it('should produce base64url-safe output', () => {
      const cursor = encodeOffsetCursor(100);
      expect(cursor).not.toMatch(/[+/=]/);
    });
  });

  describe('decodeOffsetCursor', () => {
    it('should round-trip an offset value', () => {
      const encoded = encodeOffsetCursor(40);
      const decoded = decodeOffsetCursor(encoded);
      expect(decoded).toBe(40);
    });

    it('should decode offset=0', () => {
      const encoded = encodeOffsetCursor(0);
      expect(decodeOffsetCursor(encoded)).toBe(0);
    });

    it('should return null for negative offset', () => {
      const encoded = Buffer.from(JSON.stringify({ o: -5 })).toString('base64url');
      expect(decodeOffsetCursor(encoded)).toBeNull();
    });

    it('should return null for non-number offset', () => {
      const encoded = Buffer.from(JSON.stringify({ o: 'abc' })).toString('base64url');
      expect(decodeOffsetCursor(encoded)).toBeNull();
    });

    it('should return null for missing offset field', () => {
      const encoded = Buffer.from(JSON.stringify({ x: 10 })).toString('base64url');
      expect(decodeOffsetCursor(encoded)).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(decodeOffsetCursor('')).toBeNull();
      expect(decodeOffsetCursor('garbage!!!')).toBeNull();
    });

    it('should not confuse keyset cursor with offset cursor', () => {
      const keysetCursor = encodeCursor('2024-01-01T00:00:00.000Z', 42);
      // keyset cursor has {t, i} but not {o} — should return null
      expect(decodeOffsetCursor(keysetCursor)).toBeNull();
    });
  });
});
