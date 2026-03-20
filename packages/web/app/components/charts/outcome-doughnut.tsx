'use client';

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import './chart-registry';

const FLASH_COLOR = 'rgba(75,192,192,0.7)';
const SEND_COLOR = 'rgba(192,75,75,0.7)';
const ATTEMPT_COLOR = 'rgba(158,158,158,0.7)';

interface OutcomeDoughnutProps {
  flashes: number;
  sends: number;
  attempts: number;
  height?: number;
  /** Compact mode: no legend, no tooltips */
  compact?: boolean;
}

export default function OutcomeDoughnut({
  flashes,
  sends,
  attempts,
  height = 100,
  compact = false,
}: OutcomeDoughnutProps) {
  const total = flashes + sends + attempts;
  if (total === 0) return null;

  const data = {
    labels: ['Flash', 'Redpoint', 'Attempt'],
    datasets: [
      {
        data: [flashes, sends, attempts],
        backgroundColor: [FLASH_COLOR, SEND_COLOR, ATTEMPT_COLOR],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: { display: !compact },
      tooltip: { enabled: !compact },
    },
    ...(compact && { layout: { padding: 0 } }),
  };

  return (
    <div data-testid="outcome-doughnut" style={{ height }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}
