import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const mockData = [
  { month: 'Jan', hours: 120, budget: 130 },
  { month: 'Feb', hours: 150, budget: 140 },
  { month: 'Mar', hours: 180, budget: 160 },
  { month: 'Apr', hours: 210, budget: 200 }
];

export default function HoursTrackingChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // In a real application, this would fetch data from an API
    // For now, we're using mock data
    const fetchData = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          setData(mockData);
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error('Error fetching hours data:', err);
        setError('Failed to load hours tracking data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) return <div className="flex justify-center items-center h-40">Loading chart data...</div>;
  if (error) return <div className="text-red-500 text-center h-40">Error: {error}</div>;
  
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => [
              `${value} hours`, 
              name.charAt(0).toUpperCase() + name.slice(1)
            ]}
          />
          <Legend />
          <Bar name="Actual Hours" dataKey="hours" fill="#3B82F6" />
          <Bar name="Budgeted Hours" dataKey="budget" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-500">Total Hours</p>
          <p className="text-xl font-bold">
            {data.reduce((sum, item) => sum + item.hours, 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Budgeted Hours</p>
          <p className="text-xl font-bold">
            {data.reduce((sum, item) => sum + item.budget, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}