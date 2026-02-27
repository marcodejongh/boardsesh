import { describe, it, expect } from 'vitest';
import { SetCommunitySettingInputSchema } from '../validation/schemas';

describe('Community Settings Validation Schemas', () => {
  describe('SetCommunitySettingInputSchema', () => {
    const validInput = {
      scope: 'global' as const,
      scopeKey: 'default',
      key: 'auto_approve_threshold',
      value: '5',
    };

    it('should accept valid input with global scope', () => {
      const result = SetCommunitySettingInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept board scope', () => {
      const result = SetCommunitySettingInputSchema.safeParse({ ...validInput, scope: 'board' });
      expect(result.success).toBe(true);
    });

    it('should accept climb scope', () => {
      const result = SetCommunitySettingInputSchema.safeParse({ ...validInput, scope: 'climb' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid scope', () => {
      const result = SetCommunitySettingInputSchema.safeParse({ ...validInput, scope: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject empty key', () => {
      const result = SetCommunitySettingInputSchema.safeParse({ ...validInput, key: '' });
      expect(result.success).toBe(false);
    });

    it('should reject key exceeding max length', () => {
      const result = SetCommunitySettingInputSchema.safeParse({ ...validInput, key: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject value exceeding max length', () => {
      const result = SetCommunitySettingInputSchema.safeParse({ ...validInput, value: 'a'.repeat(1001) });
      expect(result.success).toBe(false);
    });

    it('should reject scopeKey exceeding max length', () => {
      const result = SetCommunitySettingInputSchema.safeParse({ ...validInput, scopeKey: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('should reject missing scope', () => {
      const { scope: _, ...withoutScope } = validInput;
      const result = SetCommunitySettingInputSchema.safeParse(withoutScope);
      expect(result.success).toBe(false);
    });

    it('should reject missing key', () => {
      const { key: _, ...withoutKey } = validInput;
      const result = SetCommunitySettingInputSchema.safeParse(withoutKey);
      expect(result.success).toBe(false);
    });

    it('should reject missing value', () => {
      const { value: _, ...withoutValue } = validInput;
      const result = SetCommunitySettingInputSchema.safeParse(withoutValue);
      expect(result.success).toBe(false);
    });

    it('should accept empty scopeKey', () => {
      const result = SetCommunitySettingInputSchema.safeParse({ ...validInput, scopeKey: '' });
      expect(result.success).toBe(true);
    });

    it('should accept value at max length boundary', () => {
      const result = SetCommunitySettingInputSchema.safeParse({ ...validInput, value: 'a'.repeat(1000) });
      expect(result.success).toBe(true);
    });
  });
});
