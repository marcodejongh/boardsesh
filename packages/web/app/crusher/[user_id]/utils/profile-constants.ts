import { FONT_GRADE_COLORS, getGradeColorWithOpacity } from '@/app/lib/grade-colors';
import { SUPPORTED_BOARDS } from '@/app/lib/board-data';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    instagramUrl: string | null;
  } | null;
  credentials?: Array<{
    boardType: string;
    auroraUsername: string;
  }>;
  followerCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
}

export interface LogbookEntry {
  climbed_at: string;
  difficulty: number | null;
  tries: number;
  angle: number;
  status?: 'flash' | 'send' | 'attempt';
  layoutId?: number | null;
  boardType?: string;
  climbUuid?: string;
}

export type TimeframeType = 'all' | 'lastYear' | 'lastMonth' | 'lastWeek' | 'custom';
export type AggregatedTimeframeType = 'today' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'all';

export const BOARD_TYPES = SUPPORTED_BOARDS;

export const difficultyMapping: Record<number, string> = {
  10: '4a',
  11: '4b',
  12: '4c',
  13: '5a',
  14: '5b',
  15: '5c',
  16: '6a',
  17: '6a+',
  18: '6b',
  19: '6b+',
  20: '6c',
  21: '6c+',
  22: '7a',
  23: '7a+',
  24: '7b',
  25: '7b+',
  26: '7c',
  27: '7c+',
  28: '8a',
  29: '8a+',
  30: '8b',
  31: '8b+',
  32: '8c',
  33: '8c+',
};

export const angleColors = [
  'rgba(255,77,77,0.7)',
  'rgba(51,0,102,1)',
  'rgba(77,128,255,0.7)',
  'rgba(255,204,51,0.7)',
  'rgba(204,51,153,0.7)',
  'rgba(51,204,204,0.7)',
  'rgba(255,230,25,0.7)',
  'rgba(102,102,255,0.7)',
  'rgba(51,153,255,0.7)',
  'rgba(25,179,255,0.7)',
  'rgba(255,255,51,0.7)',
  'rgba(102,51,153,1)',
  'rgba(179,255,128,0.7)',
];

// Layout name mapping: boardType-layoutId -> display name
const layoutNames: Record<string, string> = {
  'kilter-1': 'Kilter Original',
  'kilter-8': 'Kilter Homewall',
  'tension-9': 'Tension Classic',
  'tension-10': 'Tension 2 Mirror',
  'tension-11': 'Tension 2 Spray',
  'moonboard-1': 'MoonBoard 2010',
  'moonboard-2': 'MoonBoard 2016',
  'moonboard-3': 'MoonBoard 2024',
  'moonboard-4': 'MoonBoard Masters 2017',
  'moonboard-5': 'MoonBoard Masters 2019',
};

// Colors for each layout
const layoutColors: Record<string, string> = {
  'kilter-1': 'rgba(6, 182, 212, 0.7)',
  'kilter-8': 'rgba(57, 255, 20, 0.7)',
  'tension-9': 'rgba(239, 68, 68, 0.7)',
  'tension-10': 'rgba(249, 115, 22, 0.7)',
  'tension-11': 'rgba(234, 179, 8, 0.7)',
  'moonboard-1': 'rgba(255, 215, 0, 0.7)',
  'moonboard-2': 'rgba(255, 165, 0, 0.7)',
  'moonboard-3': 'rgba(255, 140, 0, 0.7)',
  'moonboard-4': 'rgba(255, 193, 7, 0.7)',
  'moonboard-5': 'rgba(255, 152, 0, 0.7)',
};

export const getLayoutKey = (boardType: string, layoutId: number | null | undefined): string => {
  if (layoutId === null || layoutId === undefined) {
    return `${boardType}-unknown`;
  }
  return `${boardType}-${layoutId}`;
};

export const getLayoutDisplayName = (boardType: string, layoutId: number | null | undefined): string => {
  const key = getLayoutKey(boardType, layoutId);
  return layoutNames[key] || `${boardType.charAt(0).toUpperCase() + boardType.slice(1)} (Layout ${layoutId ?? 'Unknown'})`;
};

export const getLayoutColor = (boardType: string, layoutId: number | null | undefined): string => {
  const key = getLayoutKey(boardType, layoutId);
  return layoutColors[key] || (boardType === 'kilter' ? 'rgba(6, 182, 212, 0.5)' : 'rgba(239, 68, 68, 0.5)');
};

export const getGradeChartColor = (grade: string): string => {
  const hexColor = FONT_GRADE_COLORS[grade.toLowerCase()];
  return hexColor ? getGradeColorWithOpacity(hexColor, 0.8) : 'rgba(200, 200, 200, 0.7)';
};

export const boardOptions = BOARD_TYPES.map((boardType) => ({
  label: boardType.charAt(0).toUpperCase() + boardType.slice(1),
  value: boardType,
}));

export const timeframeOptions = [
  { label: 'All', value: 'all' },
  { label: 'Year', value: 'lastYear' },
  { label: 'Month', value: 'lastMonth' },
  { label: 'Week', value: 'lastWeek' },
  { label: 'Custom', value: 'custom' },
];

export const aggregatedTimeframeOptions = [
  { label: 'All', value: 'all' },
  { label: 'Year', value: 'lastYear' },
  { label: 'Month', value: 'lastMonth' },
  { label: 'Week', value: 'lastWeek' },
  { label: 'Today', value: 'today' },
];
