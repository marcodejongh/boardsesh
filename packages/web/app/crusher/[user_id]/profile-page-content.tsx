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
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import styles from './profile-page.module.css';
import type { ChartData } from './profile-stats-charts';

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
  } | null;
}

interface LogbookEntry {
  climbed_at: string;
  difficulty: number | null;
  tries: number;
  angle: number;
  status?: 'flash' | 'send' | 'attempt';
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

// Board types available in Boardsesh
const BOARD_TYPES = ['kilter', 'tension'] as const;

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

  // Fetch ticks from local database
  const fetchLogbook = useCallback(async (boardType: string) => {
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/internal/ticks/user/${userId}?boardType=${boardType}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ticks: ${response.status}`);
      }
      const data = await response.json();
      setLogbook(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching ticks:', error);
      message.error('Failed to load climbing stats');
      setLogbook([]);
    } finally {
      setLoadingStats(false);
    }
  }, [userId]);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
            </div>
          </div>
        </Card>

        {/* Stats Section */}
        <Card className={styles.statsCard}>
          <Title level={5}>Climbing Stats</Title>

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
                  chartDataWeeklyBar={chartDataWeeklyBar}
                  chartDataBar={chartDataBar}
                  chartDataPie={chartDataPie}
                />
              </div>
            )}
          </>
        </Card>
      </Content>
    </Layout>
  );
}
