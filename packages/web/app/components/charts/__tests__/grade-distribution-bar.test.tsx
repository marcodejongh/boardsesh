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

import GradeDistributionBar from '../grade-distribution-bar';

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
});
