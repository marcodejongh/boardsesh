'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Layout,
  Card,
  Avatar,
  Typography,
  Spin,
  Segmented,
  Empty,
  Space,
  DatePicker,
  message,
  Tooltip,
} from 'antd';
import { UserOutlined, InstagramOutlined, FireOutlined, TrophyOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import AscentsFeed from '@/app/components/activity-feed';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import styles from './profile-page.module.css';
import type { ChartData } from './profile-stats-charts';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { GET_USER_TICKS, type GetUserTicksQueryVariables, type GetUserTicksQueryResponse } from '@/app/lib/graphql/operations';

dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Lazy load Chart.js components to reduce initial bundle size
const ProfileStatsCharts = dynamic(() => import('./profile-stats-charts'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingStats}>
      <Spin />
    </div>
  ),
});

const { Content, Header } = Layout;
const { Title, Text } = Typography;

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
}

interface LogbookEntry {
  climbed_at: string;
  difficulty: number | null;
  tries: number;
  angle: number;
  status?: 'flash' | 'send' | 'attempt';
  layoutId?: number | null;
  boardType?: string;
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

const gradeColors: Record<string, string> = {
  '4a': 'rgba(153,255,153,0.7)',
  '4b': 'rgba(179,255,128,0.7)',
  '4c': 'rgba(204,255,102,0.7)',
  '5a': 'rgba(230,255,77,0.7)',
  '5b': 'rgba(255,255,51,0.7)',
  '5c': 'rgba(255,230,25,0.7)',
  '6a': 'rgba(255,204,51,0.7)',
  '6a+': 'rgba(255,179,77,0.7)',
  '6b': 'rgba(255,153,102,0.7)',
  '6b+': 'rgba(255,128,128,0.7)',
  '6c': 'rgba(204,102,204,0.7)',
  '6c+': 'rgba(153,102,255,0.7)',
  '7a': 'rgba(102,102,255,0.7)',
  '7a+': 'rgba(77,128,255,0.7)',
  '7b': 'rgba(51,153,255,0.7)',
  '7b+': 'rgba(25,179,255,0.7)',
  '7c': 'rgba(25,204,230,0.7)',
  '7c+': 'rgba(51,204,204,0.7)',
  '8a': 'rgba(255,77,77,0.7)',
  '8a+': 'rgba(204,51,153,0.7)',
  '8b': 'rgba(153,51,204,0.9)',
  '8b+': 'rgba(102,51,153,1)',
  '8c': 'rgba(77,25,128,1)',
  '8c+': 'rgba(51,0,102,1)',
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

// Board types available in Boardsesh
const BOARD_TYPES = ['kilter', 'tension'] as const;

// Layout name mapping: boardType-layoutId -> display name
const layoutNames: Record<string, string> = {
  'kilter-1': 'Kilter Original',
  'kilter-8': 'Kilter Homewall',
  'tension-9': 'Tension Classic',
  'tension-10': 'Tension 2 Mirror',
  'tension-11': 'Tension 2 Spray',
};

// Colors for each layout
const layoutColors: Record<string, string> = {
  'kilter-1': 'rgba(6, 182, 212, 0.7)',    // Cyan - Kilter Original
  'kilter-8': 'rgba(14, 165, 233, 0.7)',   // Sky blue - Kilter Homewall
  'tension-9': 'rgba(239, 68, 68, 0.7)',   // Red - Tension Classic
  'tension-10': 'rgba(249, 115, 22, 0.7)', // Orange - Tension 2 Mirror
  'tension-11': 'rgba(234, 179, 8, 0.7)',  // Yellow - Tension 2 Spray
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

  const isOwnProfile = session?.user?.id === userId;

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
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      message.error('Failed to load profile data');
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
      }));

      setLogbook(entries);
    } catch (error) {
      console.error('Error fetching ticks:', error);
      message.error('Failed to load climbing stats');
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

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fetch all boards ticks on mount
  useEffect(() => {
    fetchAllBoardsTicks();
  }, [fetchAllBoardsTicks]);

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

    // Collect ascents by grade for each layout
    const layoutGradeCounts: Record<string, Record<string, number>> = {};
    const allGrades = new Set<string>();
    const allLayouts = new Set<string>();

    BOARD_TYPES.forEach((boardType) => {
      const ticks = allBoardsTicks[boardType] || [];
      const filteredTicks = ticks.filter(filterByTimeframe);

      filteredTicks.forEach((entry) => {
        // Only count ascents (not attempts)
        if (entry.difficulty === null || entry.status === 'attempt') return;
        const grade = difficultyMapping[entry.difficulty];
        if (grade) {
          const layoutKey = getLayoutKey(boardType, entry.layoutId);
          if (!layoutGradeCounts[layoutKey]) {
            layoutGradeCounts[layoutKey] = {};
          }
          layoutGradeCounts[layoutKey][grade] = (layoutGradeCounts[layoutKey][grade] || 0) + 1;
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

    // Define the order for layouts (Kilter first, then Tension)
    const layoutOrder = ['kilter-1', 'kilter-8', 'tension-9', 'tension-10', 'tension-11'];
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

    // Create datasets for each layout
    const datasets = sortedLayouts.map((layoutKey) => {
      const [boardType, layoutIdStr] = layoutKey.split('-');
      const layoutId = layoutIdStr === 'unknown' ? null : parseInt(layoutIdStr, 10);
      return {
        label: getLayoutDisplayName(boardType, layoutId),
        data: sortedGrades.map((grade) => layoutGradeCounts[layoutKey]?.[grade] || 0),
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

    // Pie chart - Routes by Angle
    const angles = filteredLogbook.reduce((acc: Record<string, number>, entry) => {
      const angle = `${entry.angle}°`;
      acc[angle] = (acc[angle] || 0) + 1;
      return acc;
    }, {});
    const chartDataPie: ChartData = {
      labels: Object.keys(angles),
      datasets: [
        {
          label: 'Routes by Angle',
          data: Object.values(angles),
          backgroundColor: Object.keys(angles).map((_, index) => angleColors[index] || 'rgba(200,200,200,0.7)'),
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
          backgroundColor: gradeColors[difficulty],
        };
      })
      .filter((dataset) => dataset.data.some((value) => value > 0));
    const chartDataWeeklyBar: ChartData = {
      labels: weeks,
      datasets,
    };

    return { chartDataBar, chartDataPie, chartDataWeeklyBar };
  }, [filteredLogbook]);

  // Calculate overall statistics summary (for the header)
  const statisticsSummary = useMemo(() => {
    const layoutStats: Record<string, { count: number; flashes: number; sends: number; attempts: number; grades: Record<string, number> }> = {};
    let totalAscents = 0;
    let totalFlashes = 0;
    let totalSends = 0;

    BOARD_TYPES.forEach((boardType) => {
      const ticks = allBoardsTicks[boardType] || [];

      ticks.forEach((entry) => {
        const layoutKey = getLayoutKey(boardType, entry.layoutId);

        if (!layoutStats[layoutKey]) {
          layoutStats[layoutKey] = { count: 0, flashes: 0, sends: 0, attempts: 0, grades: {} };
        }

        // Only count successful ascents (not attempts)
        if (entry.status !== 'attempt') {
          layoutStats[layoutKey].count += 1;
          totalAscents += 1;

          // Track flash vs send
          if (entry.status === 'flash' || entry.tries === 1) {
            layoutStats[layoutKey].flashes += 1;
            totalFlashes += 1;
          } else {
            layoutStats[layoutKey].sends += 1;
            totalSends += 1;
          }

          // Track grades for each layout
          if (entry.difficulty !== null) {
            const grade = difficultyMapping[entry.difficulty];
            if (grade) {
              layoutStats[layoutKey].grades[grade] = (layoutStats[layoutKey].grades[grade] || 0) + 1;
            }
          }
        } else {
          layoutStats[layoutKey].attempts += 1;
        }
      });
    });

    // Calculate percentages and sort by count
    const layoutPercentages = Object.entries(layoutStats)
      .map(([layoutKey, stats]) => {
        const [boardType, layoutIdStr] = layoutKey.split('-');
        const layoutId = layoutIdStr === 'unknown' ? null : parseInt(layoutIdStr, 10);
        return {
          layoutKey,
          boardType,
          layoutId,
          displayName: getLayoutDisplayName(boardType, layoutId),
          color: getLayoutColor(boardType, layoutId),
          count: stats.count,
          flashes: stats.flashes,
          sends: stats.sends,
          attempts: stats.attempts,
          grades: stats.grades,
          percentage: totalAscents > 0 ? Math.round((stats.count / totalAscents) * 100) : 0,
        };
      })
      .filter((layout) => layout.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      totalAscents,
      totalFlashes,
      totalSends,
      layoutPercentages,
    };
  }, [allBoardsTicks]);

  if (loading) {
    return (
      <Layout className={styles.layout}>
        <Content className={styles.loadingContent}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout className={styles.layout}>
        <Header className={styles.header}>
          <BackButton fallbackUrl="/" />
          <Logo size="sm" showText={false} />
          <Title level={4} className={styles.headerTitle}>
            Profile
          </Title>
        </Header>
        <Content className={styles.content}>
          <Empty description="User not found" />
        </Content>
      </Layout>
    );
  }

  const displayName = profile?.profile?.displayName || profile?.name || 'Crusher';
  const avatarUrl = profile?.profile?.avatarUrl || profile?.image;
  const instagramUrl = profile?.profile?.instagramUrl;

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
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <BackButton fallbackUrl="/" />
        <Logo size="sm" showText={false} />
        <Title level={4} className={styles.headerTitle}>
          Profile
        </Title>
      </Header>

      <Content className={styles.content}>
        {/* Profile Card */}
        <Card className={styles.profileCard}>
          <div className={styles.profileInfo}>
            <Avatar size={80} src={avatarUrl} icon={<UserOutlined />} />
            <div className={styles.profileDetails}>
              <Title level={4} className={styles.displayName}>
                {displayName}
              </Title>
              {isOwnProfile && (
                <Text type="secondary">{profile?.email}</Text>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl.startsWith('http') ? instagramUrl : `https://${instagramUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.instagramLink}
                >
                  <InstagramOutlined className={styles.instagramIcon} />
                  <span>{instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}</span>
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* Statistics Summary Card */}
        {!loadingAggregated && statisticsSummary.totalAscents > 0 && (
          <Card className={styles.statsCard}>
            {/* Total Ascents Header */}
            <div className={styles.statsSummaryHeader}>
              <div className={styles.totalAscentsContainer}>
                <Text className={styles.totalAscentsLabel}>Total Ascents</Text>
                <Title level={2} className={styles.totalAscentsValue}>
                  {statisticsSummary.totalAscents}
                </Title>
              </div>
              <div className={styles.quickStats}>
                <div className={styles.quickStat}>
                  <FireOutlined className={styles.quickStatIcon} />
                  <div className={styles.quickStatContent}>
                    <Text className={styles.quickStatValue}>{statisticsSummary.totalFlashes}</Text>
                    <Text type="secondary" className={styles.quickStatLabel}>Flashes</Text>
                  </div>
                </div>
                <div className={styles.quickStat}>
                  <TrophyOutlined className={styles.quickStatIcon} />
                  <div className={styles.quickStatContent}>
                    <Text className={styles.quickStatValue}>{statisticsSummary.totalSends}</Text>
                    <Text type="secondary" className={styles.quickStatLabel}>Sends</Text>
                  </div>
                </div>
              </div>
            </div>

            {/* Board/Layout Percentage Bar */}
            <div className={styles.percentageBarContainer}>
              <div className={styles.percentageBar}>
                {statisticsSummary.layoutPercentages.map((layout) => (
                  <Tooltip
                    key={layout.layoutKey}
                    title={`${layout.displayName}: ${layout.count} ascents (${layout.percentage}%)`}
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
                  </Tooltip>
                ))}
              </div>
              <div className={styles.percentageLegend}>
                {statisticsSummary.layoutPercentages.map((layout) => (
                  <div key={layout.layoutKey} className={styles.legendItem}>
                    <div
                      className={styles.legendColor}
                      style={{ backgroundColor: layout.color }}
                    />
                    <Text className={styles.legendText}>
                      {layout.displayName} ({layout.percentage}%)
                    </Text>
                  </div>
                ))}
              </div>
            </div>

            {/* Grade Blocks by Layout */}
            <div className={styles.gradeBlocksContainer}>
              <Text strong className={styles.gradeBlocksTitle}>Grades by Board</Text>
              {statisticsSummary.layoutPercentages.map((layout) => (
                <div key={layout.layoutKey} className={styles.layoutGradeRow}>
                  <div className={styles.layoutGradeHeader}>
                    <div
                      className={styles.layoutIndicator}
                      style={{ backgroundColor: layout.color }}
                    />
                    <Text className={styles.layoutName}>{layout.displayName}</Text>
                    <Text type="secondary" className={styles.layoutCount}>
                      {layout.count} ascents
                    </Text>
                  </div>
                  <div className={styles.gradeBlocks}>
                    {Object.entries(layout.grades)
                      .sort((a, b) => {
                        const gradeOrder = Object.values(difficultyMapping);
                        return gradeOrder.indexOf(a[0]) - gradeOrder.indexOf(b[0]);
                      })
                      .map(([grade, count]) => (
                        <Tooltip
                          key={grade}
                          title={`${grade}: ${count} ascent${count !== 1 ? 's' : ''}`}
                        >
                          <div
                            className={styles.gradeBlock}
                            style={{ backgroundColor: gradeColors[grade] || '#ccc' }}
                          >
                            <span className={styles.gradeBlockLabel}>{grade}</span>
                            <span className={styles.gradeBlockCount}>{count}</span>
                          </div>
                        </Tooltip>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Aggregated Stats - All Boards */}
        <Card className={styles.statsCard}>
          <Title level={5}>Ascents by Grade</Title>
          <Text type="secondary" className={styles.chartDescription}>
            Total ascents by board layout
          </Text>

          <div className={styles.timeframeSelector}>
            <Segmented
              options={aggregatedTimeframeOptions}
              value={aggregatedTimeframe}
              onChange={(value) => setAggregatedTimeframe(value as AggregatedTimeframeType)}
            />
          </div>

          {loadingAggregated ? (
            <div className={styles.loadingStats}>
              <Spin />
            </div>
          ) : !chartDataAggregated ? (
            <Empty description="No ascent data for this period" />
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
        </Card>

        {/* Board-Specific Stats */}
        <Card className={styles.statsCard}>
          <Title level={5}>Board Stats</Title>

          <>
            {/* Board Selector */}
            <div className={styles.boardSelector}>
              <Segmented
                options={boardOptions}
                value={selectedBoard}
                onChange={(value) => setSelectedBoard(value as string)}
              />
            </div>

            {/* Timeframe Selector */}
            <div className={styles.timeframeSelector}>
              <Segmented
                options={timeframeOptions}
                value={timeframe}
                onChange={(value) => setTimeframe(value as TimeframeType)}
              />
            </div>

            {timeframe === 'custom' && (
              <div className={styles.customDateRange}>
                <Space>
                  <Text>From:</Text>
                  <DatePicker
                    value={fromDate ? dayjs(fromDate) : null}
                    onChange={(date) => setFromDate(date ? date.format('YYYY-MM-DD') : '')}
                  />
                  <Text>To:</Text>
                  <DatePicker
                    value={toDate ? dayjs(toDate) : null}
                    onChange={(date) => setToDate(date ? date.format('YYYY-MM-DD') : '')}
                  />
                </Space>
              </div>
            )}

            {loadingStats ? (
              <div className={styles.loadingStats}>
                <Spin />
              </div>
            ) : filteredLogbook.length === 0 ? (
              <Empty description="No climbing data for this period" />
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
        </Card>

        {/* Recent Ascents Feed */}
        <Card className={styles.statsCard}>
          <Title level={5}>Recent Activity</Title>
          <Text type="secondary" className={styles.chartDescription}>
            Latest ascents and attempts
          </Text>
          <AscentsFeed userId={userId} pageSize={10} />
        </Card>
      </Content>
    </Layout>
  );
}
