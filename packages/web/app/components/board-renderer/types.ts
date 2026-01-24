import { BoardName } from '@/app/lib/types';
import { MOONBOARD_ENABLED } from '@/app/lib/moonboard-config';

// Re-export hold state types and constants from shared-schema for backward compatibility
export {
  HOLD_STATE_MAP,
  STATE_TO_CODE,
  type HoldColor,
  type HoldCode,
  type HoldStateInfo,
} from '@boardsesh/shared-schema';

export type LitUpHolds = string;

export type HoldState = 'OFF' | 'STARTING' | 'FINISH' | 'HAND' | 'FOOT' | 'ANY' | 'NOT';
export type HoldsArray = Array<HoldRenderData>;

export type HoldRenderData = {
  id: number;
  mirroredHoldId: number | null;
  cx: number;
  cy: number;
  r: number;
};
export type LitupHold = { state: HoldState; color: string; displayColor: string };
export type LitUpHoldsMap = Record<number, LitupHold>;

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
