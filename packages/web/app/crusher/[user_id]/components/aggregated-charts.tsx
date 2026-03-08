'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import CircularProgress from '@mui/material/CircularProgress';
import { EmptyState } from '@/app/components/ui/empty-state';
import type { ChartData } from '../profile-stats-charts';
import { type AggregatedTimeframeType, aggregatedTimeframeOptions } from '../utils/profile-constants';
import styles from '../profile-page.module.css';

const ProfileStatsCharts = dynamic(() => import('../profile-stats-charts'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingStats}>
      <CircularProgress />
    </div>
  ),
});

interface AggregatedChartsProps {
  aggregatedTimeframe: AggregatedTimeframeType;
  onTimeframeChange: (value: AggregatedTimeframeType) => void;
  loadingAggregated: boolean;
  chartDataAggregated: ChartData | null;
}

export default function AggregatedCharts({
  aggregatedTimeframe,
  onTimeframeChange,
  loadingAggregated,
  chartDataAggregated,
}: AggregatedChartsProps) {
  return (
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
          onChange={(_, val) => { if (val) onTimeframeChange(val as AggregatedTimeframeType); }}
        >
          {aggregatedTimeframeOptions.map((opt) => (
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
  );
}
