import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically load ApexCharts for client-side rendering only
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Define the shape of weekly data
type WeeklyData = {
  weekEnding: string;
  hoursPlanned: number;
  hoursActual: number;
};

interface HoursTrackingChartProps {
  data: WeeklyData[];
}

const HoursTrackingChart: React.FC<HoursTrackingChartProps> = ({ data }) => {
  // Prepare categories and series data
  const categories = data.map(d => d.weekEnding);
  const plannedSeries = data.map(d => d.hoursPlanned);
  const actualSeries = data.map(d => d.hoursActual);

  const options = {
    chart: { id: 'hours-tracking', toolbar: { show: false } },
    xaxis: { categories },
    yaxis: { title: { text: 'Hours' } },
    stroke: { curve: 'smooth' },
    colors: ['#1E40AF', '#EF4444'],
    markers: { size: 4 },
    legend: { position: 'top' },
  };

  const series = [
    { name: 'Planned Hours', data: plannedSeries },
    { name: 'Actual Hours', data: actualSeries },
  ];

  return (
    <ReactApexChart
      options={options}
      series={series}
      type="line"
      height={350}
    />
  );
};

export default HoursTrackingChart;
