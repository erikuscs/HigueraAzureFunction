import React from 'react';

export default function ProjectStatus({ tasksCompleted, totalTasks, projectProgress, nextMilestone }) {
  // Calculate days until next milestone
  const calculateDaysRemaining = (milestoneDate) => {
    const today = new Date();
    const milestone = new Date(milestoneDate);
    const diffTime = milestone - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilNextMilestone = calculateDaysRemaining(nextMilestone);
  
  // Helper function to determine status color
  const getProgressColor = (progress) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Project Status</h2>
      
      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-medium">{projectProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${getProgressColor(projectProgress)}`} 
            style={{ width: `${projectProgress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Tasks Completed</p>
          <div className="flex items-center justify-center">
            <p className="text-2xl font-bold">{tasksCompleted}</p>
            <p className="text-gray-500 ml-1">/ {totalTasks}</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Next Milestone</p>
          <p className="text-2xl font-bold">{daysUntilNextMilestone}</p>
          <p className="text-xs text-gray-500">days remaining</p>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium mb-3">Resource Allocation</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Development</span>
              <span>65%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Testing</span>
              <span>40%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '40%' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Deployment</span>
              <span>25%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-600 h-1.5 rounded-full" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}