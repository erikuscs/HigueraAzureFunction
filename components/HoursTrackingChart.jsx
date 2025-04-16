import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const HoursTrackingChart = ({ hoursData }) => {
  if (!hoursData || !hoursData.weeklyHours) {
    return <div>No hours tracking data available</div>;
  }

  // Calculate trend line for projection
  const completedWeeks = hoursData.weeklyHours.filter(week => week.hoursActual > 0);
  const lastActualWeek = completedWeeks[completedWeeks.length - 1];
  
  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Add projected completion line
  const chartData = [...hoursData.weeklyHours];
  
  // Add projected end date point for trend line
  chartData.push({
    weekEnding: hoursData.projectedEndDate,
    cumulativeActual: hoursData.totalHoursAllocated,
    isProjected: true
  });

  return (
    <div className="hours-tracking-container">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Hours Tracking & Projection</h3>
          <p className="text-sm text-gray-500">
            Planned completion: {formatDate(hoursData.plannedEndDate)} | 
            Projected completion: {formatDate(hoursData.projectedEndDate)}
          </p>
        </div>
        <div className="stats-box grid grid-cols-3 gap-3 text-sm">
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-medium">Hours Used</div>
            <div className="text-xl">{hoursData.totalHoursUsed.toLocaleString()}</div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-medium">Remaining</div>
            <div className="text-xl">{hoursData.completionMetrics.hoursRemaining.toLocaleString()}</div>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-medium">% Complete</div>
            <div className="text-xl">{hoursData.completionMetrics.percentageComplete}%</div>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="weekEnding" 
            tickFormatter={formatDate}
          />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => [
              value.toLocaleString(), 
              name === 'cumulativePlanned' ? 'Planned Hours' : 'Actual Hours'
            ]}
            labelFormatter={(label) => `Week Ending: ${formatDate(label)}`}
          />
          <Legend />
          <ReferenceLine 
            x={hoursData.plannedEndDate} 
            stroke="red" 
            label={{ value: 'Planned End', position: 'top' }} 
            strokeDasharray="3 3"
          />
          <ReferenceLine 
            x={hoursData.projectedEndDate} 
            stroke="orange" 
            label={{ value: 'Projected End', position: 'top' }} 
            strokeDasharray="3 3"
          />
          <Line 
            type="monotone" 
            dataKey="cumulativePlanned" 
            stroke="#8884d8" 
            activeDot={{ r: 8 }} 
            name="Planned Hours"
          />
          <Line 
            type="monotone" 
            dataKey="cumulativeActual" 
            stroke="#82ca9d" 
            activeDot={{ r: 8 }} 
            name="Actual Hours"
            strokeDasharray={(d) => d.isProjected ? "5 5" : "0"}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="border p-3 rounded shadow-sm">
          <h4 className="font-medium">Burn Rate (hrs/week)</h4>
          <div className="flex justify-between mt-1">
            <div>Planned: <span className="font-medium">{hoursData.completionMetrics.plannedBurndownRate}</span></div>
            <div>Actual: <span className="font-medium">{hoursData.completionMetrics.burndownRate.toFixed(1)}</span></div>
          </div>
        </div>
        <div className="border p-3 rounded shadow-sm">
          <h4 className="font-medium">Schedule Variance</h4>
          <div className="mt-1">
            {(() => {
              const days = (new Date(hoursData.projectedEndDate) - new Date(hoursData.plannedEndDate)) / (1000 * 60 * 60 * 24);
              return (
                <span className={days > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                  {days > 0 ? `${Math.round(days)} days behind` : `${Math.abs(Math.round(days))} days ahead`}
                </span>
              );
            })()}
          </div>
        </div>
        <div className="border p-3 rounded shadow-sm">
          <h4 className="font-medium">Estimated Completion</h4>
          <div className="mt-1">
            <span>{new Date(hoursData.projectedEndDate).toLocaleDateString()}</span>
            <span className="block text-xs text-gray-500 mt-1">
              {hoursData.completionMetrics.estimatedWeeksRemaining.toFixed(1)} weeks remaining
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoursTrackingChart;