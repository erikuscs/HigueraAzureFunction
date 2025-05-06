import React from 'react';

interface ProjectStatusProps {
  tasksCompleted?: number;
  totalTasks?: number;
  projectProgress?: number;
  nextMilestone?: string;
}

const ProjectStatus: React.FC<ProjectStatusProps> = ({ tasksCompleted = 0, totalTasks = 0, projectProgress = 0, nextMilestone = 'N/A' }) => (
  <div>
    <div>Tasks Completed: {tasksCompleted}/{totalTasks}</div>
    <div>Progress: {projectProgress}%</div>
    <div>Next Milestone: {nextMilestone}</div>
  </div>
);

export default ProjectStatus;
