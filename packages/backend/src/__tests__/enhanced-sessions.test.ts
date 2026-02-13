import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateSessionInputSchema,
  EndSessionInputSchema,
  SessionSummaryInputSchema,
} from '../validation/schemas';

describe('Enhanced Sessions - CreateSessionInputSchema Validation', () => {
  const validInput = {
    boardPath: '/kilter/1/2/3/40',
    latitude: 37.7749,
    longitude: -122.4194,
    discoverable: true,
  };

  it('should accept valid input without optional fields', () => {
    const result = CreateSessionInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should accept valid input with goal', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      goal: 'Send V5 today',
    });
    expect(result.success).toBe(true);
  });

  it('should reject goal exceeding 500 characters', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      goal: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('should accept empty goal string', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      goal: '',
    });
    expect(result.success).toBe(true);
  });

  it('should accept goal at max length (500)', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      goal: 'x'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid hex color', () => {
    const validColors = ['#FF5722', '#00ff00', '#AABBCC', '#123456'];
    for (const color of validColors) {
      const result = CreateSessionInputSchema.safeParse({ ...validInput, color });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid color format', () => {
    const invalid = ['red', '#FFF', '#GGGGGG', 'FF5722', '#ff572', 'rgb(255,0,0)', '#1234567'];
    for (const color of invalid) {
      const result = CreateSessionInputSchema.safeParse({ ...validInput, color });
      expect(result.success).toBe(false);
    }
  });

  it('should accept valid boardIds array', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      boardIds: [1, 2, 3],
    });
    expect(result.success).toBe(true);
  });

  it('should reject boardIds with non-positive integers', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      boardIds: [0, -1],
    });
    expect(result.success).toBe(false);
  });

  it('should reject boardIds with non-integer values', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      boardIds: [1.5, 2.7],
    });
    expect(result.success).toBe(false);
  });

  it('should reject boardIds exceeding max length (20)', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      boardIds: Array.from({ length: 21 }, (_, i) => i + 1),
    });
    expect(result.success).toBe(false);
  });

  it('should accept boardIds at max length (20)', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      boardIds: Array.from({ length: 20 }, (_, i) => i + 1),
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty boardIds array', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      boardIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('should accept isPermanent flag', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      isPermanent: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPermanent).toBe(true);
    }
  });

  it('should default isPermanent to undefined when not provided', () => {
    const result = CreateSessionInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPermanent).toBeUndefined();
    }
  });

  it('should accept all optional fields together', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      goal: 'Flash everything',
      isPermanent: false,
      boardIds: [1, 2],
      color: '#00FF00',
      name: 'Morning Session',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.goal).toBe('Flash everything');
      expect(result.data.isPermanent).toBe(false);
      expect(result.data.boardIds).toEqual([1, 2]);
      expect(result.data.color).toBe('#00FF00');
      expect(result.data.name).toBe('Morning Session');
    }
  });

  it('should still require mandatory fields', () => {
    const result = CreateSessionInputSchema.safeParse({
      goal: 'Only optional fields',
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-boolean isPermanent', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      isPermanent: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-array boardIds', () => {
    const result = CreateSessionInputSchema.safeParse({
      ...validInput,
      boardIds: 'not-an-array',
    });
    expect(result.success).toBe(false);
  });
});

describe('Enhanced Sessions - EndSessionInputSchema Validation', () => {
  it('should accept a valid UUID session ID', () => {
    const result = EndSessionInputSchema.safeParse({ sessionId: uuidv4() });
    expect(result.success).toBe(true);
  });

  it('should accept alphanumeric session ID with hyphens', () => {
    const result = EndSessionInputSchema.safeParse({ sessionId: 'my-session-123' });
    expect(result.success).toBe(true);
  });

  it('should reject empty session ID', () => {
    const result = EndSessionInputSchema.safeParse({ sessionId: '' });
    expect(result.success).toBe(false);
  });

  it('should reject session ID with special characters', () => {
    const result = EndSessionInputSchema.safeParse({ sessionId: '<script>alert(1)</script>' });
    expect(result.success).toBe(false);
  });

  it('should reject session ID exceeding max length', () => {
    const result = EndSessionInputSchema.safeParse({ sessionId: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('should reject missing sessionId', () => {
    const result = EndSessionInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('Enhanced Sessions - SessionSummaryInputSchema Validation', () => {
  it('should accept a valid UUID session ID', () => {
    const result = SessionSummaryInputSchema.safeParse({ sessionId: uuidv4() });
    expect(result.success).toBe(true);
  });

  it('should reject missing sessionId', () => {
    const result = SessionSummaryInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject session ID with SQL injection attempt', () => {
    const result = SessionSummaryInputSchema.safeParse({
      sessionId: "'; DROP TABLE board_sessions; --",
    });
    expect(result.success).toBe(false);
  });
});

describe('Enhanced Sessions - Color Validation Edge Cases', () => {
  const validInput = {
    boardPath: '/kilter/1/2/3/40',
    latitude: 37.7749,
    longitude: -122.4194,
    discoverable: true,
  };

  it('should accept lowercase hex color', () => {
    const result = CreateSessionInputSchema.safeParse({ ...validInput, color: '#aabbcc' });
    expect(result.success).toBe(true);
  });

  it('should accept uppercase hex color', () => {
    const result = CreateSessionInputSchema.safeParse({ ...validInput, color: '#AABBCC' });
    expect(result.success).toBe(true);
  });

  it('should accept mixed case hex color', () => {
    const result = CreateSessionInputSchema.safeParse({ ...validInput, color: '#AaBbCc' });
    expect(result.success).toBe(true);
  });

  it('should reject 3-digit hex color', () => {
    const result = CreateSessionInputSchema.safeParse({ ...validInput, color: '#ABC' });
    expect(result.success).toBe(false);
  });

  it('should reject 8-digit hex color (with alpha)', () => {
    const result = CreateSessionInputSchema.safeParse({ ...validInput, color: '#AABBCCDD' });
    expect(result.success).toBe(false);
  });

  it('should reject color without hash prefix', () => {
    const result = CreateSessionInputSchema.safeParse({ ...validInput, color: 'AABBCC' });
    expect(result.success).toBe(false);
  });
});
