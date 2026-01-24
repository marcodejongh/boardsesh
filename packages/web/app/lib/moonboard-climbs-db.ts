import { coordinateToHoldId, MOONBOARD_HOLD_STATES, type MoonBoardCoordinate } from './moonboard-config';
import type { LitUpHoldsMap } from '../components/board-renderer/types';

/**
 * Convert OCR hold coordinates to the lit up holds map format for the renderer
 * This is a shared utility used by both the create form and bulk import
 */
export function convertOcrHoldsToMap(holds: {
  start: string[];
  hand: string[];
  finish: string[];
}): LitUpHoldsMap {
  const map: LitUpHoldsMap = {};

  holds.start.forEach((coord) => {
    const holdId = coordinateToHoldId(coord as MoonBoardCoordinate);
    map[holdId] = {
      state: 'STARTING',
      color: MOONBOARD_HOLD_STATES.start.color,
      displayColor: MOONBOARD_HOLD_STATES.start.displayColor,
    };
  });

  holds.hand.forEach((coord) => {
    const holdId = coordinateToHoldId(coord as MoonBoardCoordinate);
    map[holdId] = {
      state: 'HAND',
      color: MOONBOARD_HOLD_STATES.hand.color,
      displayColor: MOONBOARD_HOLD_STATES.hand.displayColor,
    };
  });

  holds.finish.forEach((coord) => {
    const holdId = coordinateToHoldId(coord as MoonBoardCoordinate);
    map[holdId] = {
      state: 'FINISH',
      color: MOONBOARD_HOLD_STATES.finish.color,
      displayColor: MOONBOARD_HOLD_STATES.finish.displayColor,
    };
  });

  return map;
}
