import { describe, it, expect } from 'vitest';
import {
  VALID_BOARD_TYPES,
  VALID_HOLD_TYPES,
  parseIntSafe,
  isValidBoardType,
  isValidHoldType,
  isValidRating,
  isValidPullDirection,
} from '../validation';

describe('hold-classifications validation', () => {
  describe('parseIntSafe', () => {
    it('should parse valid integer strings', () => {
      expect(parseIntSafe('123')).toBe(123);
      expect(parseIntSafe('0')).toBe(0);
      expect(parseIntSafe('-5')).toBe(-5);
    });

    it('should return null for invalid inputs', () => {
      expect(parseIntSafe(null)).toBe(null);
      expect(parseIntSafe('abc')).toBe(null);
      expect(parseIntSafe('')).toBe(null);
      expect(parseIntSafe('12.5')).toBe(12); // parseInt behavior
    });
  });

  describe('isValidBoardType', () => {
    it('should accept valid board types', () => {
      expect(isValidBoardType('kilter')).toBe(true);
      expect(isValidBoardType('tension')).toBe(true);
      expect(isValidBoardType('moonboard')).toBe(true);
    });

    it('should reject invalid board types', () => {
      expect(isValidBoardType('invalid')).toBe(false);
      expect(isValidBoardType('')).toBe(false);
      expect(isValidBoardType(null)).toBe(false);
      expect(isValidBoardType(undefined)).toBe(false);
      expect(isValidBoardType(123)).toBe(false);
      expect(isValidBoardType({})).toBe(false);
    });

    it('should have correct board types in constant', () => {
      expect(VALID_BOARD_TYPES).toContain('kilter');
      expect(VALID_BOARD_TYPES).toContain('tension');
      expect(VALID_BOARD_TYPES).toContain('moonboard');
      expect(VALID_BOARD_TYPES.length).toBe(3);
    });
  });

  describe('isValidHoldType', () => {
    it('should accept valid hold types', () => {
      expect(isValidHoldType('jug')).toBe(true);
      expect(isValidHoldType('sloper')).toBe(true);
      expect(isValidHoldType('pinch')).toBe(true);
      expect(isValidHoldType('crimp')).toBe(true);
      expect(isValidHoldType('pocket')).toBe(true);
    });

    it('should reject removed hold types', () => {
      expect(isValidHoldType('edge')).toBe(false);
      expect(isValidHoldType('sidepull')).toBe(false);
      expect(isValidHoldType('undercling')).toBe(false);
    });

    it('should reject invalid hold types', () => {
      expect(isValidHoldType('invalid')).toBe(false);
      expect(isValidHoldType('')).toBe(false);
      expect(isValidHoldType(null)).toBe(false);
      expect(isValidHoldType(undefined)).toBe(false);
      expect(isValidHoldType(123)).toBe(false);
    });

    it('should have correct hold types in constant', () => {
      expect(VALID_HOLD_TYPES).toContain('jug');
      expect(VALID_HOLD_TYPES).toContain('sloper');
      expect(VALID_HOLD_TYPES).toContain('pinch');
      expect(VALID_HOLD_TYPES).toContain('crimp');
      expect(VALID_HOLD_TYPES).toContain('pocket');
      expect(VALID_HOLD_TYPES).not.toContain('edge');
      expect(VALID_HOLD_TYPES).not.toContain('sidepull');
      expect(VALID_HOLD_TYPES).not.toContain('undercling');
      expect(VALID_HOLD_TYPES.length).toBe(5);
    });
  });

  describe('isValidRating', () => {
    it('should accept ratings 1-5', () => {
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(2)).toBe(true);
      expect(isValidRating(3)).toBe(true);
      expect(isValidRating(4)).toBe(true);
      expect(isValidRating(5)).toBe(true);
    });

    it('should reject out of range ratings', () => {
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(6)).toBe(false);
      expect(isValidRating(-1)).toBe(false);
      expect(isValidRating(100)).toBe(false);
    });

    it('should reject non-integer ratings', () => {
      expect(isValidRating(1.5)).toBe(false);
      expect(isValidRating(2.7)).toBe(false);
    });

    it('should reject non-number values', () => {
      expect(isValidRating('3')).toBe(false);
      expect(isValidRating(null)).toBe(false);
      expect(isValidRating(undefined)).toBe(false);
      expect(isValidRating({})).toBe(false);
    });
  });

  describe('isValidPullDirection', () => {
    it('should accept valid angles 0-360', () => {
      expect(isValidPullDirection(0)).toBe(true);
      expect(isValidPullDirection(90)).toBe(true);
      expect(isValidPullDirection(180)).toBe(true);
      expect(isValidPullDirection(270)).toBe(true);
      expect(isValidPullDirection(360)).toBe(true);
      expect(isValidPullDirection(45)).toBe(true);
    });

    it('should reject out of range angles', () => {
      expect(isValidPullDirection(-1)).toBe(false);
      expect(isValidPullDirection(361)).toBe(false);
      expect(isValidPullDirection(-90)).toBe(false);
      expect(isValidPullDirection(720)).toBe(false);
    });

    it('should reject non-integer angles', () => {
      expect(isValidPullDirection(45.5)).toBe(false);
      expect(isValidPullDirection(90.1)).toBe(false);
    });

    it('should reject non-number values', () => {
      expect(isValidPullDirection('90')).toBe(false);
      expect(isValidPullDirection(null)).toBe(false);
      expect(isValidPullDirection(undefined)).toBe(false);
      expect(isValidPullDirection({})).toBe(false);
    });
  });
});
