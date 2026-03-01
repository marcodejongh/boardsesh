import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock chart.js and react-chartjs-2 since they use canvas
vi.mock('react-chartjs-2', () => ({
  Bar: (props: { data: unknown }) => (
    <div data-testid="chart-bar" data-data={JSON.stringify(props.data)} />
  ),
}));

vi.mock('../chart-registry', () => ({}));

import GradeDistributionBar, { formatGradeLabels } from '../grade-distribution-bar';

describe('formatGradeLabels', () => {
  it('extracts V-grade from combined Font/V-grade strings', () => {
    expect(formatGradeLabels(['6a/V3', '6b/V4'])).toEqual(['V3', 'V4']);
  });

  it('passes through bare V-grade strings', () => {
    expect(formatGradeLabels(['V3', 'V5'])).toEqual(['V3', 'V5']);
  });

  it('adds "+" when two Font grades share the same V-grade', () => {
    expect(formatGradeLabels(['6c/V5', '6c+/V5'])).toEqual(['V5', 'V5+']);
  });

  it('handles mix of single and dual Font grades per V-grade', () => {
    expect(formatGradeLabels(['5c/V2', '6a/V3', '6a+/V3', '6b/V4'])).toEqual([
      'V2', 'V3', 'V3+', 'V4',
    ]);
  });

  it('falls back to original string when no V-grade is found', () => {
    expect(formatGradeLabels(['6A', '7A+'])).toEqual(['6A', '7A+']);
  });

  it('returns V-grade without "+" for single-entry V-grades', () => {
    // 7a+ is the only grade for V7, so it should not get "+"
    expect(formatGradeLabels(['7a/V6', '7a+/V7'])).toEqual(['V6', 'V7']);
  });

  it('handles empty array', () => {
    expect(formatGradeLabels([])).toEqual([]);
  });

  it('handles numeric-only grades that lack V prefix', () => {
    expect(formatGradeLabels(['0', '1', '2'])).toEqual(['0', '1', '2']);
  });
});

describe('GradeDistributionBar', () => {
  it('renders with data', () => {
    const gradeDistribution = [
      { grade: 'V3', flash: 2, send: 3, attempt: 1 },
      { grade: 'V5', flash: 1, send: 1, attempt: 0 },
    ];

    render(<GradeDistributionBar gradeDistribution={gradeDistribution} />);
    expect(screen.getByTestId('grade-distribution-bar')).toBeTruthy();
    expect(screen.getByTestId('chart-bar')).toBeTruthy();
  });

  it('returns null for empty data', () => {
    const { container } = render(<GradeDistributionBar gradeDistribution={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('passes compact options when compact=true', () => {
    const gradeDistribution = [{ grade: 'V3', flash: 1, send: 2, attempt: 0 }];

    render(<GradeDistributionBar gradeDistribution={gradeDistribution} compact />);
    expect(screen.getByTestId('chart-bar')).toBeTruthy();
  });

  it('includes attempt dataset when showAttempts=true', () => {
    const gradeDistribution = [{ grade: 'V3', flash: 1, send: 2, attempt: 3 }];

    render(<GradeDistributionBar gradeDistribution={gradeDistribution} showAttempts />);
    const chartEl = screen.getByTestId('chart-bar');
    const data = JSON.parse(chartEl.getAttribute('data-data') || '{}');
    expect(data.datasets).toHaveLength(3); // Flash, Send, Attempt
    expect(data.datasets[2].label).toBe('Attempt');
    expect(data.datasets[2].data).toEqual([3]);
  });

  it('excludes attempt dataset when showAttempts=false', () => {
    const gradeDistribution = [{ grade: 'V3', flash: 1, send: 2, attempt: 3 }];

    render(<GradeDistributionBar gradeDistribution={gradeDistribution} showAttempts={false} />);
    const chartEl = screen.getByTestId('chart-bar');
    const data = JSON.parse(chartEl.getAttribute('data-data') || '{}');
    expect(data.datasets).toHaveLength(2); // Flash, Send only
  });

  it('renders V-grade labels on x-axis from combined Font/V-grade strings', () => {
    const gradeDistribution = [
      { grade: '6a+/V3', flash: 1, send: 1, attempt: 0 },
      { grade: '6a/V3', flash: 2, send: 3, attempt: 1 },
    ];

    render(<GradeDistributionBar gradeDistribution={gradeDistribution} />);
    const chartEl = screen.getByTestId('chart-bar');
    const data = JSON.parse(chartEl.getAttribute('data-data') || '{}');
    // Data is reversed (hardest-first → easiest-first), so 6a/V3 comes before 6a+/V3
    expect(data.labels).toEqual(['V3', 'V3+']);
  });

  it('renders V-grade labels for single-entry V-grades without "+"', () => {
    const gradeDistribution = [
      { grade: '7a+/V7', flash: 0, send: 1, attempt: 0 },
      { grade: '7a/V6', flash: 1, send: 0, attempt: 0 },
    ];

    render(<GradeDistributionBar gradeDistribution={gradeDistribution} />);
    const chartEl = screen.getByTestId('chart-bar');
    const data = JSON.parse(chartEl.getAttribute('data-data') || '{}');
    // Reversed: V6 first, V7 second — each is the only grade at its level
    expect(data.labels).toEqual(['V6', 'V7']);
  });
});
