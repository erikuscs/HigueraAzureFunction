import { useState } from 'react';
import { Button } from '../ui/button';

const mockTasks = [
  { id: 1, name: 'Azure Function Deployment', status: 'Completed', dueDate: '2025-04-10', assignee: 'John Smith' },
  { id: 2, name: 'Database Migration', status: 'In Progress', dueDate: '2025-04-25', assignee: 'Alice Johnson' },
  { id: 3, name: 'Authentication Setup', status: 'Completed', dueDate: '2025-04-05', assignee: 'Maria Garcia' },
  { id: 4, name: 'Dashboard UI Implementation', status: 'In Progress', dueDate: '2025-04-20', assignee: 'David Chen' },
  { id: 5, name: 'API Integration', status: 'Not Started', dueDate: '2025-05-05', assignee: 'Elena Rodriguez' },
];

export default function TaskSummary() {
  const [tasks, setTasks] = useState(mockTasks);
  const [filter, setFilter] = useState('all');
  
  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(task => task.status.toLowerCase() === filter);

  const statusColors = {
    'Completed': 'bg-green-100 text-green-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Not Started': 'bg-gray-100 text-gray-800',
    'Blocked': 'bg-red-100 text-red-800'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="space-x-2">
          <Button 
            variant={filter === 'all' ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'completed' ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Completed
          </Button>
          <Button 
            variant={filter === 'in progress' ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter('in progress')}
          >
            In Progress
          </Button>
          <Button 
            variant={filter === 'not started' ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter('not started')}
          >
            Not Started
          </Button>
        </div>
        <Button size="sm" variant="outline">+ New Task</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.map((task) => (
              <tr key={task.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${statusColors[task.status]}`}>
                    {task.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.dueDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.assignee}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href="#" className="text-blue-600 hover:text-blue-900 mr-4">Edit</a>
                  <a href="#" className="text-red-600 hover:text-red-900">Delete</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredTasks.length === 0 && (
        <div className="text-center py-6">
          <p className="text-gray-500">No tasks found with the selected filter</p>
        </div>
      )}
      
      <div className="mt-4 flex justify-between">
        <div className="text-sm text-gray-500">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
        <Button variant="outline" size="sm">View All Tasks</Button>
      </div>
    </div>
  );
}