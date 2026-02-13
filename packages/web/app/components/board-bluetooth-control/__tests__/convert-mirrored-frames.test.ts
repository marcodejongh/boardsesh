import { describe, it, expect } from 'vitest';
import { convertToMirroredFramesString } from '../use-board-bluetooth';

// Minimal HoldRenderData shape for tests
type TestHoldRenderData = {
  id: number;
  mirroredHoldId: number | null;
  cx: number;
  cy: number;
  r: number;
};

function createHold(id: number, mirroredHoldId: number | null): TestHoldRenderData {
  return { id, mirroredHoldId, cx: 0, cy: 0, r: 1 };
}

describe('convertToMirroredFramesString', () => {
  it('converts a simple single-hold frame string', () => {
    const holdsData = [createHold(10, 20)];
    const result = convertToMirroredFramesString('p10r42', holdsData);

    expect(result).toBe('p20r42');
  });

  it('handles multiple holds', () => {
    const holdsData = [
      createHold(10, 20),
      createHold(30, 40),
      createHold(50, 60),
    ];
    const result = convertToMirroredFramesString('p10r42p30r43p50r44', holdsData);

    expect(result).toBe('p20r42p40r43p60r44');
  });

  it('throws when mirroredHoldId is missing for a hold', () => {
    const holdsData = [createHold(10, null)];

    expect(() => {
      convertToMirroredFramesString('p10r42', holdsData);
    }).toThrow('Mirrored hold ID is not defined for hold ID 10.');
  });

  it('throws when hold ID is not found in holdsData', () => {
    const holdsData = [createHold(99, 100)];

    expect(() => {
      convertToMirroredFramesString('p10r42', holdsData);
    }).toThrow('Mirrored hold ID is not defined for hold ID 10.');
  });

  it('returns empty string for empty frames', () => {
    const holdsData = [createHold(10, 20)];
    const result = convertToMirroredFramesString('', holdsData);

    expect(result).toBe('');
  });

  it('handles a single hold frame correctly', () => {
    const holdsData = [createHold(5, 15)];
    const result = convertToMirroredFramesString('p5r1', holdsData);

    expect(result).toBe('p15r1');
  });

  it('preserves state codes during mirroring', () => {
    const holdsData = [
      createHold(1, 100),
      createHold(2, 200),
    ];
    const result = convertToMirroredFramesString('p1r42p2r45', holdsData);

    expect(result).toBe('p100r42p200r45');
  });
});
