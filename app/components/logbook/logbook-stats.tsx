import React, { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, TooltipItem } from 'chart.js';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const optionsBar = {
  responsive: true,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Ascents by Difficulty (Stacked)',
    },
  },
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
    },
  },
};

const optionsPie = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Route Count by Angle',
    },
  },
};

const optionsWeeklyBar = {
  responsive: true,
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
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
    },
  },
};

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
  '4a': 'rgba(153,255,153,0.7)',  // Light Green
  '4b': 'rgba(179,255,128,0.7)',  // Soft Green-Yellow
  '4c': 'rgba(204,255,102,0.7)',  // Yellow-Green
  '5a': 'rgba(230,255,77,0.7)',   // Yellowish
  '5b': 'rgba(255,255,51,0.7)',   // Yellow
  '5c': 'rgba(255,230,25,0.7)',   // Dark Yellow
  '6a': 'rgba(255,204,51,0.7)',   // Golden Yellow
  '6a+': 'rgba(255,179,77,0.7)',  // Light Orange
  '6b': 'rgba(255,153,102,0.7)',  // Orange
  '6b+': 'rgba(255,128,128,0.7)', // Peachy Red
  '6c': 'rgba(204,102,204,0.7)',  // Light Violet
  '6c+': 'rgba(153,102,255,0.7)', // Indigo
  '7a': 'rgba(102,102,255,0.7)',  // Blue
  '7a+': 'rgba(77,128,255,0.7)',  // Light Blue
  '7b': 'rgba(51,153,255,0.7)',   // Sky Blue
  '7b+': 'rgba(25,179,255,0.7)',  // Cyan
  '7c': 'rgba(25,204,230,0.7)',   // Light Cyan
  '7c+': 'rgba(51,204,204,0.7)',  // Blue-Green
  '8a': 'rgba(255,77,77,0.7)',    // Red
  '8a+': 'rgba(204,51,153,0.7)',  // Deep Magenta
  '8b': 'rgba(153,51,204,0.9)',   // Purple
  '8b+': 'rgba(102,51,153,1)',    // Dark Purple
  '8c': 'rgba(77,25,128,1)',      // Very Dark Purple
  '8c+': 'rgba(51,0,102,1)',      // Deep Violet
};

// Define types for logbook entries
interface LogbookEntry {
  climbed_at: string;
  difficulty: number;
  tries: number;
  angle: number;
}

// Define types for chart data
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
  }[];
}

export const LogBookStats: React.FC<{ boardName: string; userId: string }> = ({ boardName, userId }) => {
  const [logbook, setLogbook] = useState<LogbookEntry[]>([]);
  const [chartDataBar, setChartDataBar] = useState<ChartData | null>(null);
  const [chartDataPie, setChartDataPie] = useState<ChartData | null>(null);
  const [chartDataWeeklyBar, setChartDataWeeklyBar] = useState<ChartData | null>(null);
  const [timeframe, setTimeframe] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  useEffect(() => {
    const fetchLogbook = async () => {
      if (!boardName || !userId) return;
      try {
        const response = await fetch(`/api/v1/${boardName}/proxy/getLogbook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, climbUuids: "", }),
        });
        const data = await response.json();
        setLogbook(data);
      } catch (error) {
        console.error('Error fetching logbook:', error);
      }
    };
    fetchLogbook();
  }, [boardName, userId]);

  const filterLogbookByTimeframe = (logbook: LogbookEntry[]) => {
    const now = dayjs();
    switch (timeframe) {
      case 'lastWeek':
        return logbook.filter(entry => dayjs(entry.climbed_at).isAfter(now.subtract(1, 'week')));
      case 'lastMonth':
        return logbook.filter(entry => dayjs(entry.climbed_at).isAfter(now.subtract(1, 'month')));
      case 'lastYear':
        return logbook.filter(entry => dayjs(entry.climbed_at).isAfter(now.subtract(1, 'year')));
      case 'custom':
        return logbook.filter(entry => {
          const climbedAt = dayjs(entry.climbed_at);
          return climbedAt.isAfter(dayjs(fromDate)) && climbedAt.isBefore(dayjs(toDate));
        });
      case 'all':
      default:
        return logbook;
    }
  };

  const filteredLogbook = filterLogbookByTimeframe(logbook);

  useEffect(() => {
    if (filteredLogbook.length > 0) {
      const greaterThanOne: Record<string, number> = {};
      const equalToOne: Record<string, number> = {};
      filteredLogbook.forEach((entry) => {
        const difficulty = difficultyMapping[entry.difficulty];
        if (entry.tries > 1) {
          greaterThanOne[difficulty] = (greaterThanOne[difficulty] || 0) + entry.tries;
        } else if (entry.tries === 1) {
          equalToOne[difficulty] = (equalToOne[difficulty] || 0) + 1;
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
    }
  }, [filteredLogbook]);

  useEffect(() => {
    if (filteredLogbook.length > 0) {
      const angles = filteredLogbook.reduce((acc: Record<string, number>, entry) => {
        const angle = `${entry.angle}°`;
        acc[angle] = (acc[angle] || 0) + 1;
        return acc;
      }, {});

      setChartDataPie({
        labels: Object.keys(angles),
        datasets: [
          {
            label: 'Routes by Angle',
            data: Object.values(angles),
            backgroundColor: Object.keys(angles).map((_, index) => {
              const angleColors = [
                'rgba(255,77,77,0.7)',    // Red
                'rgba(51,0,102,1)',       // Deep Violet
                'rgba(77,128,255,0.7)',   // Light Blue
                'rgba(255,204,51,0.7)',   // Golden Yellow
                'rgba(204,51,153,0.7)',   // Deep Magenta
                'rgba(51,204,204,0.7)',   // Blue-Green
                'rgba(255,230,25,0.7)',   // Dark Yellow
                'rgba(102,102,255,0.7)',  // Blue
                'rgba(51,153,255,0.7)',   // Sky Blue
                'rgba(25,179,255,0.7)',   // Cyan
                'rgba(255,255,51,0.7)',   // Yellow
                'rgba(102,51,153,1)',     // Dark Purple
                'rgba(179,255,128,0.7)',  // Soft Green-Yellow
              ];
              return angleColors[index] || 'rgba(200,200,200,0.7)';
            }),
          },
        ],
      });
    }
  }, [filteredLogbook]);

  useEffect(() => {
    if (filteredLogbook.length > 0) {
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
        weeklyData[week] = {
          ...(weeklyData[week] || {}),
          [difficulty]: (weeklyData[week]?.[difficulty] || 0) + 1,
        };
      });
      const datasets = Object.values(difficultyMapping).map((difficulty) => {
        const data = weeks.map((week) => weeklyData[week]?.[difficulty] || 0);
        return {
          label: difficulty,
          data,
          backgroundColor: gradeColors[difficulty],
        };
      }).filter(dataset => dataset.data.some(value => value > 0)); // Ensure datasets with all zero values are filtered out

      setChartDataWeeklyBar({
        labels: weeks,
        datasets,
      });
    }
  }, [filteredLogbook]);
  
  const buttonStyle = (btnTimeframe: string) => ({
    marginRight: '10px',
    backgroundColor: timeframe === btnTimeframe ? '#007bff' : '#f8f9fa',
    color: timeframe === btnTimeframe ? '#fff' : '#000',
    border: '1px solid #007bff',
    padding: '5px 10px',
    cursor: 'pointer',
  });

  return (
    <div style={{ width: '80%', margin: '0 auto', padding: '20px' }}>
      <h3>LogBook Stats</h3>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setTimeframe('all')} style={buttonStyle('all')}>All</button>
        <button onClick={() => setTimeframe('lastYear')} style={buttonStyle('lastYear')}>Last Year</button>
        <button onClick={() => setTimeframe('lastMonth')} style={buttonStyle('lastMonth')}>Last Month</button>
        <button onClick={() => setTimeframe('lastWeek')} style={buttonStyle('lastWeek')}>Last Week</button>
        <button onClick={() => setTimeframe('custom')} style={buttonStyle('custom')}>Select Timeframe</button>
        {timeframe === 'custom' && (
          <div style={{ marginTop: '10px' }}>
            <label>
              From: <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label style={{ marginLeft: '10px' }}>
              To: <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
          </div>
        )}
      </div>
      <div style={{ height: '600px', marginBottom: '40px' }}>
        {chartDataWeeklyBar ? (
          <Bar data={chartDataWeeklyBar} options={{ ...optionsWeeklyBar, maintainAspectRatio: false }} />
        ) : (
          <p>Loading weekly bar chart...</p>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', height: '400px' }}>
        <div style={{ width: '60%' }}>
          {chartDataBar ? (
            <Bar data={chartDataBar} options={{ ...optionsBar, maintainAspectRatio: false }} />
          ) : (
            <p>Loading bar chart...</p>
          )}
        </div>
        <div style={{ width: '40%' }}>
          {chartDataPie ? (
            <Pie data={chartDataPie} options={{ ...optionsPie, maintainAspectRatio: false }} />
          ) : (
            <p>Loading pie chart...</p>
          )}
        </div>
      </div>
    </div>
  );
};
