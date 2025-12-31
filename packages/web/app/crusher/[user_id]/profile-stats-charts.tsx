'use client';

import React from 'react';
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

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend, ArcElement);

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
  }[];
}

interface ProfileStatsChartsProps {
  chartDataAggregated?: ChartData | null;
  chartDataWeeklyBar: ChartData | null;
  chartDataBar: ChartData | null;
  chartDataPie: ChartData | null;
}

const optionsAggregated = {
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
    x: {
      stacked: false,
      title: {
        display: true,
        text: 'Grade',
      },
    },
    y: {
      stacked: false,
      title: {
        display: true,
        text: 'Ascents',
      },
      beginAtZero: true,
    },
  },
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

export default function ProfileStatsCharts({
  chartDataAggregated,
  chartDataWeeklyBar,
  chartDataBar,
  chartDataPie,
}: ProfileStatsChartsProps) {
  return (
    <>
      {/* Aggregated Chart - Ascents by Grade stacked by Board */}
      {chartDataAggregated && (
        <div style={{ height: 350, marginBottom: 24 }}>
          <Bar data={chartDataAggregated} options={optionsAggregated} />
        </div>
      )}

      {/* Weekly Chart */}
      {chartDataWeeklyBar && (
        <div style={{ height: 400, marginBottom: 24 }}>
          <Bar data={chartDataWeeklyBar} options={optionsWeeklyBar} />
        </div>
      )}

      {/* Bottom Charts Row */}
      {(chartDataBar || chartDataPie) && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, height: 300 }}>
            {chartDataBar && (
              <Bar data={chartDataBar} options={optionsBar} />
            )}
          </div>
          <div style={{ flex: '0 0 280px', height: 300 }}>
            {chartDataPie && (
              <Pie data={chartDataPie} options={optionsPie} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
