import { describe, it, expect } from 'vitest';
import path from 'path';
import { parseScreenshot } from '../parser.js';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('MoonBoard OCR Parser', () => {
  describe('ENCHANTED (IMG_3171)', () => {
    it('should extract correct climb metadata', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'ENCHANTED.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('ENCHANTED');
      expect(result.climb!.setter).toBe('flo wientjes');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('8A/V11');
      expect(result.climb!.setterGrade).toBe('8A/V11');
    });

    it('should extract correct hold positions', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'ENCHANTED.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();

      // Expected holds for ENCHANTED
      // Start: D6, I2 (green circles)
      // Hands: A7, J7, D11, G16 (blue circles)
      // Finish: A18 (red circle)
      expect(result.climb!.holds.start.sort()).toEqual(['D6', 'I2'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['A7', 'D11', 'G16', 'J7'].sort());
      expect(result.climb!.holds.finish).toEqual(['A18']);
    });
  });

  describe('BORKED (IMG_3170)', () => {
    it('should extract correct climb metadata', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'BORKED.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('BORKED');
      expect(result.climb!.setter).toBe('kianc');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('7A/V6');
      expect(result.climb!.setterGrade).toBe('7A+/V7');
    });

    it('should extract correct hold positions', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'BORKED.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();

      // Expected holds for BORKED
      // Start: H5, G4 (green circles)
      // Hands: E9, D10, A12, E14, D16 (blue circles)
      // Finish: F18 (red circle)
      expect(result.climb!.holds.start.sort()).toEqual(['G4', 'H5'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['A12', 'D10', 'D16', 'E14', 'E9'].sort());
      expect(result.climb!.holds.finish).toEqual(['F18']);
    });
  });
});
