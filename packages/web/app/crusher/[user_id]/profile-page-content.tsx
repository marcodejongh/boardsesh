'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import MuiAvatar from '@mui/material/Avatar';
import MuiTooltip from '@mui/material/Tooltip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import { EmptyState } from '@/app/components/ui/empty-state';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { PersonOutlined, Instagram } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import AscentsFeed from '@/app/components/activity-feed';
import FollowButton from '@/app/components/ui/follow-button';
import SetterClimbList from '@/app/components/climb-list/setter-climb-list';
import FollowerCount from '@/app/components/social/follower-count';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import styles from './profile-page.module.css';
import type { ChartData } from './profile-stats-charts';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_USER_TICKS,
  type GetUserTicksQueryVariables,
  type GetUserTicksQueryResponse,
  GET_USER_PROFILE_STATS,
  type GetUserProfileStatsQueryVariables,
  type GetUserProfileStatsQueryResponse,
  FOLLOW_USER,
  UNFOLLOW_USER,
} from '@/app/lib/graphql/operations';
import { FONT_GRADE_COLORS, getGradeColorWithOpacity } from '@/app/lib/grade-colors';
import { SUPPORTED_BOARDS } from '@/app/lib/board-data';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';

dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Lazy load Chart.js components to reduce initial bundle size
const ProfileStatsCharts = dynamic(() => import('./profile-stats-charts'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingStats}>
      <CircularProgress />
    </div>
  ),
});


interface UserProfile {
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

interface LogbookEntry {
  climbed_at: string;
  difficulty: number | null;
  tries: number;
  angle: number;
  status?: 'flash' | 'send' | 'attempt';
  layoutId?: number | null;
  boardType?: string;
  climbUuid?: string;
}

const difficultyMapping: Record<number, string> = {
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

// Helper to get grade color with opacity for charts
const getGradeChartColor = (grade: string): string => {
  const hexColor = FONT_GRADE_COLORS[grade.toLowerCase()];
  return hexColor ? getGradeColorWithOpacity(hexColor, 0.8) : 'rgba(200, 200, 200, 0.7)';
};

const angleColors = [
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

type TimeframeType = 'all' | 'lastYear' | 'lastMonth' | 'lastWeek' | 'custom';
type AggregatedTimeframeType = 'today' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'all';

// Board types available in Boardsesh - use SUPPORTED_BOARDS from board-data
const BOARD_TYPES = SUPPORTED_BOARDS;

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
  'kilter-1': 'rgba(6, 182, 212, 0.7)',    // Cyan/Blue - Kilter Original (matches Kilter logo text)
  'kilter-8': 'rgba(57, 255, 20, 0.7)',    // Neon green - Kilter Homewall (matches Kilter logo arrow)
  'tension-9': 'rgba(239, 68, 68, 0.7)',   // Red - Tension Classic
  'tension-10': 'rgba(249, 115, 22, 0.7)', // Orange - Tension 2 Mirror
  'tension-11': 'rgba(234, 179, 8, 0.7)',  // Yellow - Tension 2 Spray
  'moonboard-1': 'rgba(255, 215, 0, 0.7)',  // Gold - MoonBoard 2010
  'moonboard-2': 'rgba(255, 165, 0, 0.7)',  // Orange - MoonBoard 2016
  'moonboard-3': 'rgba(255, 140, 0, 0.7)',  // Dark Orange - MoonBoard 2024
  'moonboard-4': 'rgba(255, 193, 7, 0.7)',  // Amber - MoonBoard Masters 2017
  'moonboard-5': 'rgba(255, 152, 0, 0.7)',  // Deep Orange - MoonBoard Masters 2019
};

// Get layout key from board type and layout ID
const getLayoutKey = (boardType: string, layoutId: number | null | undefined): string => {
  if (layoutId === null || layoutId === undefined) {
    return `${boardType}-unknown`;
  }
  return `${boardType}-${layoutId}`;
};

// Get display name for a layout
const getLayoutDisplayName = (boardType: string, layoutId: number | null | undefined): string => {
  const key = getLayoutKey(boardType, layoutId);
  return layoutNames[key] || `${boardType.charAt(0).toUpperCase() + boardType.slice(1)} (Layout ${layoutId ?? 'Unknown'})`;
};

// Get color for a layout
const getLayoutColor = (boardType: string, layoutId: number | null | undefined): string => {
  const key = getLayoutKey(boardType, layoutId);
  return layoutColors[key] || (boardType === 'kilter' ? 'rgba(6, 182, 212, 0.5)' : 'rgba(239, 68, 68, 0.5)');
};

export default function ProfilePageContent({ userId }: { userId: string }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<string>('kilter');
  const [logbook, setLogbook] = useState<LogbookEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeType>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // State for aggregated chart (all boards combined)
  const [aggregatedTimeframe, setAggregatedTimeframe] = useState<AggregatedTimeframeType>('all');
  const [allBoardsTicks, setAllBoardsTicks] = useState<Record<string, LogbookEntry[]>>({});
  const [loadingAggregated, setLoadingAggregated] = useState(false);

  // State for server-side profile stats (distinct climb counts)
  const [profileStats, setProfileStats] = useState<GetUserProfileStatsQueryResponse['userProfileStats'] | null>(null);
  const [loadingProfileStats, setLoadingProfileStats] = useState(false);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'activity' | 'createdClimbs'>('activity');

  const isOwnProfile = session?.user?.id === userId;
  const hasCredentials = (profile?.credentials?.length ?? 0) > 0;
  const { showMessage } = useSnackbar();

  // Fetch profile data for the userId in the URL
  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/internal/profile/${userId}`);

      if (response.status === 404) {
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile({
        id: data.id,
        email: data.email,
        name: data.name,
        image: data.image,
        profile: data.profile,
        credentials: data.credentials,
        followerCount: data.followerCount ?? 0,
        followingCount: data.followingCount ?? 0,
        isFollowedByMe: data.isFollowedByMe ?? false,
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      showMessage('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch ticks from GraphQL backend
  const fetchLogbook = useCallback(async (boardType: string) => {
    setLoadingStats(true);
    try {
      const client = createGraphQLHttpClient(null); // Public query, no auth needed

      const variables: GetUserTicksQueryVariables = {
        userId,
        boardType,
      };

      const response = await client.request<GetUserTicksQueryResponse>(GET_USER_TICKS, variables);

      // Transform Tick to LogbookEntry format
      const entries: LogbookEntry[] = response.userTicks.map(tick => ({
        climbed_at: tick.climbedAt,
        difficulty: tick.difficulty,
        tries: tick.attemptCount,
        angle: tick.angle,
        status: tick.status,
        climbUuid: tick.climbUuid,
      }));

      setLogbook(entries);
    } catch (error) {
      console.error('Error fetching ticks:', error);
      showMessage('Failed to load climbing stats', 'error');
      setLogbook([]);
    } finally {
      setLoadingStats(false);
    }
  }, [userId]);

  // Fetch ticks for all boards (for aggregated chart)
  const fetchAllBoardsTicks = useCallback(async () => {
    setLoadingAggregated(true);
    try {
      const client = createGraphQLHttpClient(null);
      const results: Record<string, LogbookEntry[]> = {};

      await Promise.all(
        BOARD_TYPES.map(async (boardType) => {
          const variables: GetUserTicksQueryVariables = {
            userId,
            boardType,
          };

          const response = await client.request<GetUserTicksQueryResponse>(GET_USER_TICKS, variables);

          results[boardType] = response.userTicks.map(tick => ({
            climbed_at: tick.climbedAt,
            difficulty: tick.difficulty,
            tries: tick.attemptCount,
            angle: tick.angle,
            status: tick.status,
            layoutId: tick.layoutId,
            boardType,
            climbUuid: tick.climbUuid,
          }));
        })
      );

      setAllBoardsTicks(results);
    } catch (error) {
      console.error('Error fetching all boards ticks:', error);
      setAllBoardsTicks({});
    } finally {
      setLoadingAggregated(false);
    }
  }, [userId]);

  // Fetch profile stats with distinct climb counts from server
  const fetchProfileStats = useCallback(async () => {
    setLoadingProfileStats(true);
    try {
      const client = createGraphQLHttpClient(null);
      const variables: GetUserProfileStatsQueryVariables = { userId };
      const response = await client.request<GetUserProfileStatsQueryResponse>(GET_USER_PROFILE_STATS, variables);
      setProfileStats(response.userProfileStats);
    } catch (error) {
      console.error('Error fetching profile stats:', error);
      setProfileStats(null);
    } finally {
      setLoadingProfileStats(false);
    }
  }, [userId]);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fetch all boards ticks on mount
  useEffect(() => {
    fetchAllBoardsTicks();
  }, [fetchAllBoardsTicks]);

  // Fetch profile stats on mount
  useEffect(() => {
    fetchProfileStats();
  }, [fetchProfileStats]);

  // Fetch ticks when board selection changes
  useEffect(() => {
    if (selectedBoard) {
      fetchLogbook(selectedBoard);
    }
  }, [selectedBoard, fetchLogbook]);

  // Filter logbook based on timeframe using useMemo
  const filteredLogbook = useMemo(() => {
    const now = dayjs();
    switch (timeframe) {
      case 'lastWeek':
        return logbook.filter((entry) => dayjs(entry.climbed_at).isAfter(now.subtract(1, 'week')));
      case 'lastMonth':
        return logbook.filter((entry) => dayjs(entry.climbed_at).isAfter(now.subtract(1, 'month')));
      case 'lastYear':
        return logbook.filter((entry) => dayjs(entry.climbed_at).isAfter(now.subtract(1, 'year')));
      case 'custom':
        return logbook.filter((entry) => {
          const climbedAt = dayjs(entry.climbed_at);
          // Use inclusive comparison to include entries on boundary dates
          return climbedAt.isSameOrAfter(dayjs(fromDate), 'day') && climbedAt.isSameOrBefore(dayjs(toDate), 'day');
        });
      case 'all':
      default:
        return logbook;
    }
  }, [logbook, timeframe, fromDate, toDate]);

  // Generate aggregated chart data (ascents by grade, stacked by layout)
  const chartDataAggregated = useMemo(() => {
    const now = dayjs();

    // Filter function based on aggregated timeframe
    const filterByTimeframe = (entry: LogbookEntry) => {
      const climbedAt = dayjs(entry.climbed_at);
      switch (aggregatedTimeframe) {
        case 'today':
          return climbedAt.isSame(now, 'day');
        case 'lastWeek':
          return climbedAt.isAfter(now.subtract(1, 'week'));
        case 'lastMonth':
          return climbedAt.isAfter(now.subtract(1, 'month'));
        case 'lastYear':
          return climbedAt.isAfter(now.subtract(1, 'year'));
        case 'all':
        default:
          return true;
      }
    };

    // Collect distinct climbs by grade for each layout (using Sets to deduplicate)
    const layoutGradeClimbs: Record<string, Record<string, Set<string>>> = {};
    const allGrades = new Set<string>();
    const allLayouts = new Set<string>();

    BOARD_TYPES.forEach((boardType) => {
      const ticks = allBoardsTicks[boardType] || [];
      const filteredTicks = ticks.filter(filterByTimeframe);

      filteredTicks.forEach((entry) => {
        // Only count ascents (not attempts) and must have a climbUuid
        if (entry.difficulty === null || entry.status === 'attempt' || !entry.climbUuid) return;
        const grade = difficultyMapping[entry.difficulty];
        if (grade) {
          const layoutKey = getLayoutKey(boardType, entry.layoutId);
          if (!layoutGradeClimbs[layoutKey]) {
            layoutGradeClimbs[layoutKey] = {};
          }
          if (!layoutGradeClimbs[layoutKey][grade]) {
            layoutGradeClimbs[layoutKey][grade] = new Set();
          }
          layoutGradeClimbs[layoutKey][grade].add(entry.climbUuid);
          allGrades.add(grade);
          allLayouts.add(layoutKey);
        }
      });
    });

    if (allGrades.size === 0) {
      return null;
    }

    // Sort grades by difficulty order
    const sortedGrades = Object.values(difficultyMapping).filter((g) => allGrades.has(g));

    // Define the order for layouts (Kilter first, then Tension, then MoonBoard)
    const layoutOrder = ['kilter-1', 'kilter-8', 'tension-9', 'tension-10', 'tension-11', 'moonboard-1', 'moonboard-2', 'moonboard-3', 'moonboard-4', 'moonboard-5'];
    const sortedLayouts = Array.from(allLayouts).sort((a, b) => {
      const indexA = layoutOrder.indexOf(a);
      const indexB = layoutOrder.indexOf(b);
      // If both are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only one is in the order array, it comes first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // Otherwise, sort alphabetically
      return a.localeCompare(b);
    });

    // Create datasets for each layout (using Set sizes for distinct climb counts)
    const datasets = sortedLayouts.map((layoutKey) => {
      const [boardType, layoutIdStr] = layoutKey.split('-');
      const layoutId = layoutIdStr === 'unknown' ? null : parseInt(layoutIdStr, 10);
      return {
        label: getLayoutDisplayName(boardType, layoutId),
        data: sortedGrades.map((grade) => layoutGradeClimbs[layoutKey]?.[grade]?.size || 0),
        backgroundColor: getLayoutColor(boardType, layoutId),
      };
    }).filter((dataset) => dataset.data.some((value) => value > 0));

    return {
      labels: sortedGrades,
      datasets,
    } as ChartData;
  }, [allBoardsTicks, aggregatedTimeframe]);

  // Generate all chart data in a single useMemo
  const { chartDataBar, chartDataPie, chartDataWeeklyBar } = useMemo(() => {
    if (filteredLogbook.length === 0) {
      return { chartDataBar: null, chartDataPie: null, chartDataWeeklyBar: null };
    }

    // Bar chart - Flash vs Redpoint
    const greaterThanOne: Record<string, number> = {};
    const equalToOne: Record<string, number> = {};
    filteredLogbook.forEach((entry) => {
      if (entry.difficulty === null) return;
      const difficulty = difficultyMapping[entry.difficulty];
      if (difficulty) {
        if (entry.tries > 1) {
          greaterThanOne[difficulty] = (greaterThanOne[difficulty] || 0) + entry.tries;
        } else if (entry.tries === 1) {
          equalToOne[difficulty] = (equalToOne[difficulty] || 0) + 1;
        }
      }
    });
    const barLabels = Object.keys({ ...greaterThanOne, ...equalToOne }).sort();
    const chartDataBar: ChartData = {
      labels: barLabels,
      datasets: [
        {
          label: 'Flash',
          data: barLabels.map((label) => equalToOne[label] || 0),
          backgroundColor: 'rgba(75,192,192,0.5)',
        },
        {
          label: 'Redpoint',
          data: barLabels.map((label) => greaterThanOne[label] || 0),
          backgroundColor: 'rgba(192,75,75,0.5)',
        },
      ],
    };

    // Pie chart - Ascents by Angle (distinct climbs per angle, using climbUuid+angle as key)
    const angleClimbs: Record<string, Set<string>> = {};
    filteredLogbook.forEach((entry) => {
      // Only count successful ascents with a climbUuid
      if (entry.status === 'attempt' || !entry.climbUuid) return;
      const angle = `${entry.angle}°`;
      if (!angleClimbs[angle]) {
        angleClimbs[angle] = new Set();
      }
      // Use climbUuid+angle as the unique key (same climb at different angles counts separately)
      angleClimbs[angle].add(`${entry.climbUuid}-${entry.angle}`);
    });
    const angleLabels = Object.keys(angleClimbs).sort((a, b) => parseInt(a) - parseInt(b));
    const chartDataPie: ChartData = {
      labels: angleLabels,
      datasets: [
        {
          label: 'Ascents by Angle',
          data: angleLabels.map((angle) => angleClimbs[angle]?.size || 0),
          backgroundColor: angleLabels.map((_, index) => angleColors[index] || 'rgba(200,200,200,0.7)'),
        },
      ],
    };

    // Weekly bar chart
    const weeks: string[] = [];
    const first = dayjs(filteredLogbook[filteredLogbook.length - 1]?.climbed_at).startOf('isoWeek');
    const last = dayjs(filteredLogbook[0]?.climbed_at).endOf('isoWeek');
    let current = first;
    while (current.isBefore(last) || current.isSame(last)) {
      weeks.push(`W.${current.isoWeek()} / ${current.year()}`);
      current = current.add(1, 'week');
    }
    const weeklyData: Record<string, Record<string, number>> = {};
    filteredLogbook.forEach((entry) => {
      if (entry.difficulty === null) return;
      const week = `W.${dayjs(entry.climbed_at).isoWeek()} / ${dayjs(entry.climbed_at).year()}`;
      const difficulty = difficultyMapping[entry.difficulty];
      if (difficulty) {
        weeklyData[week] = {
          ...(weeklyData[week] || {}),
          [difficulty]: (weeklyData[week]?.[difficulty] || 0) + 1,
        };
      }
    });
    const datasets = Object.values(difficultyMapping)
      .map((difficulty) => {
        const data = weeks.map((week) => weeklyData[week]?.[difficulty] || 0);
        return {
          label: difficulty,
          data,
          backgroundColor: getGradeChartColor(difficulty),
        };
      })
      .filter((dataset) => dataset.data.some((value) => value > 0));
    const chartDataWeeklyBar: ChartData = {
      labels: weeks,
      datasets,
    };

    return { chartDataBar, chartDataPie, chartDataWeeklyBar };
  }, [filteredLogbook]);

  // Calculate overall statistics summary using server-side distinct climb counts
  const statisticsSummary = useMemo(() => {
    if (!profileStats) {
      return { totalAscents: 0, layoutPercentages: [] };
    }

    const totalAscents = profileStats.totalDistinctClimbs;

    // Transform server data to display format
    const layoutsWithExactPercentages = profileStats.layoutStats
      .map((stats) => {
        const exactPercentage = totalAscents > 0 ? (stats.distinctClimbCount / totalAscents) * 100 : 0;
        // Convert grade counts array to Record format
        const grades: Record<string, number> = {};
        stats.gradeCounts.forEach(({ grade, count }) => {
          const difficultyNum = parseInt(grade, 10);
          if (!isNaN(difficultyNum)) {
            const gradeName = difficultyMapping[difficultyNum];
            if (gradeName) {
              grades[gradeName] = count;
            }
          }
        });
        return {
          layoutKey: stats.layoutKey,
          boardType: stats.boardType,
          layoutId: stats.layoutId,
          displayName: getLayoutDisplayName(stats.boardType, stats.layoutId),
          color: getLayoutColor(stats.boardType, stats.layoutId),
          count: stats.distinctClimbCount,
          grades,
          exactPercentage,
          percentage: Math.floor(exactPercentage),
          remainder: exactPercentage - Math.floor(exactPercentage),
        };
      })
      .filter((layout) => layout.count > 0)
      .sort((a, b) => b.count - a.count);

    // Distribute remaining percentage points to items with largest remainders
    const totalFloored = layoutsWithExactPercentages.reduce((sum, l) => sum + l.percentage, 0);
    const remaining = 100 - totalFloored;

    // Sort by remainder descending to distribute extra points
    const sortedByRemainder = [...layoutsWithExactPercentages].sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remaining && i < sortedByRemainder.length; i++) {
      sortedByRemainder[i].percentage += 1;
    }

    // Remove helper fields and return sorted by count
    const layoutPercentages = layoutsWithExactPercentages.map(({ exactPercentage, remainder, ...rest }) => rest);

    return {
      totalAscents,
      layoutPercentages,
    };
  }, [profileStats]);

  if (loading) {
    return (
      <Box className={styles.layout}>
        <Box component="main" className={styles.loadingContent}>
          <CircularProgress size={48} />
        </Box>
      </Box>
    );
  }

  if (notFound) {
    return (
      <Box className={styles.layout}>
        <Box component="header" className={styles.header}>
          <BackButton fallbackUrl="/" />
          <Logo size="sm" showText={false} />
          <Typography variant="h6" component="h4" className={styles.headerTitle}>
            Profile
          </Typography>
        </Box>
        <Box component="main" className={styles.content}>
          <EmptyState description="User not found" />
        </Box>
      </Box>
    );
  }

  const displayName = profile?.profile?.displayName || profile?.name || 'Crusher';
  const avatarUrl = profile?.profile?.avatarUrl || profile?.image;
  const instagramUrl = profile?.profile?.instagramUrl;
  const authToken = (session as { authToken?: string } | null)?.authToken ?? null;

  // Board options are now available for all users (no Aurora credentials required)
  const boardOptions = BOARD_TYPES.map((boardType) => ({
    label: boardType.charAt(0).toUpperCase() + boardType.slice(1),
    value: boardType,
  }));

  const timeframeOptions = [
    { label: 'All', value: 'all' },
    { label: 'Year', value: 'lastYear' },
    { label: 'Month', value: 'lastMonth' },
    { label: 'Week', value: 'lastWeek' },
    { label: 'Custom', value: 'custom' },
  ];

  const aggregatedTimeframeOptions = [
    { label: 'All', value: 'all' },
    { label: 'Year', value: 'lastYear' },
    { label: 'Month', value: 'lastMonth' },
    { label: 'Week', value: 'lastWeek' },
    { label: 'Today', value: 'today' },
  ];

  return (
    <Box className={styles.layout}>
      <Box component="header" className={styles.header}>
        <BackButton fallbackUrl="/" />
        <Logo size="sm" showText={false} />
        <Typography variant="h6" component="h4" className={styles.headerTitle}>
          Profile
        </Typography>
      </Box>

      <Box component="main" className={styles.content}>
        {/* Profile Card */}
        <MuiCard className={styles.profileCard}><CardContent>
          <div className={styles.profileInfo}>
            <MuiAvatar sx={{ width: 80, height: 80 }} src={avatarUrl ?? undefined}>
              {!avatarUrl && <PersonOutlined />}
            </MuiAvatar>
            <div className={styles.profileDetails}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" component="h4" className={styles.displayName}>
                  {displayName}
                </Typography>
                {!isOwnProfile && (
                  <FollowButton
                    entityId={userId}
                    initialIsFollowing={profile?.isFollowedByMe ?? false}
                    followMutation={FOLLOW_USER}
                    unfollowMutation={UNFOLLOW_USER}
                    entityLabel="user"
                    getFollowVariables={(id) => ({ input: { userId: id } })}
                    onFollowChange={(isFollowing) => {
                      if (profile) {
                        setProfile({
                          ...profile,
                          followerCount: profile.followerCount + (isFollowing ? 1 : -1),
                          isFollowedByMe: isFollowing,
                        });
                      }
                    }}
                  />
                )}
              </Box>
              <FollowerCount
                userId={userId}
                followerCount={profile?.followerCount ?? 0}
                followingCount={profile?.followingCount ?? 0}
              />
              {isOwnProfile && (
                <Typography variant="body2" component="span" color="text.secondary">{profile?.email}</Typography>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl.startsWith('http') ? instagramUrl : `https://${instagramUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.instagramLink}
                >
                  <Instagram className={styles.instagramIcon} />
                  <span>{instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}</span>
                </a>
              )}
            </div>
          </div>
        </CardContent></MuiCard>

        {/* Statistics Summary Card */}
        {!loadingProfileStats && statisticsSummary.totalAscents > 0 && (
          <MuiCard className={styles.statsCard}><CardContent>
            {/* Distinct Climbs Header */}
            <div className={styles.statsSummaryHeader}>
              <div className={styles.totalAscentsContainer}>
                <Typography variant="body2" component="span" className={styles.totalAscentsLabel}>Distinct Climbs</Typography>
                <Typography variant="h4" component="h2" className={styles.totalAscentsValue}>
                  {statisticsSummary.totalAscents}
                </Typography>
              </div>
            </div>

            {/* Board/Layout Percentage Bar */}
            <div className={styles.percentageBarContainer}>
              <div className={styles.percentageBar}>
                {statisticsSummary.layoutPercentages.map((layout) => (
                  <MuiTooltip
                    key={layout.layoutKey}
                    title={`${layout.displayName}: ${layout.count} distinct climbs (${layout.percentage}%)`}
                  >
                    <div
                      className={styles.percentageSegment}
                      style={{
                        width: `${layout.percentage}%`,
                        backgroundColor: layout.color,
                      }}
                    >
                      {layout.percentage >= 15 && (
                        <span className={styles.percentageLabel}>
                          {layout.displayName.split(' ').slice(-1)[0]} {layout.percentage}%
                        </span>
                      )}
                    </div>
                  </MuiTooltip>
                ))}
              </div>
              <div className={styles.percentageLegend}>
                {statisticsSummary.layoutPercentages.map((layout) => (
                  <div key={layout.layoutKey} className={styles.legendItem}>
                    <div
                      className={styles.legendColor}
                      style={{ backgroundColor: layout.color }}
                    />
                    <Typography variant="body2" component="span" className={styles.legendText}>
                      {layout.displayName} ({layout.percentage}%)
                    </Typography>
                  </div>
                ))}
              </div>
            </div>

            {/* Grade Blocks by Layout */}
            <div className={styles.gradeBlocksContainer}>
              <Typography variant="body2" component="span" fontWeight={600} className={styles.gradeBlocksTitle}>Grades by Board</Typography>
              {statisticsSummary.layoutPercentages.map((layout) => (
                <div key={layout.layoutKey} className={styles.layoutGradeRow}>
                  <div className={styles.layoutGradeHeader}>
                    <div
                      className={styles.layoutIndicator}
                      style={{ backgroundColor: layout.color }}
                    />
                    <Typography variant="body2" component="span" className={styles.layoutName}>{layout.displayName}</Typography>
                    <Typography variant="body2" component="span" color="text.secondary" className={styles.layoutCount}>
                      {layout.count} climbs
                    </Typography>
                  </div>
                  <div className={styles.gradeBlocks}>
                    {Object.entries(layout.grades)
                      .sort((a, b) => {
                        const gradeOrder = Object.values(difficultyMapping);
                        return gradeOrder.indexOf(a[0]) - gradeOrder.indexOf(b[0]);
                      })
                      .map(([grade, count]) => (
                        <MuiTooltip
                          key={grade}
                          title={`${grade}: ${count} climb${count !== 1 ? 's' : ''}`}
                        >
                          <div
                            className={styles.gradeBlock}
                            style={{ backgroundColor: getGradeChartColor(grade) }}
                          >
                            <span className={styles.gradeBlockLabel}>{grade}</span>
                            <span className={styles.gradeBlockCount}>{count}</span>
                          </div>
                        </MuiTooltip>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent></MuiCard>
        )}

        {/* Aggregated Stats - All Boards */}
        <MuiCard className={styles.statsCard}><CardContent>
          <Typography variant="h6" component="h5">Ascents by Grade</Typography>
          <Typography variant="body2" component="span" color="text.secondary" className={styles.chartDescription}>
            Total ascents by board layout
          </Typography>

          <div className={styles.timeframeSelector}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={aggregatedTimeframe}
              onChange={(_, val) => { if (val) setAggregatedTimeframe(val as AggregatedTimeframeType); }}
            >
              {aggregatedTimeframeOptions.map(opt => (
                <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>

          {loadingAggregated ? (
            <div className={styles.loadingStats}>
              <CircularProgress />
            </div>
          ) : !chartDataAggregated ? (
            <EmptyState description="No ascent data for this period" />
          ) : (
            <div className={styles.chartsContainer}>
              <ProfileStatsCharts
                chartDataAggregated={chartDataAggregated}
                chartDataWeeklyBar={null}
                chartDataBar={null}
                chartDataPie={null}
              />
            </div>
          )}
        </CardContent></MuiCard>

        {/* Board-Specific Stats */}
        <MuiCard className={styles.statsCard}><CardContent>
          <Typography variant="h6" component="h5">Board Stats</Typography>

          <>
            {/* Board Selector */}
            <div className={styles.boardSelector}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={selectedBoard}
                onChange={(_, val) => { if (val) setSelectedBoard(val as string); }}
              >
                {boardOptions.map(opt => (
                  <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>

            {/* Timeframe Selector */}
            <div className={styles.timeframeSelector}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={timeframe}
                onChange={(_, val) => { if (val) setTimeframe(val as TimeframeType); }}
              >
                {timeframeOptions.map(opt => (
                  <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>

            {timeframe === 'custom' && (
              <div className={styles.customDateRange}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" component="span">From:</Typography>
                  <MuiDatePicker
                    value={fromDate ? dayjs(fromDate) : null}
                    onChange={(val) => setFromDate(val ? val.format('YYYY-MM-DD') : '')}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                  <Typography variant="body2" component="span">To:</Typography>
                  <MuiDatePicker
                    value={toDate ? dayjs(toDate) : null}
                    onChange={(val) => setToDate(val ? val.format('YYYY-MM-DD') : '')}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                </Stack>
              </div>
            )}

            {loadingStats ? (
              <div className={styles.loadingStats}>
                <CircularProgress />
              </div>
            ) : filteredLogbook.length === 0 ? (
              <EmptyState description="No climbing data for this period" />
            ) : (
              <div className={styles.chartsContainer}>
                <ProfileStatsCharts
                  chartDataAggregated={null}
                  chartDataWeeklyBar={chartDataWeeklyBar}
                  chartDataBar={chartDataBar}
                  chartDataPie={chartDataPie}
                />
              </div>
            )}
          </>
        </CardContent></MuiCard>

        {/* Tab Navigation: Activity / Created Climbs */}
        {hasCredentials && (
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="fullWidth"
            sx={{ mb: 2 }}
          >
            <Tab label="Activity" value="activity" />
            <Tab label="Created Climbs" value="createdClimbs" />
          </Tabs>
        )}

        {(!hasCredentials || activeTab === 'activity') && (
          <MuiCard className={styles.statsCard}><CardContent>
            <Typography variant="h6" component="h5">Recent Activity</Typography>
            <Typography variant="body2" component="span" color="text.secondary" className={styles.chartDescription}>
              Latest ascents and attempts
            </Typography>
            <AscentsFeed userId={userId} pageSize={10} />
          </CardContent></MuiCard>
        )}

        {activeTab === 'createdClimbs' && profile?.credentials && (() => {
          const uniqueSetters = Array.from(
            new Map(profile.credentials.map((c) => [c.auroraUsername, c])).values()
          );
          return uniqueSetters.map((cred) => (
            <MuiCard key={cred.auroraUsername} className={styles.statsCard}>
              <CardContent>
                <Typography variant="h6" component="h5">
                  Created Climbs
                </Typography>
                <Typography variant="body2" component="span" color="text.secondary" className={styles.chartDescription}>
                  Climbs set by {cred.auroraUsername} on {cred.boardType.charAt(0).toUpperCase() + cred.boardType.slice(1)}
                </Typography>
                <SetterClimbList
                  username={cred.auroraUsername}
                  authToken={authToken}
                />
              </CardContent>
            </MuiCard>
          ));
        })()}
      </Box>
    </Box>
  );
}
