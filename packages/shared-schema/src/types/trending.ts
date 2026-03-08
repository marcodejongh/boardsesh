export type TrendingClimbItem = {
  climbUuid: string;
  climbName: string;
  setterUsername: string | null;
  boardType: string;
  layoutId: number;
  angle: number;
  frames: string | null;
  difficultyName: string | null;
  qualityAverage: number | null;
  currentAscents: number;
  ascentDelta: number;
  ascentPctChange: number | null;
};

export type TrendingClimbFeedResult = {
  items: TrendingClimbItem[];
  totalCount: number;
  hasMore: boolean;
};

export type TrendingClimbFeedInput = {
  limit?: number;
  offset?: number;
  boardUuid?: string | null;
  timePeriodDays?: number;
};
