import { describe, it, expect } from 'vitest';
import path from 'path';
import { parseScreenshot } from '../parser.js';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('MoonBoard OCR Parser', () => {
  describe('BIRTHDAY_CAKE_TRAIL_MIX', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'BIRTHDAY_CAKE_TRAIL_MIX.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toContain('BIRTHDAY CAKE TRAIL MIX');
      expect(result.climb!.setter).toBe('Dana Rader');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.holds.start.sort()).toEqual(['D5', 'H5'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['A16', 'C12', 'D14', 'E9', 'G12'].sort());
      expect(result.climb!.holds.finish).toEqual(['C18']);
    });
  });

  describe('BLUE_MOON', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'BLUE_MOON.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('BLUE MOON');
      expect(result.climb!.setter).toBe('KoalaClimbing');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6C/V5');
      expect(result.climb!.setterGrade).toBe('6B+/V4');
      expect(result.climb!.holds.start.sort()).toEqual(['E4', 'H5'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['E9', 'F15', 'G12', 'I10'].sort());
      expect(result.climb!.holds.finish).toEqual(['C18']);
    });
  });

  describe('BORKED', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'BORKED.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('BORKED');
      expect(result.climb!.setter).toBe('kianc');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('7A/V6');
      expect(result.climb!.setterGrade).toBe('7A+/V7');
      expect(result.climb!.holds.start.sort()).toEqual(['G4', 'H5'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['A12', 'D10', 'D16', 'E14', 'E9'].sort());
      expect(result.climb!.holds.finish).toEqual(['F18']);
    });
  });

  describe('ENCHANTED', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'ENCHANTED.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('ENCHANTED');
      expect(result.climb!.setter).toBe('flo wientjes');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('8A/V11');
      expect(result.climb!.setterGrade).toBe('8A/V11');
      expect(result.climb!.holds.start.sort()).toEqual(['D6', 'I2'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['A7', 'D11', 'G16', 'J7'].sort());
      expect(result.climb!.holds.finish).toEqual(['A18']);
    });
  });

  describe('EVERYTHING_IS_6B+', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'EVERYTHING_IS_6B+.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toContain('EVERYTHING IS 6B+');
      expect(result.climb!.setter).toBe('dani');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6B+/V4');
      expect(result.climb!.holds.start.sort()).toEqual(['H4', 'K3'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['D16', 'F13', 'G8', 'I14', 'J11', 'K7'].sort());
      expect(result.climb!.holds.finish).toEqual(['F18']);
    });
  });

  describe('FUNNY_THING', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'FUNNY_THING.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toContain('FUNNY THING');
      expect(result.climb!.setter).toBe('Nick Wedge');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.holds.start.sort()).toEqual(['B4', 'B6'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['E9', 'F6', 'G12', 'G15', 'I14', 'K11'].sort());
      expect(result.climb!.holds.finish).toEqual(['I18']);
    });
  });

  describe('HOLY_WATER', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'HOLY_WATER.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('HOLY WATER');
      expect(result.climb!.setter).toBe('Adrian Landreth');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6B+/V4');
      expect(result.climb!.holds.start).toEqual(['D5']);
      expect(result.climb!.holds.hand.sort()).toEqual(['E9', 'F15', 'G12', 'G7', 'I9', 'J15'].sort());
      expect(result.climb!.holds.finish).toEqual(['I18']);
    });
  });

  describe('ICE_CREAM_DAYDREAM', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'ICE_CREAM_DAYDREAM.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('ICE CREAM DAYDREAM');
      expect(result.climb!.setter).toBe('RichieRich7');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('7B/V8');
      expect(result.climb!.setterGrade).toBe('7B+/V8');
      expect(result.climb!.holds.start).toEqual(['J5']);
      expect(result.climb!.holds.hand.sort()).toEqual(['G11', 'I15', 'J14', 'J8'].sort());
      expect(result.climb!.holds.finish).toEqual(['G18']);
    });
  });

  describe('MOON_GIRL', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'MOON_GIRL.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toContain('MOON GIRL');
      expect(result.climb!.setter).toBe('Dana Rader');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.holds.start.sort()).toEqual(['D5', 'E2'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['E9', 'G12', 'G15', 'G7', 'I10', 'I14', 'K5'].sort());
      expect(result.climb!.holds.finish).toEqual(['I18']);
    });
  });

  describe('PEEK_A_BLUE', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'PEEK_A_BLUE.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('PEEK A BLUE');
      expect(result.climb!.setter).toBe('RTAGG');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6B+/V4');
      expect(result.climb!.holds.start.sort()).toEqual(['H4', 'K6'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['D16', 'G12', 'G14', 'I9', 'J11'].sort());
      expect(result.climb!.holds.finish).toEqual(['F18']);
    });
  });
});
