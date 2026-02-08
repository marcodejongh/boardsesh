import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  coordinateToHoldId,
  movesToFrames,
  moveToHoldState,
  uuidv5,
  MOONBOARD_UUID_NAMESPACE,
  HOLD_STATE_CODES,
  type MoonBoardMove,
} from './moonboard-helpers.js';

describe('coordinateToHoldId', () => {
  it('converts A1 to hold ID 1 (first hold, bottom-left)', () => {
    assert.equal(coordinateToHoldId('A1'), 1);
  });

  it('converts K1 to hold ID 11 (last column, row 1)', () => {
    assert.equal(coordinateToHoldId('K1'), 11);
  });

  it('converts A2 to hold ID 12 (first column, row 2)', () => {
    assert.equal(coordinateToHoldId('A2'), 12);
  });

  it('converts K18 to hold ID 198 (last hold on standard 11x18 board)', () => {
    // (18 - 1) * 11 + 10 + 1 = 187 + 11 = 198
    assert.equal(coordinateToHoldId('K18'), 198);
  });

  it('handles lowercase column letters', () => {
    assert.equal(coordinateToHoldId('a1'), 1);
    assert.equal(coordinateToHoldId('k18'), 198);
  });

  it('converts common MoonBoard coordinates correctly', () => {
    // E5 = (5 - 1) * 11 + 4 + 1 = 44 + 5 = 49
    assert.equal(coordinateToHoldId('E5'), 49);
    // J3 = (3 - 1) * 11 + 9 + 1 = 22 + 10 = 32
    assert.equal(coordinateToHoldId('J3'), 32);
    // F10 = (10 - 1) * 11 + 5 + 1 = 99 + 6 = 105
    assert.equal(coordinateToHoldId('F10'), 105);
  });

  it('throws for invalid column letter', () => {
    assert.throws(() => coordinateToHoldId('Z1'), /Invalid column/);
    assert.throws(() => coordinateToHoldId('L1'), /Invalid column/);
  });
});

describe('movesToFrames', () => {
  it('converts a single start move', () => {
    const moves: MoonBoardMove[] = [
      { problemId: 1, description: 'A1', isStart: true, isEnd: false },
    ];
    assert.equal(movesToFrames(moves), `p1r${HOLD_STATE_CODES.start}`);
  });

  it('converts a single finish move', () => {
    const moves: MoonBoardMove[] = [
      { problemId: 1, description: 'K18', isStart: false, isEnd: true },
    ];
    assert.equal(movesToFrames(moves), `p198r${HOLD_STATE_CODES.finish}`);
  });

  it('converts a single hand move', () => {
    const moves: MoonBoardMove[] = [
      { problemId: 1, description: 'E5', isStart: false, isEnd: false },
    ];
    assert.equal(movesToFrames(moves), `p49r${HOLD_STATE_CODES.hand}`);
  });

  it('converts a full problem with start, hand, and finish moves', () => {
    const moves: MoonBoardMove[] = [
      { problemId: 1, description: 'A1', isStart: true, isEnd: false },
      { problemId: 1, description: 'E5', isStart: false, isEnd: false },
      { problemId: 1, description: 'K18', isStart: false, isEnd: true },
    ];
    const result = movesToFrames(moves);
    assert.equal(result, 'p1r42p49r43p198r44');
  });

  it('returns empty string for empty moves array', () => {
    assert.equal(movesToFrames([]), '');
  });
});

describe('moveToHoldState', () => {
  it('returns STARTING for start moves', () => {
    assert.equal(moveToHoldState({ problemId: 1, description: 'A1', isStart: true, isEnd: false }), 'STARTING');
  });

  it('returns FINISH for end moves', () => {
    assert.equal(moveToHoldState({ problemId: 1, description: 'K18', isStart: false, isEnd: true }), 'FINISH');
  });

  it('returns HAND for regular moves', () => {
    assert.equal(moveToHoldState({ problemId: 1, description: 'E5', isStart: false, isEnd: false }), 'HAND');
  });
});

describe('uuidv5', () => {
  it('produces a valid UUID format', () => {
    const uuid = uuidv5('test', MOONBOARD_UUID_NAMESPACE);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    assert.match(uuid, uuidRegex);
  });

  it('sets version 5 in the UUID', () => {
    const uuid = uuidv5('test', MOONBOARD_UUID_NAMESPACE);
    // Version is the 13th character (index 14 after dashes)
    assert.equal(uuid.charAt(14), '5');
  });

  it('sets the correct variant bits', () => {
    const uuid = uuidv5('test', MOONBOARD_UUID_NAMESPACE);
    // Variant is the 17th hex char (index 19 after dashes), must be 8, 9, a, or b
    const variantChar = uuid.charAt(19);
    assert.ok(['8', '9', 'a', 'b'].includes(variantChar), `Expected variant char to be 8/9/a/b, got: ${variantChar}`);
  });

  it('produces deterministic output (same input = same UUID)', () => {
    const uuid1 = uuidv5('moonboard:12345', MOONBOARD_UUID_NAMESPACE);
    const uuid2 = uuidv5('moonboard:12345', MOONBOARD_UUID_NAMESPACE);
    assert.equal(uuid1, uuid2);
  });

  it('produces different UUIDs for different inputs', () => {
    const uuid1 = uuidv5('moonboard:12345', MOONBOARD_UUID_NAMESPACE);
    const uuid2 = uuidv5('moonboard:67890', MOONBOARD_UUID_NAMESPACE);
    assert.notEqual(uuid1, uuid2);
  });

  it('matches RFC 4122 reference value for DNS namespace', () => {
    // Well-known test vector: uuid5("python.org", DNS namespace) = "886313e1-3b8a-5372-9b90-0c9aee199e5d"
    const uuid = uuidv5('python.org', MOONBOARD_UUID_NAMESPACE);
    assert.equal(uuid, '886313e1-3b8a-5372-9b90-0c9aee199e5d');
  });
});
