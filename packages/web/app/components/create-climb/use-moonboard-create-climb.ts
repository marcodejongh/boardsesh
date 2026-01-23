'use client';

import { useState, useCallback, useMemo } from 'react';
import { LitUpHoldsMap, HoldState } from '../board-renderer/types';
import { MOONBOARD_HOLD_STATES } from '@/app/lib/moonboard-config';

// MoonBoard hold state cycle: STARTING -> HAND -> FINISH -> OFF
const STATE_CYCLE: (HoldState | 'OFF')[] = ['STARTING', 'HAND', 'FINISH', 'OFF'];

interface UseMoonBoardCreateClimbOptions {
  initialHoldsMap?: LitUpHoldsMap;
}

export function useMoonBoardCreateClimb(options?: UseMoonBoardCreateClimbOptions) {
  const [litUpHoldsMap, setLitUpHoldsMap] = useState<LitUpHoldsMap>(
    options?.initialHoldsMap ?? {},
  );

  // Derived state: count holds by state
  const startingCount = useMemo(
    () => Object.values(litUpHoldsMap).filter((h) => h.state === 'STARTING').length,
    [litUpHoldsMap],
  );

  const finishCount = useMemo(
    () => Object.values(litUpHoldsMap).filter((h) => h.state === 'FINISH').length,
    [litUpHoldsMap],
  );

  const handCount = useMemo(
    () => Object.values(litUpHoldsMap).filter((h) => h.state === 'HAND').length,
    [litUpHoldsMap],
  );

  const totalHolds = useMemo(() => Object.keys(litUpHoldsMap).length, [litUpHoldsMap]);

  // MoonBoard climbs need at least 1 start hold and 1 finish hold
  const isValid = totalHolds > 0 && startingCount >= 1 && finishCount >= 1;

  const handleHoldClick = useCallback((holdId: number) => {
    setLitUpHoldsMap((prev) => {
      const currentHold = prev[holdId];
      const currentState: HoldState | 'OFF' = currentHold?.state || 'OFF';

      // Find current position in cycle
      const currentIndex = STATE_CYCLE.indexOf(currentState);

      // Count current states (excluding this hold if it has that state)
      const currentStartCount = Object.entries(prev).filter(
        ([id, h]) => h.state === 'STARTING' && Number(id) !== holdId,
      ).length;
      const currentFinishCount = Object.entries(prev).filter(
        ([id, h]) => h.state === 'FINISH' && Number(id) !== holdId,
      ).length;

      // Find next valid state in cycle
      let nextState: HoldState | 'OFF' = 'OFF';
      for (let i = 1; i <= STATE_CYCLE.length; i++) {
        const candidateIndex = (currentIndex + i) % STATE_CYCLE.length;
        const candidateState = STATE_CYCLE[candidateIndex];

        // Skip STARTING if already at max (2)
        if (candidateState === 'STARTING' && currentStartCount >= 2) {
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

      // Map state to Moonboard hold states for colors
      const stateToMoonboard = {
        STARTING: MOONBOARD_HOLD_STATES.start,
        HAND: MOONBOARD_HOLD_STATES.hand,
        FINISH: MOONBOARD_HOLD_STATES.finish,
      } as const;

      const stateInfo = stateToMoonboard[nextState as keyof typeof stateToMoonboard];

      return {
        ...prev,
        [holdId]: {
          state: nextState,
          color: stateInfo.color,
          displayColor: stateInfo.displayColor,
        },
      };
    });
  }, []);

  // Reset all holds
  const resetHolds = useCallback(() => {
    setLitUpHoldsMap({});
  }, []);

  return {
    litUpHoldsMap,
    setLitUpHoldsMap,
    handleHoldClick,
    startingCount,
    finishCount,
    handCount,
    totalHolds,
    isValid,
    resetHolds,
  };
}
