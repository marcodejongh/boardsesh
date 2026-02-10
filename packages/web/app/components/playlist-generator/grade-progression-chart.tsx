'use client';

import React, { useMemo } from 'react';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { PlannedClimbSlot } from './types';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './grade-progression-chart.module.css';

interface GradeProgressionChartProps {
  plannedSlots: PlannedClimbSlot[];
  height?: number;
}

const GradeProgressionChart: React.FC<GradeProgressionChartProps> = ({
  plannedSlots,
  height = 120,
}) => {
  const chartData = useMemo(() => {
    if (plannedSlots.length === 0) {
      return { points: [], minGrade: 10, maxGrade: 20, gradeLabels: [] };
    }

    const grades = plannedSlots.map((slot) => slot.grade);
    const minGrade = Math.min(...grades);
    const maxGrade = Math.max(...grades);

    // Add some padding to the range
    const paddedMin = Math.max(10, minGrade - 1);
    const paddedMax = Math.min(33, maxGrade + 1);
    const gradeRange = paddedMax - paddedMin || 1;

    // Get grade labels for Y axis
    const gradeLabels = TENSION_KILTER_GRADES.filter(
      (g) => g.difficulty_id >= paddedMin && g.difficulty_id <= paddedMax
    );

    // Generate points for the line chart
    const padding = { left: 60, right: 20, top: 10, bottom: 10 };
    const chartWidth = 100; // percentage based

    const points = plannedSlots.map((slot, index) => {
      const x = padding.left + ((chartWidth - padding.left - padding.right) * index) / Math.max(1, plannedSlots.length - 1);
      const y = padding.top + ((height - padding.top - padding.bottom) * (paddedMax - slot.grade)) / gradeRange;
      return { x, y, grade: slot.grade, section: slot.section };
    });

    return { points, minGrade: paddedMin, maxGrade: paddedMax, gradeLabels };
  }, [plannedSlots, height]);

  if (plannedSlots.length === 0) {
    return (
      <div className={styles.emptyChart} style={{ height }}>
        <span className={styles.emptyText}>Configure options to preview</span>
      </div>
    );
  }

  const { points, minGrade, maxGrade, gradeLabels } = chartData;
  const gradeRange = maxGrade - minGrade || 1;

  // Create SVG path for the line
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div className={styles.chartContainer}>
      {/* Y-axis labels */}
      <div className={styles.yAxis}>
        {gradeLabels.filter((_, i, arr) => {
          // Show fewer labels on small screens
          const step = arr.length > 6 ? 2 : 1;
          return i % step === 0 || i === arr.length - 1;
        }).reverse().map((grade) => {
          const yPercent = ((maxGrade - grade.difficulty_id) / gradeRange) * 100;
          return (
            <div
              key={grade.difficulty_id}
              className={styles.yLabel}
              style={{ top: `${yPercent}%` }}
            >
              {grade.difficulty_name}
            </div>
          );
        })}
      </div>

      {/* Chart area */}
      <div className={styles.chartArea}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className={styles.svg}
        >
          {/* Grid lines */}
          {gradeLabels.filter((_, i, arr) => {
            const step = arr.length > 6 ? 2 : 1;
            return i % step === 0 || i === arr.length - 1;
          }).map((grade) => {
            const y = 10 + ((height - 20) * (maxGrade - grade.difficulty_id)) / gradeRange;
            return (
              <line
                key={grade.difficulty_id}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke={'var(--neutral-200)'}
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={themeTokens.colors.primary}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={'var(--semantic-surface)'}
              stroke={themeTokens.colors.primary}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export default GradeProgressionChart;
