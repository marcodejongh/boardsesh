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

  describe('TEMPEST_IN_A_TEAPOT', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'TEMPEST_IN_A_TEAPOT.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toContain('TEMPEST IN A TEAPOT');
      expect(result.climb!.setter).toBe('RTAGG');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6C/V5');
      expect(result.climb!.holds.start.sort()).toEqual(['A4', 'F6'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['D7', 'G11', 'G15', 'H9', 'J13', 'K16', 'K5'].sort());
      expect(result.climb!.holds.finish).toEqual(['K18']);
    });
  });

  describe('LIVIN_WAY_OUT_WEST', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'LIVIN_WAY_OUT_WEST.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toContain('LIVIN');
      expect(result.climb!.name).toContain('WAY OUT WEST');
      expect(result.climb!.setter).toBe('Sam Prior');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6C/V5');
      expect(result.climb!.holds.start.sort()).toEqual(['A4', 'C4'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['A11', 'A8', 'B2', 'B6', 'C12', 'F12', 'F15', 'F6'].sort());
      expect(result.climb!.holds.finish).toEqual(['C18']);
    });
  });

  describe('FOUR_LETTER_WORDS', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'FOUR_LETTER_WORDS.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('FOUR LETTER WORDS');
      expect(result.climb!.setter).toBe('Brandon Hyatt');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6C/V5');
      expect(result.climb!.holds.start).toEqual(['G5']);
      expect(result.climb!.holds.hand.sort()).toEqual(['I16', 'I9', 'K11', 'K13', 'K15', 'K3'].sort());
      expect(result.climb!.holds.finish.sort()).toEqual(['F18', 'I18'].sort());
    });
  });

  describe('PREDICON', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'PREDICON.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toContain('PREDICON');
      expect(result.climb!.setter).toBe('Mike C');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6C/V5');
      expect(result.climb!.holds.start.sort()).toEqual(['E6', 'F5'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['E9', 'H16', 'I10', 'J15', 'K5'].sort());
      expect(result.climb!.holds.finish).toEqual(['F18']);
    });
  });

  describe('CALLIOPE', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'CALLIOPE.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toBe('CALLIOPE');
      expect(result.climb!.setter).toBe('JPace');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6C/V5');
      expect(result.climb!.holds.start.sort()).toEqual(['F6', 'I6'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['B10', 'D16', 'E9', 'F13', 'G15', 'I10', 'K5'].sort());
      expect(result.climb!.holds.finish).toEqual(['C18']);
    });
  });

  describe('SOFT_AND_EASY', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'SOFT_AND_EASY.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toContain('SOFT');
      expect(result.climb!.setter).toBe('joemaln');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('5+/V1');
      expect(result.climb!.holds.start.sort()).toEqual(['D5', 'F6'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['A16', 'B14', 'B4', 'C12', 'D1', 'D14', 'E9', 'G12'].sort());
      expect(result.climb!.holds.finish.sort()).toEqual(['A18', 'C18'].sort());
    });
  });

  describe('WARMUP5B_FELSMEISTER', () => {
    it('should extract correct climb data', async () => {
      const result = await parseScreenshot(path.join(FIXTURES_DIR, 'WARMUP5B_FELSMEISTER.PNG'));

      expect(result.success).toBe(true);
      expect(result.climb).toBeDefined();
      expect(result.climb!.name).toContain('WARMUP');
      expect(result.climb!.setter).toContain('ClimbingZaubi');
      expect(result.climb!.angle).toBe(40);
      expect(result.climb!.userGrade).toBe('6A/V2');
      expect(result.climb!.holds.start.sort()).toEqual(['F6', 'I6'].sort());
      expect(result.climb!.holds.hand.sort()).toEqual(['E1', 'E9', 'F15', 'G12', 'H3', 'I10', 'J13', 'J15', 'K9'].sort());
      expect(result.climb!.holds.finish).toEqual(['I18']);
    });
  });
});
