import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock chart.js and react-chartjs-2 since they use canvas
vi.mock('react-chartjs-2', () => ({
  Doughnut: (props: { data: unknown }) => (
    <div data-testid="chart-doughnut" data-data={JSON.stringify(props.data)} />
  ),
}));

vi.mock('../chart-registry', () => ({}));

import OutcomeDoughnut from '../outcome-doughnut';

describe('OutcomeDoughnut', () => {
  it('renders with data', () => {
    render(<OutcomeDoughnut flashes={3} sends={5} attempts={2} />);
    expect(screen.getByTestId('outcome-doughnut')).toBeTruthy();
    expect(screen.getByTestId('chart-doughnut')).toBeTruthy();
  });

  it('returns null when all values are zero', () => {
    const { container } = render(<OutcomeDoughnut flashes={0} sends={0} attempts={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('passes correct data segments', () => {
    render(<OutcomeDoughnut flashes={3} sends={5} attempts={2} />);
    const chartEl = screen.getByTestId('chart-doughnut');
    const data = JSON.parse(chartEl.getAttribute('data-data') || '{}');
    expect(data.labels).toEqual(['Flash', 'Redpoint', 'Attempt']);
    expect(data.datasets[0].data).toEqual([3, 5, 2]);
  });

  it('renders when only some values are non-zero', () => {
    render(<OutcomeDoughnut flashes={0} sends={4} attempts={0} />);
    expect(screen.getByTestId('outcome-doughnut')).toBeTruthy();
    const chartEl = screen.getByTestId('chart-doughnut');
    const data = JSON.parse(chartEl.getAttribute('data-data') || '{}');
    expect(data.datasets[0].data).toEqual([0, 4, 0]);
  });
});
