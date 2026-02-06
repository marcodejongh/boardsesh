import { describe, it, expect } from 'vitest';
import {
  getVGradeColor,
  getFontGradeColor,
  getGradeColor,
  getGradeColorWithOpacity,
  isLightColor,
  getGradeTextColor,
  V_GRADE_COLORS,
  FONT_GRADE_COLORS,
} from '../grade-colors';

describe('Grade Colors', () => {
  describe('getVGradeColor', () => {
    it('returns correct color for known V-grades', () => {
      expect(getVGradeColor('V0')).toBe('#FFEB3B');
      expect(getVGradeColor('V5')).toBe('#F44336');
      expect(getVGradeColor('V10')).toBe('#A11B4A');
      expect(getVGradeColor('V17')).toBe('#2A0054');
    });

    it('is case-insensitive', () => {
      expect(getVGradeColor('v3')).toBe(getVGradeColor('V3'));
      expect(getVGradeColor('v10')).toBe(getVGradeColor('V10'));
    });

    it('returns undefined for null', () => {
      expect(getVGradeColor(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(getVGradeColor(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getVGradeColor('')).toBeUndefined();
    });

    it('returns undefined for unknown grades', () => {
      expect(getVGradeColor('V99')).toBeUndefined();
      expect(getVGradeColor('V18')).toBeUndefined();
    });
  });

  describe('getFontGradeColor', () => {
    it('returns correct color for known Font grades', () => {
      expect(getFontGradeColor('6a')).toBe('#FF7043');
      expect(getFontGradeColor('7b+')).toBe('#C62828');
    });

    it('is case-insensitive', () => {
      expect(getFontGradeColor('6A')).toBe(getFontGradeColor('6a'));
      expect(getFontGradeColor('7B+')).toBe(getFontGradeColor('7b+'));
    });

    it('returns undefined for null', () => {
      expect(getFontGradeColor(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(getFontGradeColor(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getFontGradeColor('')).toBeUndefined();
    });
  });

  describe('getGradeColor', () => {
    it('extracts V-grade from combined strings like "6a/V3"', () => {
      expect(getGradeColor('6a/V3')).toBe(V_GRADE_COLORS['V3']);
    });

    it('returns V-grade color for plain V-grade strings', () => {
      expect(getGradeColor('V5')).toBe(V_GRADE_COLORS['V5']);
    });

    it('falls back to Font grade color when no V-grade present', () => {
      expect(getGradeColor('6a')).toBe(FONT_GRADE_COLORS['6a']);
    });

    it('returns undefined for null', () => {
      expect(getGradeColor(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(getGradeColor(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getGradeColor('')).toBeUndefined();
    });

    it('returns undefined for unrecognized difficulty strings', () => {
      expect(getGradeColor('hard')).toBeUndefined();
      expect(getGradeColor('unknown')).toBeUndefined();
    });
  });

  describe('getGradeColorWithOpacity', () => {
    it('converts hex color to rgba with given opacity', () => {
      // #FF0000 -> rgb(255, 0, 0)
      expect(getGradeColorWithOpacity('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('uses default opacity of 0.7 when not specified', () => {
      expect(getGradeColorWithOpacity('#FF0000')).toBe('rgba(255, 0, 0, 0.7)');
    });

    it('returns default gray rgba when color is undefined', () => {
      expect(getGradeColorWithOpacity(undefined)).toBe('rgba(200, 200, 200, 0.7)');
    });

    it('works with custom opacity values', () => {
      expect(getGradeColorWithOpacity('#00FF00', 0.3)).toBe('rgba(0, 255, 0, 0.3)');
    });

    it('correctly parses a real grade color', () => {
      // V0 = #FFEB3B -> rgb(255, 235, 59)
      expect(getGradeColorWithOpacity('#FFEB3B', 0.8)).toBe('rgba(255, 235, 59, 0.8)');
    });
  });

  describe('isLightColor', () => {
    it('returns true for light colors (yellow)', () => {
      expect(isLightColor('#FFEB3B')).toBe(true); // V0 yellow
    });

    it('returns true for white', () => {
      expect(isLightColor('#FFFFFF')).toBe(true);
    });

    it('returns false for dark colors (dark purple)', () => {
      expect(isLightColor('#2A0054')).toBe(false); // V17 dark purple
    });

    it('returns false for black', () => {
      expect(isLightColor('#000000')).toBe(false);
    });

    it('returns false for dark red', () => {
      expect(isLightColor('#B71C1C')).toBe(false); // V9 deep red
    });
  });

  describe('getGradeTextColor', () => {
    it('returns black (#000000) for light backgrounds', () => {
      expect(getGradeTextColor('#FFEB3B')).toBe('#000000'); // V0 yellow
      expect(getGradeTextColor('#FFC107')).toBe('#000000'); // V1 amber
    });

    it('returns white (#FFFFFF) for dark backgrounds', () => {
      expect(getGradeTextColor('#2A0054')).toBe('#FFFFFF'); // V17
      expect(getGradeTextColor('#4A148C')).toBe('#FFFFFF'); // V15
    });

    it('returns "inherit" for undefined input', () => {
      expect(getGradeTextColor(undefined)).toBe('inherit');
    });
  });
});
