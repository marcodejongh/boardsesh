'use client';

import { useState, useCallback, useMemo } from 'react';
import { MoonBoardLitUpHoldsMap, MoonBoardHoldType } from '../moonboard-renderer/types';
import { MOONBOARD_HOLD_STATES } from '@/app/lib/moonboard-config';

// MoonBoard hold state cycle: start -> hand -> finish -> OFF
const STATE_CYCLE: (MoonBoardHoldType | 'off')[] = ['start', 'hand', 'finish', 'off'];

interface UseMoonBoardCreateClimbOptions {
  initialHoldsMap?: MoonBoardLitUpHoldsMap;
}

export function useMoonBoardCreateClimb(options?: UseMoonBoardCreateClimbOptions) {
  const [litUpHoldsMap, setLitUpHoldsMap] = useState<MoonBoardLitUpHoldsMap>(
    options?.initialHoldsMap ?? {},
  );

  // Derived state: count holds by type
  const startingCount = useMemo(
    () => Object.values(litUpHoldsMap).filter((h) => h.type === 'start').length,
    [litUpHoldsMap],
  );

  const finishCount = useMemo(
    () => Object.values(litUpHoldsMap).filter((h) => h.type === 'finish').length,
    [litUpHoldsMap],
  );

  const handCount = useMemo(
    () => Object.values(litUpHoldsMap).filter((h) => h.type === 'hand').length,
    [litUpHoldsMap],
  );

  const totalHolds = useMemo(() => Object.keys(litUpHoldsMap).length, [litUpHoldsMap]);

  // MoonBoard climbs need at least 1 start hold and 1 finish hold
  const isValid = totalHolds > 0 && startingCount >= 1 && finishCount >= 1;

  const handleHoldClick = useCallback((holdId: number) => {
    setLitUpHoldsMap((prev) => {
      const currentHold = prev[holdId];
      const currentType: MoonBoardHoldType | 'off' = currentHold?.type || 'off';

      // Find current position in cycle
      const currentIndex = STATE_CYCLE.indexOf(currentType);

      // Count current states (excluding this hold if it has that state)
      const currentStartCount = Object.entries(prev).filter(
        ([id, h]) => h.type === 'start' && Number(id) !== holdId,
      ).length;
      const currentFinishCount = Object.entries(prev).filter(
        ([id, h]) => h.type === 'finish' && Number(id) !== holdId,
      ).length;

      // Find next valid state in cycle
      let nextType: MoonBoardHoldType | 'off' = 'off';
      for (let i = 1; i <= STATE_CYCLE.length; i++) {
        const candidateIndex = (currentIndex + i) % STATE_CYCLE.length;
        const candidateType = STATE_CYCLE[candidateIndex];

        // Skip start if already at max (2)
        if (candidateType === 'start' && currentStartCount >= 2) {
          continue;
        }
        // Skip finish if already at max (2)
        if (candidateType === 'finish' && currentFinishCount >= 2) {
          continue;
        }

        nextType = candidateType;
        break;
      }

      // If next state is OFF, remove the hold from the map
      if (nextType === 'off') {
        const { [holdId]: _removed, ...rest } = prev;
        void _removed; // Explicitly mark as intentionally unused
        return rest;
      }

      // Get the color info for this state
      const stateInfo = MOONBOARD_HOLD_STATES[nextType];

      return {
        ...prev,
        [holdId]: {
          type: nextType,
          color: stateInfo.color,
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
