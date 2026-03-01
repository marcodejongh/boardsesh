'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import './chart-registry'; // Ensure Chart.js components are registered
import { extractVGrade } from '@/app/lib/grade-colors';

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
  /** Compact mode for feed cards: smaller fonts, no legend/tooltips */
  compact?: boolean;
  /** Include attempt bars */
  showAttempts?: boolean;
  /** Stack bars */
  stacked?: boolean;
}

/**
 * Format a grade string to a V-grade label for chart display.
 * When multiple Font grades share the same V-grade (e.g., "6c/V5" and "6c+/V5"),
 * the harder variant is labeled with "+" (e.g., "V5+").
 */
export function formatGradeLabels(grades: string[]): string[] {
  const vGrades = grades.map((g) => extractVGrade(g));

  return grades.map((grade, i) => {
    const vGrade = vGrades[i];
    if (!vGrade) return grade;

    // Check if another grade in the list shares the same V-grade
    const sameVGradeIndices = vGrades
      .map((v, idx) => (v === vGrade ? idx : -1))
      .filter((idx) => idx !== -1);

    if (sameVGradeIndices.length > 1 && i > sameVGradeIndices[0]) {
      return `${vGrade}+`;
    }

    return vGrade;
  });
}

// Match profile page "Ascents by Difficulty" colors
const FLASH_COLOR = 'rgba(75,192,192,0.5)';
const SEND_COLOR = 'rgba(192,75,75,0.5)';
const ATTEMPT_COLOR = 'rgba(158,158,158,0.5)';

export default function GradeDistributionBar({
  gradeDistribution,
  height = 200,
  compact = false,
  showAttempts = true,
  stacked = true,
}: GradeDistributionBarProps) {
  if (gradeDistribution.length === 0) return null;

  // Data comes sorted hardest-first from backend; reverse to show lowest→highest on x-axis
  const sorted = [...gradeDistribution].reverse();

  const labels = formatGradeLabels(sorted.map((g) => g.grade));

  // In compact mode, use near-full width bars for a dense chart
  const barPct = compact ? 0.95 : 0.8;
  const catPct = compact ? 0.95 : 0.8;

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
      data: sorted.map((g) => g.flash ?? 0),
      backgroundColor: FLASH_COLOR,
      borderRadius: compact ? 1 : 2,
      barPercentage: barPct,
      categoryPercentage: catPct,
    },
    {
      label: 'Redpoint',
      data: sorted.map((g) => g.send ?? (g.count ?? 0)),
      backgroundColor: SEND_COLOR,
      borderRadius: compact ? 1 : 2,
      barPercentage: barPct,
      categoryPercentage: catPct,
    },
  ];

  if (showAttempts) {
    datasets.push({
      label: 'Attempt',
      data: sorted.map((g) => g.attempt ?? 0),
      backgroundColor: ATTEMPT_COLOR,
      borderRadius: compact ? 1 : 2,
      barPercentage: barPct,
      categoryPercentage: catPct,
    });
  }

  const data = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !compact,
        position: 'top' as const,
        ...(compact && { labels: { font: { size: 9 } } }),
      },
      title: {
        display: !compact,
        text: 'Ascents by Difficulty',
      },
      tooltip: {
        enabled: !compact,
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        stacked,
        ticks: compact ? { font: { size: 9 } } : undefined,
      },
      y: {
        stacked,
        display: !compact,
        beginAtZero: true,
      },
    },
    ...(compact && { layout: { padding: 0 } }),
  };

  return (
    <div data-testid="grade-distribution-bar" style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
}
