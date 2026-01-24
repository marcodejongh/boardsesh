import { BoardName } from '@/app/lib/types';
import { MOONBOARD_ENABLED, MOONBOARD_HOLD_STATES, MOONBOARD_HOLD_STATE_CODES } from '@/app/lib/moonboard-config';

export type LitUpHolds = string;

export type HoldState = 'OFF' | 'STARTING' | 'FINISH' | 'HAND' | 'FOOT' | 'ANY' | 'NOT';
export type HoldsArray = Array<HoldRenderData>;

export type HoldColor = string;
export type HoldCode = number;
export type HoldRenderData = {
  id: number;
  mirroredHoldId: number | null;
  cx: number;
  cy: number;
  r: number;
};
export type LitupHold = { state: HoldState; color: string; displayColor: string };
export type LitUpHoldsMap = Record<HoldCode, LitupHold>;

export interface HeatmapData {
  holdId: number;
  totalUses: number;
  startingUses: number;
  totalAscents: number;
  handUses: number;
  footUses: number;
  finishUses: number;
  averageDifficulty: number | null;
  userAscents?: number; // Added for user-specific ascent data
  userAttempts?: number; // Added for user-specific attempt data
}

// If adding more boards be sure to increment the DB version number for indexeddb
export const supported_boards: BoardName[] = MOONBOARD_ENABLED
  ? ['kilter', 'tension', 'moonboard']
  : ['kilter', 'tension'];

// Mapping object for board-specific hold states
export const HOLD_STATE_MAP: Record<
  BoardName,
  Record<HoldCode, { name: HoldState; color: HoldColor; displayColor?: HoldColor }>
> = {
  kilter: {
    42: { name: 'STARTING', color: '#00FF00' },
    43: { name: 'HAND', color: '#00FFFF' },
    44: { name: 'FINISH', color: '#FF00FF' },
    45: { name: 'FOOT', color: '#FFA500' },
    12: { name: 'STARTING', color: '#00FF00' },
    13: { name: 'HAND', color: '#00FFFF' },
    14: { name: 'FINISH', color: '#FF00FF' },
    15: { name: 'FOOT', color: '#FFA500' },
  },
  tension: {
    1: { name: 'STARTING', displayColor: '#00DD00', color: '#00FF00' },
    2: { name: 'HAND', displayColor: '#4444FF', color: '#0000FF' },
    3: { name: 'FINISH', displayColor: '#FF0000', color: '#FF0000' },
    4: { name: 'FOOT', displayColor: '#FF00FF', color: '#FF00FF' },
    5: { name: 'STARTING', displayColor: '#00DD00', color: '#00FF00' },
    6: { name: 'HAND', displayColor: '#4444FF', color: '#0000FF' },
    7: { name: 'FINISH', displayColor: '#FF0000', color: '#FF0000' },
    8: { name: 'FOOT', displayColor: '#FF00FF', color: '#FF00FF' },
  },
  // MoonBoard hold states derived from moonboard-config.ts (no foot holds)
  moonboard: {
    [MOONBOARD_HOLD_STATE_CODES.start]: { name: MOONBOARD_HOLD_STATES.start.name, color: MOONBOARD_HOLD_STATES.start.color, displayColor: MOONBOARD_HOLD_STATES.start.displayColor },
    [MOONBOARD_HOLD_STATE_CODES.hand]: { name: MOONBOARD_HOLD_STATES.hand.name, color: MOONBOARD_HOLD_STATES.hand.color, displayColor: MOONBOARD_HOLD_STATES.hand.displayColor },
    [MOONBOARD_HOLD_STATE_CODES.finish]: { name: MOONBOARD_HOLD_STATES.finish.name, color: MOONBOARD_HOLD_STATES.finish.color, displayColor: MOONBOARD_HOLD_STATES.finish.displayColor },
  },
};
