import React, { useState } from 'react';
// Import the authService instance
import { authService } from "../lib/msalAuth";

const TaskUpdateForm = ({ tasks, onTaskUpdated }) => {
  const [selectedTask, setSelectedTask] = useState('');
  const [actualPercentage, setActualPercentage] = useState('');
  const [hoursLogged, setHoursLogged] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!selectedTask) {
      setError('Please select a task');
      return;
    }
    
    if (!actualPercentage || actualPercentage < 0 || actualPercentage > 100) {
      setError('Percentage must be between 0 and 100');
      return;
    }
    
    if (!hoursLogged || hoursLogged <= 0) {
      setError('Hours logged must be greater than 0');
      return;
    }
    
    setIsUpdating(true);
    setError('');
    setSuccess('');
    
    try {
      // Use authService.acquireToken
      const token = await authService.acquireToken(['api://<your_api_client_id>/Tasks.ReadWrite']).catch(error => { // Replace <your_api_client_id> with your actual API client ID if needed
        throw new Error("Authentication failed. Please sign in again.");
      });
      
      const response = await fetch('/api/updateTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskName: selectedTask,
          actualPercentage: Number(actualPercentage),
          hoursLogged: Number(hoursLogged)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }
      
      const result = await response.json();
      
      setSuccess(`Task updated successfully. New projected completion date: ${new Date(result.hoursTracking.projectedEndDate).toLocaleDateString()}`);
      
      // Clear form
      setSelectedTask('');
      setActualPercentage('');
      setHoursLogged('');
      
      // Notify parent component
      if (onTaskUpdated) {
        onTaskUpdated(result);
      }
    } catch (error) {
      console.error('Task update error:', error);
      // Use error.message directly if available
      setError(error instanceof Error ? error.message : 'Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="task-update-form bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Update Task Completion</h3>
      
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-1">
              Select Task
            </label>
            <select
              id="task"
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isUpdating}
            >
              <option value="">Select a task...</option>
              {tasks.map((task) => (
                <option key={task.task} value={task.task}>
                  {task.task} (Current: {task.Actual}%)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="percentage" className="block text-sm font-medium text-gray-700 mb-1">
              New Completion Percentage
            </label>
            <input
              id="percentage"
              type="number"
              min="0"
              max="100"
              value={actualPercentage}
              onChange={(e) => setActualPercentage(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="e.g., 75"
              disabled={isUpdating}
            />
          </div>
          
          <div>
            <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-1">
              Hours Logged
            </label>
            <input
              id="hours"
              type="number"
              min="0.5"
              step="0.5"
              value={hoursLogged}
              onChange={(e) => setHoursLogged(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="e.g., 8"
              disabled={isUpdating}
            />
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              {isUpdating ? 'Updating...' : 'Update Task'}
            </button>
          </div>
        </div>
      </form>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Updating task completion will recalculate the projected completion date.</p>
      </div>
    </div>
  );
};

export default TaskUpdateForm;