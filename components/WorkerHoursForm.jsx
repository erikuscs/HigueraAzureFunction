import React, { useState } from 'react';
// Import the authService instance
import { authService } from "../lib/msalAuth";

const WorkerHoursForm = ({ onHoursLogged }) => {
  const [workerName, setWorkerName] = useState('');
  const [weekEnding, setWeekEnding] = useState('');
  const [hours, setHours] = useState({
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // List of workers
  const workers = [
    'Worker 1', 
    'Worker 2', 
    'Worker 3', 
    'Worker 4'
  ];
  
  // Generate the next 4 Fridays for the week-ending dropdown
  const generateFridays = () => {
    const fridays = [];
    const today = new Date();
    let friday = new Date(today);
    
    // Find the next Friday
    friday.setDate(friday.getDate() + ((7 + 5 - friday.getDay()) % 7));
    
    // Generate 4 Fridays
    for (let i = 0; i < 4; i++) {
      fridays.push(new Date(friday));
      friday.setDate(friday.getDate() + 7);
    }
    
    return fridays;
  };
  
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  const handleHoursChange = (day, value) => {
    setHours({
      ...hours,
      [day]: Number(value) || 0
    });
  };
  
  const calculateTotalHours = () => {
    return Object.values(hours).reduce((total, h) => total + h, 0);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!workerName) {
      setError('Please select a worker');
      return;
    }
    
    if (!weekEnding) {
      setError('Please select a week ending date');
      return;
    }
    
    const totalHours = calculateTotalHours();
    if (totalHours <= 0) {
      setError('Please enter at least some hours');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Use authService.acquireToken
      const token = await authService.acquireToken(['api://<your_api_client_id>/Hours.Log']).catch(error => { // Replace <your_api_client_id> with your actual API client ID if needed
        throw new Error("Authentication failed. Please sign in again.");
      });
      
      // We'll implement this API endpoint next
      const response = await fetch('/api/logWorkerHours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workerName,
          weekEnding,
          hours,
          totalHours: calculateTotalHours()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to log hours');
      }
      
      setSuccess(`Successfully logged ${calculateTotalHours()} hours for ${workerName}`);
      
      // Reset form
      setHours({
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0
      });
      
      // Notify parent component if callback provided
      if (onHoursLogged) {
        const result = await response.json();
        onHoursLogged(result);
      }
    } catch (error) {
      console.error('Failed to log hours:', error);
      // Use error.message directly if available
      setError(error instanceof Error ? error.message : 'An error occurred while logging hours');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="worker-hours-form bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Log Worker Hours</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Worker Name
            </label>
            <select
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isSubmitting}
            >
              <option value="">Select worker...</option>
              {workers.map((worker) => (
                <option key={worker} value={worker}>{worker}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Week Ending
            </label>
            <select
              value={weekEnding}
              onChange={(e) => setWeekEnding(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isSubmitting}
            >
              <option value="">Select date...</option>
              {generateFridays().map((friday) => (
                <option key={formatDate(friday)} value={formatDate(friday)}>
                  {formatDate(friday)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daily Hours
          </label>
          <div className="grid grid-cols-5 gap-2">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
              <div key={day}>
                <label className="block text-xs text-gray-500 mb-1 capitalize">
                  {day}
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={hours[day]}
                  onChange={(e) => handleHoursChange(day, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  disabled={isSubmitting}
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <span className="font-medium">Total hours:</span> {calculateTotalHours()}
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            {isSubmitting ? 'Submitting...' : 'Log Hours'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkerHoursForm;