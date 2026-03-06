// Board configuration types

export type BoardName = 'kilter' | 'tension' | 'moonboard';

// All supported board types - single source of truth
export const SUPPORTED_BOARDS: BoardName[] = ['kilter', 'tension', 'moonboard'];

export type Grade = {
  difficultyId: number;
  name: string;
};

export type Angle = {
  angle: number;
};
