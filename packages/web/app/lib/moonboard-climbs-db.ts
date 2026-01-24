import { coordinateToHoldId, MOONBOARD_HOLD_STATES, type MoonBoardCoordinate } from './moonboard-config';
import type { MoonBoardLitUpHoldsMap } from '../components/moonboard-renderer/types';

/**
 * Convert OCR hold coordinates to the lit up holds map format for the renderer
 * This is a shared utility used by both the create form and bulk import
 */
export function convertOcrHoldsToMap(holds: {
  start: string[];
  hand: string[];
  finish: string[];
}): MoonBoardLitUpHoldsMap {
  const map: MoonBoardLitUpHoldsMap = {};

  holds.start.forEach((coord) => {
    const holdId = coordinateToHoldId(coord as MoonBoardCoordinate);
    map[holdId] = { type: 'start', color: MOONBOARD_HOLD_STATES.start.color };
  });

  holds.hand.forEach((coord) => {
    const holdId = coordinateToHoldId(coord as MoonBoardCoordinate);
    map[holdId] = { type: 'hand', color: MOONBOARD_HOLD_STATES.hand.color };
  });

  holds.finish.forEach((coord) => {
    const holdId = coordinateToHoldId(coord as MoonBoardCoordinate);
    map[holdId] = { type: 'finish', color: MOONBOARD_HOLD_STATES.finish.color };
  });

  return map;
}
