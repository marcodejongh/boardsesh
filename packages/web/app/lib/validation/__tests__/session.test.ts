import { describe, it, expect } from 'vitest';
import {
  SessionIdSchema,
  SessionNameSchema,
  SESSION_ID_MAX_LENGTH,
  SESSION_NAME_MAX_LENGTH,
} from '../session';

describe('SessionIdSchema', () => {
  describe('valid session IDs', () => {
    it('should accept alphanumeric strings', () => {
      const result = SessionIdSchema.safeParse('mySession123');
      expect(result.success).toBe(true);
      expect(result.data).toBe('mySession123');
    });

    it('should accept strings with hyphens', () => {
      const result = SessionIdSchema.safeParse('my-session-123');
      expect(result.success).toBe(true);
      expect(result.data).toBe('my-session-123');
    });

    it('should accept UUIDs', () => {
      const result = SessionIdSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('should accept single character', () => {
      const result = SessionIdSchema.safeParse('a');
      expect(result.success).toBe(true);
    });

    it('should accept string at max length', () => {
      const maxLengthString = 'a'.repeat(SESSION_ID_MAX_LENGTH);
      const result = SessionIdSchema.safeParse(maxLengthString);
      expect(result.success).toBe(true);
    });

    it('should accept uppercase letters', () => {
      const result = SessionIdSchema.safeParse('MySession');
      expect(result.success).toBe(true);
    });

    it('should accept all numbers', () => {
      const result = SessionIdSchema.safeParse('123456');
      expect(result.success).toBe(true);
    });

    it('should accept hyphen-only strings', () => {
      const result = SessionIdSchema.safeParse('---');
      expect(result.success).toBe(true);
    });
  });

  describe('invalid session IDs', () => {
    it('should reject empty strings', () => {
      const result = SessionIdSchema.safeParse('');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Session ID cannot be empty');
    });

    it('should reject strings over max length', () => {
      const tooLongString = 'a'.repeat(SESSION_ID_MAX_LENGTH + 1);
      const result = SessionIdSchema.safeParse(tooLongString);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('100 characters or less');
    });

    it('should reject strings with spaces', () => {
      const result = SessionIdSchema.safeParse('my session');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        'Session ID can only contain letters, numbers, and hyphens'
      );
    });

    it('should reject strings with special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '='];
      for (const char of specialChars) {
        const result = SessionIdSchema.safeParse(`test${char}session`);
        expect(result.success).toBe(false);
      }
    });

    it('should reject strings with forward slashes', () => {
      const result = SessionIdSchema.safeParse('path/to/session');
      expect(result.success).toBe(false);
    });

    it('should reject strings with backslashes', () => {
      const result = SessionIdSchema.safeParse('path\\to\\session');
      expect(result.success).toBe(false);
    });

    it('should reject strings with angle brackets (XSS prevention)', () => {
      const result = SessionIdSchema.safeParse('<script>alert(1)</script>');
      expect(result.success).toBe(false);
    });

    it('should reject strings with quotes', () => {
      const singleQuote = SessionIdSchema.safeParse("test'session");
      const doubleQuote = SessionIdSchema.safeParse('test"session');
      expect(singleQuote.success).toBe(false);
      expect(doubleQuote.success).toBe(false);
    });

    it('should reject non-string types', () => {
      expect(SessionIdSchema.safeParse(123).success).toBe(false);
      expect(SessionIdSchema.safeParse(null).success).toBe(false);
      expect(SessionIdSchema.safeParse(undefined).success).toBe(false);
      expect(SessionIdSchema.safeParse({}).success).toBe(false);
      expect(SessionIdSchema.safeParse([]).success).toBe(false);
    });

    it('should reject strings with newlines', () => {
      const result = SessionIdSchema.safeParse('test\nsession');
      expect(result.success).toBe(false);
    });

    it('should reject strings with tabs', () => {
      const result = SessionIdSchema.safeParse('test\tsession');
      expect(result.success).toBe(false);
    });

    it('should reject unicode characters', () => {
      const result = SessionIdSchema.safeParse('test🎯session');
      expect(result.success).toBe(false);
    });

    it('should reject strings with dots', () => {
      const result = SessionIdSchema.safeParse('test.session');
      expect(result.success).toBe(false);
    });
  });

  describe('boundary conditions', () => {
    it('should accept exactly 1 character (minimum)', () => {
      const result = SessionIdSchema.safeParse('x');
      expect(result.success).toBe(true);
    });

    it('should accept exactly 100 characters (maximum)', () => {
      const result = SessionIdSchema.safeParse('a'.repeat(100));
      expect(result.success).toBe(true);
    });

    it('should reject 101 characters (over maximum)', () => {
      const result = SessionIdSchema.safeParse('a'.repeat(101));
      expect(result.success).toBe(false);
    });
  });
});

describe('SessionNameSchema', () => {
  describe('valid session names', () => {
    it('should accept undefined (optional)', () => {
      const result = SessionNameSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should accept empty string', () => {
      const result = SessionNameSchema.safeParse('');
      expect(result.success).toBe(true);
    });

    it('should accept strings with spaces', () => {
      const result = SessionNameSchema.safeParse("Marco's Climbing Night");
      expect(result.success).toBe(true);
    });

    it('should accept strings with special characters', () => {
      const result = SessionNameSchema.safeParse('Kilter @ The Gym');
      expect(result.success).toBe(true);
    });

    it('should accept string at max length', () => {
      const maxLengthString = 'a'.repeat(SESSION_NAME_MAX_LENGTH);
      const result = SessionNameSchema.safeParse(maxLengthString);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid session names', () => {
    it('should reject strings over max length', () => {
      const tooLongString = 'a'.repeat(SESSION_NAME_MAX_LENGTH + 1);
      const result = SessionNameSchema.safeParse(tooLongString);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('100 characters or less');
    });
  });

  describe('boundary conditions', () => {
    it('should accept exactly 100 characters (maximum)', () => {
      const result = SessionNameSchema.safeParse('a'.repeat(100));
      expect(result.success).toBe(true);
    });

    it('should reject 101 characters (over maximum)', () => {
      const result = SessionNameSchema.safeParse('a'.repeat(101));
      expect(result.success).toBe(false);
    });
  });
});

describe('Constants', () => {
  it('SESSION_ID_MAX_LENGTH should be 100', () => {
    expect(SESSION_ID_MAX_LENGTH).toBe(100);
  });

  it('SESSION_NAME_MAX_LENGTH should be 100', () => {
    expect(SESSION_NAME_MAX_LENGTH).toBe(100);
  });
});
