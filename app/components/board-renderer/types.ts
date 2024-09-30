import { BoardName } from '@/lib/types';

export type LitUpHolds = string;

export type HoldState = 'OFF' | 'STARTING' | 'FINISH' | 'HAND' | 'FOOT';
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
export type LitUpHoldsMap = Record<HoldCode, { state: HoldState; color: string }>;

// Mapping object for board-specific hold states
export const holdStateMapping: Record<BoardName, Record<HoldCode, { name: HoldState; color: HoldColor }>> = {
  kilter: {
    42: { name: 'STARTING', color: '#00DD00' },
    43: { name: 'HAND', color: '#00FFFF' },
    44: { name: 'FINISH', color: '#FF00FF' },
    45: { name: 'FOOT', color: '#FFA500' },
    12: { name: 'STARTING', color: '#00DD00' },
    13: { name: 'HAND', color: '#00FFFF' },
    14: { name: 'FINISH', color: '#FF00FF' },
    15: { name: 'FOOT', color: '#FFA500' },
  },
  tension: {
    5: { name: 'STARTING', color: '#00DD00' },
    6: { name: 'HAND', color: '#4444FF' },
    7: { name: 'FINISH', color: '#FF0000' },
    8: { name: 'FOOT', color: '#FF00FF' },
  },
};
