'use client';

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Avatar,
  Typography,
  Spin,
  Segmented,
  Empty,
  Space,
  Button,
  DatePicker,
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  ArcElement,
  TooltipItem,
} from 'chart.js';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import styles from './profile-page.module.css';

dayjs.extend(isoWeek);

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend, ArcElement);

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

interface AuroraCredential {
  boardType: string;
  auroraUsername: string;
  auroraUserId: number | null;
}

interface LogbookEntry {
  climbed_at: string;
  difficulty: number;
  tries: number;
  angle: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
  }[];
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

const optionsBar = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Ascents by Difficulty',
    },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true },
  },
};

const optionsPie = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Routes by Angle',
    },
  },
};

const optionsWeeklyBar = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Weekly Attempts by Difficulty',
    },
    tooltip: {
      callbacks: {
        label: function (context: TooltipItem<'bar'>) {
          const label = context.dataset.label || '';
          const value = (context.raw as number) || 0;
          return value > 0 ? `${label}: ${value}` : '';
        },
        footer: function (tooltipItems: TooltipItem<'bar'>[]) {
          let total = 0;
          tooltipItems.forEach((tooltipItem) => {
            total += (tooltipItem.raw as number) || 0;
          });
          return `Total: ${total}`;
        },
      },
      mode: 'index' as const,
      intersect: false,
    },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true },
  },
};

type TimeframeType = 'all' | 'lastYear' | 'lastMonth' | 'lastWeek' | 'custom';

export default function ProfilePageContent({ userId }: { userId: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credentials, setCredentials] = useState<AuroraCredential[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [logbook, setLogbook] = useState<LogbookEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeType>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [chartDataBar, setChartDataBar] = useState<ChartData | null>(null);
  const [chartDataPie, setChartDataPie] = useState<ChartData | null>(null);
  const [chartDataWeeklyBar, setChartDataWeeklyBar] = useState<ChartData | null>(null);

  const isOwnProfile = session?.user?.id === userId;

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Fetch profile and credentials on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfileAndCredentials();
    }
  }, [status]);

  const fetchProfileAndCredentials = async () => {
    try {
      const [profileRes, credentialsRes] = await Promise.all([
        fetch('/api/internal/profile'),
        fetch('/api/internal/aurora-credentials'),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }

      if (credentialsRes.ok) {
        const credentialsData = await credentialsRes.json();
        const creds = credentialsData.credentials || [];
        setCredentials(creds);

        // Auto-select first board with credentials
        if (creds.length > 0 && creds[0].auroraUserId) {
          setSelectedBoard(creds[0].boardType);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch logbook when board selection changes
  useEffect(() => {
    if (selectedBoard && credentials.length > 0) {
      const cred = credentials.find((c) => c.boardType === selectedBoard);
      if (cred?.auroraUserId) {
        fetchLogbook(selectedBoard, cred.auroraUserId.toString());
      }
    }
  }, [selectedBoard, credentials]);

  const fetchLogbook = async (boardName: string, auroraUserId: string) => {
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/v1/${boardName}/proxy/getLogbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: auroraUserId, climbUuids: '' }),
      });
      const data = await response.json();
      setLogbook(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching logbook:', error);
      setLogbook([]);
    } finally {
      setLoadingStats(false);
    }
  };

  const filterLogbookByTimeframe = (entries: LogbookEntry[]) => {
    const now = dayjs();
    switch (timeframe) {
      case 'lastWeek':
        return entries.filter((entry) => dayjs(entry.climbed_at).isAfter(now.subtract(1, 'week')));
      case 'lastMonth':
        return entries.filter((entry) => dayjs(entry.climbed_at).isAfter(now.subtract(1, 'month')));
      case 'lastYear':
        return entries.filter((entry) => dayjs(entry.climbed_at).isAfter(now.subtract(1, 'year')));
      case 'custom':
        return entries.filter((entry) => {
          const climbedAt = dayjs(entry.climbed_at);
          return climbedAt.isAfter(dayjs(fromDate)) && climbedAt.isBefore(dayjs(toDate));
        });
      case 'all':
      default:
        return entries;
    }
  };

  const filteredLogbook = filterLogbookByTimeframe(logbook);

  // Generate chart data when filtered logbook changes
  useEffect(() => {
    if (filteredLogbook.length > 0) {
      // Bar chart - Flash vs Redpoint
      const greaterThanOne: Record<string, number> = {};
      const equalToOne: Record<string, number> = {};
      filteredLogbook.forEach((entry) => {
        const difficulty = difficultyMapping[entry.difficulty];
        if (difficulty) {
          if (entry.tries > 1) {
            greaterThanOne[difficulty] = (greaterThanOne[difficulty] || 0) + entry.tries;
          } else if (entry.tries === 1) {
            equalToOne[difficulty] = (equalToOne[difficulty] || 0) + 1;
          }
        }
      });
      const labels = Object.keys({ ...greaterThanOne, ...equalToOne }).sort();
      setChartDataBar({
        labels,
        datasets: [
          {
            label: 'Flash',
            data: labels.map((label) => equalToOne[label] || 0),
            backgroundColor: 'rgba(75,192,192,0.5)',
          },
          {
            label: 'Redpoint',
            data: labels.map((label) => greaterThanOne[label] || 0),
            backgroundColor: 'rgba(192,75,75,0.5)',
          },
        ],
      });

      // Pie chart - Routes by Angle
      const angles = filteredLogbook.reduce((acc: Record<string, number>, entry) => {
        const angle = `${entry.angle}°`;
        acc[angle] = (acc[angle] || 0) + 1;
        return acc;
      }, {});
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
      setChartDataPie({
        labels: Object.keys(angles),
        datasets: [
          {
            label: 'Routes by Angle',
            data: Object.values(angles),
            backgroundColor: Object.keys(angles).map((_, index) => angleColors[index] || 'rgba(200,200,200,0.7)'),
          },
        ],
      });

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
      setChartDataWeeklyBar({
        labels: weeks,
        datasets,
      });
    } else {
      setChartDataBar(null);
      setChartDataPie(null);
      setChartDataWeeklyBar(null);
    }
  }, [filteredLogbook]);

  if (status === 'loading' || loading) {
    return (
      <Layout className={styles.layout}>
        <Content className={styles.loadingContent}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const displayName = profile?.profile?.displayName || profile?.name || 'Crusher';
  const avatarUrl = profile?.profile?.avatarUrl || profile?.image;

  const boardOptions = credentials
    .filter((c) => c.auroraUserId)
    .map((c) => ({
      label: c.boardType.charAt(0).toUpperCase() + c.boardType.slice(1),
      value: c.boardType,
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

          {boardOptions.length === 0 ? (
            <Empty
              description={
                <span>
                  No board accounts linked.{' '}
                  {isOwnProfile && (
                    <a href="/settings">Link your Aurora account</a>
                  )}
                </span>
              }
            />
          ) : (
            <>
              {/* Board Selector */}
              {boardOptions.length > 1 && (
                <div className={styles.boardSelector}>
                  <Segmented
                    options={boardOptions}
                    value={selectedBoard || ''}
                    onChange={(value) => setSelectedBoard(value as string)}
                  />
                </div>
              )}

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
                  {/* Weekly Chart */}
                  <div className={styles.chartWrapper}>
                    {chartDataWeeklyBar && (
                      <Bar data={chartDataWeeklyBar} options={optionsWeeklyBar} />
                    )}
                  </div>

                  {/* Bottom Charts Row */}
                  <div className={styles.bottomChartsRow}>
                    <div className={styles.barChartWrapper}>
                      {chartDataBar && (
                        <Bar data={chartDataBar} options={optionsBar} />
                      )}
                    </div>
                    <div className={styles.pieChartWrapper}>
                      {chartDataPie && (
                        <Pie data={chartDataPie} options={optionsPie} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
