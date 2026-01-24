/**
 * Shared hold state definitions for all board types.
 *
 * This file is the single source of truth for:
 * - Hold state code mappings (HOLD_STATE_MAP)
 * - Reverse state-to-code mappings (STATE_TO_CODE)
 * - Hold state conversion utilities (convertLitUpHoldsStringToMap)
 *
 * Used by both the web app and backend for consistent hold rendering and parsing.
 */

import type { BoardName, HoldState, LitUpHoldsMap } from './types';

// Type aliases used in hold state definitions
export type HoldColor = string;
export type HoldCode = number;

export interface HoldStateInfo {
  name: HoldState;
  color: HoldColor;
  displayColor?: HoldColor;
}

/**
 * Mapping from hold state codes to hold state information.
 *
 * Each board uses different numeric codes in the frames string format:
 * - Kilter: Uses codes 12-15 (old) and 42-45 (new) for the same states
 * - Tension: Uses codes 1-8 (1-4 primary, 5-8 alternate)
 * - MoonBoard: Uses codes 42-44 (compatible with Kilter for shared parsing)
 *
 * The frames string format is: p{holdId}r{stateCode}
 * Example: "p1r42p45r43p198r44" means hold 1 is STARTING, hold 45 is HAND, hold 198 is FINISH
 */
export const HOLD_STATE_MAP: Record<
  BoardName,
  Record<HoldCode, HoldStateInfo>
> = {
  kilter: {
    // New codes (primary)
    42: { name: 'STARTING', color: '#00FF00' },
    43: { name: 'HAND', color: '#00FFFF' },
    44: { name: 'FINISH', color: '#FF00FF' },
    45: { name: 'FOOT', color: '#FFA500' },
    // Old codes (legacy, same colors)
    12: { name: 'STARTING', color: '#00FF00' },
    13: { name: 'HAND', color: '#00FFFF' },
    14: { name: 'FINISH', color: '#FF00FF' },
    15: { name: 'FOOT', color: '#FFA500' },
  },
  tension: {
    // Primary codes
    1: { name: 'STARTING', displayColor: '#00DD00', color: '#00FF00' },
    2: { name: 'HAND', displayColor: '#4444FF', color: '#0000FF' },
    3: { name: 'FINISH', displayColor: '#FF0000', color: '#FF0000' },
    4: { name: 'FOOT', displayColor: '#FF00FF', color: '#FF00FF' },
    // Alternate codes (same colors)
    5: { name: 'STARTING', displayColor: '#00DD00', color: '#00FF00' },
    6: { name: 'HAND', displayColor: '#4444FF', color: '#0000FF' },
    7: { name: 'FINISH', displayColor: '#FF0000', color: '#FF0000' },
    8: { name: 'FOOT', displayColor: '#FF00FF', color: '#FF00FF' },
  },
  // MoonBoard uses codes 42-44 (no FOOT holds)
  // Green for start, Blue for hand, Red for finish
  moonboard: {
    42: { name: 'STARTING', color: '#00FF00', displayColor: '#44FF44' },
    43: { name: 'HAND', color: '#0000FF', displayColor: '#4444FF' },
    44: { name: 'FINISH', color: '#FF0000', displayColor: '#FF3333' },
  },
};

/**
 * Reverse mapping from hold state name to the primary hold code for each board.
 * Used when encoding holds to frames string format.
 */
export const STATE_TO_CODE: Record<BoardName, Partial<Record<HoldState, HoldCode>>> = {
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
  // MoonBoard uses codes 42-44 (compatible with Kilter)
  moonboard: {
    STARTING: 42,
    HAND: 43,
    FINISH: 44,
    // No FOOT holds on MoonBoard
  },
};

// Track warned hold states to avoid log spam
const warnedHoldStates = new Set<string>();

/**
 * Convert a lit-up holds frames string to a map of hold states.
 *
 * The frames string format is comma-separated frames, where each frame contains:
 * p{holdId}r{stateCode} pairs
 *
 * Example: "p1r42p45r43p198r44" parses to:
 * { 1: { state: 'STARTING', ... }, 45: { state: 'HAND', ... }, 198: { state: 'FINISH', ... } }
 *
 * @param litUpHolds - The frames string from the climb data
 * @param board - The board name (kilter, tension, moonboard)
 * @returns A record mapping frame index to the hold state map for that frame
 */
export function convertLitUpHoldsStringToMap(
  litUpHolds: string,
  board: BoardName,
): Record<number, LitUpHoldsMap> {
  return litUpHolds
    .split(',')
    .filter((frame) => frame)
    .reduce(
      (frameMap, frameString, frameIndex) => {
        const frameHoldsMap = Object.fromEntries(
          frameString
            .split('p')
            .filter((hold) => hold)
            .map((holdData) => holdData.split('r').map((str) => Number(str)))
            .map(([holdId, stateCode]) => {
              const stateInfo = HOLD_STATE_MAP[board]?.[stateCode];
              if (!stateInfo) {
                // Rate-limit warnings to avoid log spam
                const warnKey = `${board}:${stateCode}`;
                if (!warnedHoldStates.has(warnKey)) {
                  warnedHoldStates.add(warnKey);
                  console.warn(
                    `HOLD_STATE_MAP is missing values for ${board} status code: ${stateCode} (this warning is only shown once per status code)`,
                  );
                }
                return [holdId || 0, { state: `${holdId}=${stateCode}` as HoldState, color: '#FFF', displayColor: '#FFF' }];
              }
              const { name, color, displayColor } = stateInfo;
              return [holdId, { state: name, color, displayColor: displayColor || color }];
            }),
        );
        frameMap[frameIndex] = frameHoldsMap as LitUpHoldsMap;
        return frameMap;
      },
      {} as Record<number, LitUpHoldsMap>,
    );
}
