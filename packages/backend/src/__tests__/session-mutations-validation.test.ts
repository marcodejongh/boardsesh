import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-create the validation schemas (same as in session-mutations.ts)
const UpdateInferredSessionSchema = z.object({
  sessionId: z.string().min(1),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const AddUserToSessionSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
});

const RemoveUserFromSessionSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
});

describe('Session Mutation Validation Schemas', () => {
  describe('UpdateInferredSessionSchema', () => {
    it('accepts valid input with name', () => {
      const result = UpdateInferredSessionSchema.safeParse({
        sessionId: 'session-1',
        name: 'My Session',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid input with description', () => {
      const result = UpdateInferredSessionSchema.safeParse({
        sessionId: 'session-1',
        description: 'Great session!',
      });
      expect(result.success).toBe(true);
    });

    it('accepts null name to clear it', () => {
      const result = UpdateInferredSessionSchema.safeParse({
        sessionId: 'session-1',
        name: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeNull();
      }
    });

    it('accepts null description to clear it', () => {
      const result = UpdateInferredSessionSchema.safeParse({
        sessionId: 'session-1',
        description: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });

    it('accepts input with both name and description', () => {
      const result = UpdateInferredSessionSchema.safeParse({
        sessionId: 'session-1',
        name: 'Evening Crush',
        description: 'Projecting V7s',
      });
      expect(result.success).toBe(true);
    });

    it('accepts input with only sessionId (no updates)', () => {
      const result = UpdateInferredSessionSchema.safeParse({
        sessionId: 'session-1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty sessionId', () => {
      const result = UpdateInferredSessionSchema.safeParse({
        sessionId: '',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing sessionId', () => {
      const result = UpdateInferredSessionSchema.safeParse({
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('AddUserToSessionSchema', () => {
    it('accepts valid input', () => {
      const result = AddUserToSessionSchema.safeParse({
        sessionId: 'session-1',
        userId: 'user-2',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty sessionId', () => {
      const result = AddUserToSessionSchema.safeParse({
        sessionId: '',
        userId: 'user-2',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty userId', () => {
      const result = AddUserToSessionSchema.safeParse({
        sessionId: 'session-1',
        userId: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing userId', () => {
      const result = AddUserToSessionSchema.safeParse({
        sessionId: 'session-1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing sessionId', () => {
      const result = AddUserToSessionSchema.safeParse({
        userId: 'user-2',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('RemoveUserFromSessionSchema', () => {
    it('accepts valid input', () => {
      const result = RemoveUserFromSessionSchema.safeParse({
        sessionId: 'session-1',
        userId: 'user-2',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty sessionId', () => {
      const result = RemoveUserFromSessionSchema.safeParse({
        sessionId: '',
        userId: 'user-2',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty userId', () => {
      const result = RemoveUserFromSessionSchema.safeParse({
        sessionId: 'session-1',
        userId: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty input', () => {
      const result = RemoveUserFromSessionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
