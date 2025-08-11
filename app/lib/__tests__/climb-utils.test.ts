import { hasNoMatchingPattern } from '../climb-utils';

describe('climb-utils', () => {
  describe('hasNoMatchingPattern', () => {
    it('should return true for "no matching" patterns', () => {
      expect(hasNoMatchingPattern('No matching allowed')).toBe(true);
      expect(hasNoMatchingPattern('Don\'t match this route')).toBe(true);
      expect(hasNoMatchingPattern('Dont match on this problem')).toBe(true);
      expect(hasNoMatchingPattern('no match')).toBe(true);
      expect(hasNoMatchingPattern('don\'t matching')).toBe(true);
    });

    it('should return false for descriptions without no-matching patterns', () => {
      expect(hasNoMatchingPattern('Great route with good holds')).toBe(false);
      expect(hasNoMatchingPattern('Matching holds on this climb')).toBe(false);
      expect(hasNoMatchingPattern('Really fun project')).toBe(false);
      expect(hasNoMatchingPattern('')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasNoMatchingPattern('NO MATCHING')).toBe(true);
      expect(hasNoMatchingPattern('Don\'T Match')).toBe(true);
      expect(hasNoMatchingPattern('No Match')).toBe(true);
    });

    it('should handle whitespace variations', () => {
      expect(hasNoMatchingPattern('no match')).toBe(true);
      expect(hasNoMatchingPattern('no  match')).toBe(true);
      expect(hasNoMatchingPattern('don\'tmatch')).toBe(true);
      expect(hasNoMatchingPattern('don\'t match')).toBe(true);
    });
  });
});