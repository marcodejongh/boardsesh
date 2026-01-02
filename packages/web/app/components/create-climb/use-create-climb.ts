'use client';

import { useState, useCallback, useMemo } from 'react';
import { LitUpHoldsMap, HoldState, HOLD_STATE_MAP, HoldCode } from '../board-renderer/types';
import { BoardName } from '@/app/lib/types';

// Hold state cycle order: Starting -> Hand -> Foot -> Finish -> OFF
const STATE_CYCLE: HoldState[] = ['STARTING', 'HAND', 'FOOT', 'FINISH', 'OFF'];

// Map from state name to the primary hold code for each board
const STATE_TO_CODE: Record<BoardName, Partial<Record<HoldState, HoldCode>>> = {
  kilter: {
    STARTING: 42,
    HAND: 43,
    FINISH: 44,
    FOOT: 45,
  },
  tension: {
    STARTING: 1,
    HAND: 2,
    FINISH: 3,
    FOOT: 4,
  },
  // MoonBoard uses different hook (use-moonboard-create-climb), but include for type safety
  moonboard: {
    STARTING: 1,
    HAND: 2,
    FINISH: 3,
    // No FOOT holds on MoonBoard
  },
};

interface UseCreateClimbOptions {
  initialHoldsMap?: LitUpHoldsMap;
}

export function useCreateClimb(boardName: BoardName, options?: UseCreateClimbOptions) {
  const [litUpHoldsMap, setLitUpHoldsMap] = useState<LitUpHoldsMap>(options?.initialHoldsMap ?? {});

  // Derived state: count holds by type
  const startingCount = useMemo(
    () => Object.values(litUpHoldsMap).filter((h) => h.state === 'STARTING').length,
    [litUpHoldsMap],
  );

  const finishCount = useMemo(
    () => Object.values(litUpHoldsMap).filter((h) => h.state === 'FINISH').length,
    [litUpHoldsMap],
  );

  const totalHolds = useMemo(
    () => Object.values(litUpHoldsMap).filter((h) => h.state !== 'OFF').length,
    [litUpHoldsMap],
  );

  const isValid = totalHolds > 0;

  const handleHoldClick = useCallback(
    (holdId: number) => {
      setLitUpHoldsMap((prev) => {
        const currentHold = prev[holdId];
        const currentState: HoldState = currentHold?.state || 'OFF';

        // Find current position in cycle
        const currentIndex = STATE_CYCLE.indexOf(currentState);

        // Count current states (excluding this hold if it has that state)
        const currentStartingCount = Object.entries(prev).filter(
          ([id, h]) => h.state === 'STARTING' && Number(id) !== holdId,
        ).length;
        const currentFinishCount = Object.entries(prev).filter(
          ([id, h]) => h.state === 'FINISH' && Number(id) !== holdId,
        ).length;

        // Find next valid state in cycle
        let nextState: HoldState = 'OFF';
        for (let i = 1; i <= STATE_CYCLE.length; i++) {
          const candidateIndex = (currentIndex + i) % STATE_CYCLE.length;
          const candidateState = STATE_CYCLE[candidateIndex];

          // Skip STARTING if already at max (2)
          if (candidateState === 'STARTING' && currentStartingCount >= 2) {
            continue;
          }
          // Skip FINISH if already at max (2)
          if (candidateState === 'FINISH' && currentFinishCount >= 2) {
            continue;
          }

          nextState = candidateState;
          break;
        }

        // If next state is OFF, remove the hold from the map
        if (nextState === 'OFF') {
          const { [holdId]: _removed, ...rest } = prev;
          void _removed; // Explicitly mark as intentionally unused
          return rest;
        }

        // Get the color info for this state
        const stateCode = STATE_TO_CODE[boardName][nextState];
        if (stateCode === undefined) {
          return prev;
        }

        const holdInfo = HOLD_STATE_MAP[boardName][stateCode];
        if (!holdInfo) {
          return prev;
        }

        return {
          ...prev,
          [holdId]: {
            state: nextState,
            color: holdInfo.color,
            displayColor: holdInfo.displayColor || holdInfo.color,
          },
        };
      });
    },
    [boardName],
  );

  // Generate frames string in Aurora format: p{holdId}r{stateCode}p{holdId}r{stateCode}...
  const generateFramesString = useCallback(() => {
    const stateToCode = STATE_TO_CODE[boardName];
    return Object.entries(litUpHoldsMap)
      .filter(([, hold]) => hold.state !== 'OFF')
      .map(([holdId, hold]) => {
        const code = stateToCode[hold.state];
        return `p${holdId}r${code}`;
      })
      .join('');
  }, [litUpHoldsMap, boardName]);

  // Reset all holds
  const resetHolds = useCallback(() => {
    setLitUpHoldsMap({});
  }, []);

  return {
    litUpHoldsMap,
    handleHoldClick,
    generateFramesString,
    startingCount,
    finishCount,
    totalHolds,
    isValid,
    resetHolds,
  };
}
