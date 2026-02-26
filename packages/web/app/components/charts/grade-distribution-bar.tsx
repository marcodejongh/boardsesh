'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Bar } from 'react-chartjs-2';
import './chart-registry'; // Ensure Chart.js components are registered
import { getGradeColor, getGradeTextColor } from '@/app/lib/grade-colors';
import { themeTokens } from '@/app/theme/theme-config';

export interface GradeDistributionItem {
  grade: string;
  flash?: number;
  send?: number;
  attempt?: number;
  count?: number;
}

interface GradeDistributionBarProps {
  gradeDistribution: GradeDistributionItem[];
  height?: number;
  /** Compact mode for feed cards: custom horizontal bar layout */
  compact?: boolean;
  /** Include attempt bars */
  showAttempts?: boolean;
  /** Stack bars */
  stacked?: boolean;
}

/** Compact horizontal bar row for feed cards */
function CompactGradeDistribution({
  gradeDistribution,
  showAttempts,
}: {
  gradeDistribution: GradeDistributionItem[];
  showAttempts: boolean;
}) {
  const maxCount = Math.max(
    ...gradeDistribution.map((g) => (g.flash ?? 0) + (g.send ?? g.count ?? 0) + (showAttempts ? (g.attempt ?? 0) : 0)),
    1,
  );

  return (
    <Box data-testid="grade-distribution-bar" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {gradeDistribution.map((g) => {
        const flash = g.flash ?? 0;
        const send = g.send ?? (g.count ?? 0);
        const attempt = showAttempts ? (g.attempt ?? 0) : 0;
        const total = flash + send + attempt;
        const gradeColor = getGradeColor(g.grade);
        const textColor = getGradeTextColor(gradeColor);

        return (
          <Box key={g.grade} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {/* Grade pill */}
            <Typography
              variant="caption"
              sx={{
                minWidth: 32,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: themeTokens.typography.fontSize.xs - 1,
                bgcolor: gradeColor || 'var(--neutral-200)',
                color: textColor,
                borderRadius: themeTokens.borderRadius.sm,
                px: 0.5,
                py: 0.125,
                lineHeight: 1.4,
              }}
            >
              {g.grade}
            </Typography>

            {/* Stacked bar */}
            <Box
              sx={{
                flex: 1,
                height: 8,
                bgcolor: 'var(--neutral-100)',
                borderRadius: themeTokens.borderRadius.sm,
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              {flash > 0 && (
                <Box
                  sx={{
                    width: `${(flash / maxCount) * 100}%`,
                    height: '100%',
                    bgcolor: themeTokens.colors.amber,
                  }}
                />
              )}
              {send > 0 && (
                <Box
                  sx={{
                    width: `${(send / maxCount) * 100}%`,
                    height: '100%',
                    bgcolor: themeTokens.colors.success,
                  }}
                />
              )}
              {attempt > 0 && (
                <Box
                  sx={{
                    width: `${(attempt / maxCount) * 100}%`,
                    height: '100%',
                    bgcolor: 'var(--neutral-300)',
                  }}
                />
              )}
            </Box>

            {/* Count */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ minWidth: 16, textAlign: 'right', fontSize: themeTokens.typography.fontSize.xs - 1 }}
            >
              {total}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default function GradeDistributionBar({
  gradeDistribution,
  height = 200,
  compact = false,
  showAttempts = true,
  stacked = true,
}: GradeDistributionBarProps) {
  if (gradeDistribution.length === 0) return null;

  // Use custom compact layout for feed cards
  if (compact) {
    return <CompactGradeDistribution gradeDistribution={gradeDistribution} showAttempts={showAttempts} />;
  }

  const labels = gradeDistribution.map((g) => g.grade);

  const datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderRadius?: number;
    barPercentage?: number;
    categoryPercentage?: number;
  }> = [
    {
      label: 'Flash',
      data: gradeDistribution.map((g) => g.flash ?? 0),
      backgroundColor: themeTokens.colors.amber,
      borderRadius: 2,
      barPercentage: 0.8,
      categoryPercentage: 0.8,
    },
    {
      label: 'Send',
      data: gradeDistribution.map((g) => g.send ?? (g.count ?? 0)),
      backgroundColor: themeTokens.colors.success,
      borderRadius: 2,
      barPercentage: 0.8,
      categoryPercentage: 0.8,
    },
  ];

  if (showAttempts) {
    datasets.push({
      label: 'Attempt',
      data: gradeDistribution.map((g) => g.attempt ?? 0),
      backgroundColor: themeTokens.neutral[300],
      borderRadius: 2,
      barPercentage: 0.8,
      categoryPercentage: 0.8,
    });
  }

  const data = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        stacked,
        display: true,
      },
      y: {
        stacked,
        display: true,
        beginAtZero: true,
      },
    },
  };

  return (
    <div data-testid="grade-distribution-bar" style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
}
