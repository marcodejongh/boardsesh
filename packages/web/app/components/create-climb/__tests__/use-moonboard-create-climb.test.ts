import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/app/lib/moonboard-config', () => ({
  MOONBOARD_HOLD_STATES: {
    start: { color: '#00FF00', displayColor: '#00FF00' },
    hand: { color: '#00FFFF', displayColor: '#00FFFF' },
    finish: { color: '#FF00FF', displayColor: '#FF00FF' },
  },
}));

import { useMoonBoardCreateClimb } from '../use-moonboard-create-climb';

describe('useMoonBoardCreateClimb', () => {
  describe('initial state', () => {
    it('has empty holdsMap and zero counts', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

      expect(result.current.litUpHoldsMap).toEqual({});
      expect(result.current.totalHolds).toBe(0);
      expect(result.current.startingCount).toBe(0);
      expect(result.current.finishCount).toBe(0);
      expect(result.current.handCount).toBe(0);
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('hold state cycling (no FOOT state)', () => {
    it('first click cycles to STARTING', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

      act(() => {
        result.current.handleHoldClick(100);
      });

      expect(result.current.litUpHoldsMap[100]).toEqual({
        state: 'STARTING',
        color: '#00FF00',
        displayColor: '#00FF00',
      });
    });

    it('second click cycles from STARTING to HAND', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

      act(() => {
        result.current.handleHoldClick(100);
      });
      act(() => {
        result.current.handleHoldClick(100);
      });

      expect(result.current.litUpHoldsMap[100].state).toBe('HAND');
      expect(result.current.litUpHoldsMap[100].color).toBe('#00FFFF');
    });

    it('third click cycles from HAND to FINISH', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

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

    it('fourth click cycles from FINISH to OFF (removed)', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

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

  describe('max starting holds', () => {
    it('skips STARTING when 2 starting holds already exist', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

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
  });

  describe('max finish holds', () => {
    it('skips FINISH when 2 finish holds already exist', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

      // Add 2 finish holds (cycle each through STARTING -> HAND -> FINISH)
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleHoldClick(100);
        });
      }
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleHoldClick(200);
        });
      }

      expect(result.current.finishCount).toBe(2);

      // Now add a hold and cycle to where FINISH would be
      act(() => {
        result.current.handleHoldClick(300); // STARTING
      });
      act(() => {
        result.current.handleHoldClick(300); // HAND
      });
      act(() => {
        result.current.handleHoldClick(300); // Should skip FINISH -> OFF
      });

      expect(result.current.litUpHoldsMap[300]).toBeUndefined();
    });
  });

  describe('isValid', () => {
    it('requires at least 1 start and 1 finish hold', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

      expect(result.current.isValid).toBe(false);

      // Add starting hold
      act(() => {
        result.current.handleHoldClick(100);
      });
      expect(result.current.isValid).toBe(false);

      // Add hand hold
      act(() => {
        result.current.handleHoldClick(200);
      });
      act(() => {
        result.current.handleHoldClick(200); // HAND
      });
      expect(result.current.isValid).toBe(false);

      // Add finish hold
      act(() => {
        result.current.handleHoldClick(300);
      });
      act(() => {
        result.current.handleHoldClick(300); // HAND
      });
      act(() => {
        result.current.handleHoldClick(300); // FINISH
      });

      expect(result.current.isValid).toBe(true);
    });
  });

  describe('resetHolds', () => {
    it('clears all holds', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

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
      expect(result.current.handCount).toBe(0);
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('handCount', () => {
    it('tracks hand holds correctly', () => {
      const { result } = renderHook(() => useMoonBoardCreateClimb());

      // Add hold and cycle to HAND
      act(() => {
        result.current.handleHoldClick(100); // STARTING
      });
      act(() => {
        result.current.handleHoldClick(100); // HAND
      });

      expect(result.current.handCount).toBe(1);

      // Add another HAND hold
      act(() => {
        result.current.handleHoldClick(200); // STARTING
      });
      act(() => {
        result.current.handleHoldClick(200); // HAND
      });

      expect(result.current.handCount).toBe(2);
    });
  });

  describe('initial holds map', () => {
    it('accepts initial holds map', () => {
      const initialHoldsMap = {
        100: { state: 'STARTING' as const, color: '#00FF00', displayColor: '#00FF00' },
        200: { state: 'FINISH' as const, color: '#FF00FF', displayColor: '#FF00FF' },
      };

      const { result } = renderHook(() =>
        useMoonBoardCreateClimb({ initialHoldsMap }),
      );

      expect(result.current.litUpHoldsMap).toEqual(initialHoldsMap);
      expect(result.current.totalHolds).toBe(2);
      expect(result.current.startingCount).toBe(1);
      expect(result.current.finishCount).toBe(1);
      expect(result.current.isValid).toBe(true);
    });
  });
});
