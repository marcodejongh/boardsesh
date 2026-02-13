import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../board-renderer/types', () => ({
  HOLD_STATE_MAP: {
    kilter: {
      42: { state: 'STARTING', color: '#00FF00', displayColor: '#00FF00' },
      43: { state: 'HAND', color: '#00FFFF', displayColor: '#00FFFF' },
      44: { state: 'FINISH', color: '#FF00FF', displayColor: '#FF00FF' },
      45: { state: 'FOOT', color: '#FFA500', displayColor: '#FFA500' },
    },
    tension: {
      1: { state: 'STARTING', color: '#00FF00', displayColor: '#00FF00' },
      2: { state: 'HAND', color: '#00FFFF', displayColor: '#00FFFF' },
      3: { state: 'FINISH', color: '#FF00FF', displayColor: '#FF00FF' },
      4: { state: 'FOOT', color: '#FFA500', displayColor: '#FFA500' },
    },
    moonboard: {
      1: { state: 'STARTING', color: '#00FF00', displayColor: '#00FF00' },
      2: { state: 'HAND', color: '#00FFFF', displayColor: '#00FFFF' },
      3: { state: 'FINISH', color: '#FF00FF', displayColor: '#FF00FF' },
    },
  },
}));

import { useCreateClimb } from '../use-create-climb';

describe('useCreateClimb', () => {
  describe('initial state', () => {
    it('has empty holdsMap', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      expect(result.current.litUpHoldsMap).toEqual({});
      expect(result.current.totalHolds).toBe(0);
      expect(result.current.startingCount).toBe(0);
      expect(result.current.finishCount).toBe(0);
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('hold state cycling', () => {
    it('first click cycles hold to STARTING', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      act(() => {
        result.current.handleHoldClick(100);
      });

      expect(result.current.litUpHoldsMap[100]).toEqual({
        state: 'STARTING',
        color: '#00FF00',
        displayColor: '#00FF00',
      });
    });

    it('second click cycles hold from STARTING to HAND', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });

      expect(result.current.litUpHoldsMap[100].state).toBe('HAND');
      expect(result.current.litUpHoldsMap[100].color).toBe('#00FFFF');
    });

    it('third click cycles hold from HAND to FOOT', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });

      expect(result.current.litUpHoldsMap[100].state).toBe('FOOT');
      expect(result.current.litUpHoldsMap[100].color).toBe('#FFA500');
    });

    it('fourth click cycles hold from FOOT to FINISH', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });

      expect(result.current.litUpHoldsMap[100].state).toBe('FINISH');
      expect(result.current.litUpHoldsMap[100].color).toBe('#FF00FF');
    });

    it('fifth click cycles hold from FINISH to OFF (removed)', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });

      expect(result.current.litUpHoldsMap[100]).toBeUndefined();
      expect(result.current.totalHolds).toBe(0);
    });
  });

  describe('max state limits', () => {
    it('skips STARTING when 2 starting holds already exist', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      // Add 2 starting holds
      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(200);
      });

      expect(result.current.startingCount).toBe(2);

      // Third hold should skip STARTING and go to HAND
      act(() => {
        result.current.handleHoldClick(300);
      });

      expect(result.current.litUpHoldsMap[300].state).toBe('HAND');
    });

    it('skips FINISH when 2 finish holds already exist', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      // Add 2 finish holds (cycle each through STARTING -> HAND -> FOOT -> FINISH)
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.handleHoldClick(100);
        });
      }
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.handleHoldClick(200);
        });
      }

      expect(result.current.finishCount).toBe(2);

      // Now add a hold and cycle to where FINISH would be
      // It should skip FINISH and go to OFF
      act(() => {
        result.current.handleHoldClick(300); // STARTING
      });
      act(() => {
        result.current.handleHoldClick(300); // HAND
      });
      act(() => {
        result.current.handleHoldClick(300); // FOOT
      });
      act(() => {
        result.current.handleHoldClick(300); // Should skip FINISH -> OFF
      });

      expect(result.current.litUpHoldsMap[300]).toBeUndefined();
    });
  });

  describe('generateFramesString', () => {
    it('produces correct format for kilter holds', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      // Add a STARTING hold (holdId=100, stateCode=42)
      act(() => {
        result.current.handleHoldClick(100);
      });

      const frames = result.current.generateFramesString();
      expect(frames).toBe('p100r42');
    });

    it('produces correct format for multiple holds', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      // Add a STARTING hold
      act(() => {
        result.current.handleHoldClick(100);
      });
      // Add another STARTING hold
      act(() => {
        result.current.handleHoldClick(200);
      });
      // Cycle second hold to HAND
      act(() => {
        result.current.handleHoldClick(200);
      });

      const frames = result.current.generateFramesString();
      expect(frames).toContain('p100r42');
      expect(frames).toContain('p200r43');
    });

    it('returns empty string when no holds', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      const frames = result.current.generateFramesString();
      expect(frames).toBe('');
    });
  });

  describe('resetHolds', () => {
    it('clears all holds', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(200);
      });
      expect(result.current.totalHolds).toBe(2);

      act(() => {
        result.current.resetHolds();
      });

      expect(result.current.litUpHoldsMap).toEqual({});
      expect(result.current.totalHolds).toBe(0);
      expect(result.current.startingCount).toBe(0);
      expect(result.current.finishCount).toBe(0);
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('derived counts', () => {
    it('totalHolds counts correctly', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(200);
      });
      act(() => {
        result.current.handleHoldClick(300);
      });

      expect(result.current.totalHolds).toBe(3);
    });

    it('startingCount is correct', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      act(() => {
        result.current.handleHoldClick(100); // STARTING
      });
      act(() => {
        result.current.handleHoldClick(200); // STARTING
      });

      expect(result.current.startingCount).toBe(2);
    });

    it('finishCount is correct', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      // Cycle hold to FINISH
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.handleHoldClick(100);
        });
      }

      expect(result.current.finishCount).toBe(1);
    });

    it('isValid is true when holds > 0', () => {
      const { result } = renderHook(() => useCreateClimb('kilter'));

      expect(result.current.isValid).toBe(false);

      act(() => {
        result.current.handleHoldClick(100);
      });

      expect(result.current.isValid).toBe(true);
    });
  });

  describe('initial holds map', () => {
    it('works with initial holds map', () => {
      const initialHoldsMap = {
        100: { state: 'STARTING' as const, color: '#00FF00', displayColor: '#00FF00' },
        200: { state: 'HAND' as const, color: '#00FFFF', displayColor: '#00FFFF' },
      };

      const { result } = renderHook(() =>
        useCreateClimb('kilter', { initialHoldsMap }),
      );

      expect(result.current.litUpHoldsMap).toEqual(initialHoldsMap);
      expect(result.current.totalHolds).toBe(2);
      expect(result.current.startingCount).toBe(1);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('tension board', () => {
    it('uses tension state codes', () => {
      const { result } = renderHook(() => useCreateClimb('tension'));

      act(() => {
        result.current.handleHoldClick(100); // STARTING
      });

      const frames = result.current.generateFramesString();
      expect(frames).toBe('p100r1');
    });
  });
});
