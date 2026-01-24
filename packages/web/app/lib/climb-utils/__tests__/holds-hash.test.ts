import { describe, it, expect } from 'vitest';
import { generateHoldsHash, framesAreEquivalent } from '../holds-hash';

describe('generateHoldsHash', () => {
  it('should return empty string for empty frames', () => {
    expect(generateHoldsHash('')).toBe('');
    expect(generateHoldsHash('   ')).toBe('');
  });

  it('should return empty string for frames with no valid holds', () => {
    expect(generateHoldsHash('invalid')).toBe('');
    expect(generateHoldsHash('abc123')).toBe('');
  });

  it('should generate hash for single hold', () => {
    const hash = generateHoldsHash('p1r42');
    expect(hash).toBe('1:42');
  });

  it('should generate hash for multiple holds', () => {
    const hash = generateHoldsHash('p1r42p45r43p198r44');
    expect(hash).toBe('1:42|45:43|198:44');
  });

  it('should produce same hash regardless of hold order', () => {
    const hash1 = generateHoldsHash('p1r42p45r43p198r44');
    const hash2 = generateHoldsHash('p198r44p1r42p45r43');
    const hash3 = generateHoldsHash('p45r43p198r44p1r42');

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('should handle multi-frame climbs (comma-separated)', () => {
    const hash = generateHoldsHash('p1r42p2r43,p3r44p4r42');
    // All holds from all frames should be included and sorted
    expect(hash).toBe('1:42|2:43|3:44|4:42');
  });

  it('should produce same hash for equivalent multi-frame climbs with different frame organization', () => {
    // Same holds, organized differently across frames
    const hash1 = generateHoldsHash('p1r42p2r43,p3r44');
    const hash2 = generateHoldsHash('p1r42,p2r43p3r44');
    const hash3 = generateHoldsHash('p3r44p2r43p1r42');

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('should differentiate climbs with same holds but different states', () => {
    // Same hold IDs but different role codes (states)
    const hash1 = generateHoldsHash('p1r42p2r43'); // hold 1 is start (42), hold 2 is hand (43)
    const hash2 = generateHoldsHash('p1r43p2r42'); // hold 1 is hand (43), hold 2 is start (42)

    expect(hash1).not.toBe(hash2);
  });

  it('should handle holds with same ID but different states (sorted by roleCode)', () => {
    // Edge case: same holdId appearing with different states
    const hash = generateHoldsHash('p1r44p1r42');
    // Should be sorted by holdId first, then roleCode
    expect(hash).toBe('1:42|1:44');
  });

  it('should handle Kilter/Tension style frames', () => {
    // Kilter uses codes like 42, 43, 44, 45 for STARTING, HAND, FINISH, FOOT
    const hash = generateHoldsHash('p100r42p200r43p300r44p400r45');
    expect(hash).toBe('100:42|200:43|300:44|400:45');
  });

  it('should handle MoonBoard style frames', () => {
    // MoonBoard also uses 42, 43, 44 for start, hand, finish
    const hash = generateHoldsHash('p1r42p45r43p198r44');
    expect(hash).toBe('1:42|45:43|198:44');
  });

  it('should ignore empty frames in comma-separated string', () => {
    const hash1 = generateHoldsHash('p1r42,,p2r43');
    const hash2 = generateHoldsHash('p1r42,p2r43');
    expect(hash1).toBe(hash2);
  });
});

describe('framesAreEquivalent', () => {
  it('should return true for identical frames', () => {
    expect(framesAreEquivalent('p1r42p2r43', 'p1r42p2r43')).toBe(true);
  });

  it('should return true for frames with same holds in different order', () => {
    expect(framesAreEquivalent('p1r42p2r43', 'p2r43p1r42')).toBe(true);
  });

  it('should return true for equivalent multi-frame climbs', () => {
    expect(framesAreEquivalent('p1r42,p2r43', 'p2r43p1r42')).toBe(true);
  });

  it('should return false for frames with different holds', () => {
    expect(framesAreEquivalent('p1r42p2r43', 'p1r42p3r43')).toBe(false);
  });

  it('should return false for frames with same holds but different states', () => {
    expect(framesAreEquivalent('p1r42p2r43', 'p1r43p2r42')).toBe(false);
  });

  it('should return true for both empty frames', () => {
    expect(framesAreEquivalent('', '')).toBe(true);
  });
});
