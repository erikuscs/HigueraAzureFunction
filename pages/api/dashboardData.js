import { getConfig } from '../../lib/config';
import { monitorProject } from '../../lib/monitoringService';
import { cacheData, getCache } from '../../lib/cacheService';

// Mock data for development
const mockProjectData = {
  totalBudget: 150000,
  budgetUsed: 65000,
  tasksCompleted: 24,
  totalTasks: 42,
  projectProgress: 57,
  nextMilestone: '2025-05-15',
  recentUpdates: [
    { date: '2025-04-15', description: 'Phase 1 completed' },
    { date: '2025-04-10', description: 'Infrastructure deployment' },
    { date: '2025-04-05', description: 'Design approval' }
  ],
  taskDistribution: {
    'Not Started': 10,
    'In Progress': 8,
    'Completed': 24
  },
  resourceAllocation: {
    development: 65,
    testing: 40,
    deployment: 25
  },
  monthlyHours: [
    { month: 'Jan', hours: 120 },
    { month: 'Feb', hours: 150 },
    { month: 'Mar', hours: 180 },
    { month: 'Apr', hours: 210 }
  ]
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Try to get cached data first
    const cachedData = await getCache('dashboardData');
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // Get configuration
    const config = await getConfig();
    const useMockData = process.env.NODE_ENV === 'development' || config?.useMockData;

    let dashboardData;
    if (useMockData) {
      // Use mock data in development
      dashboardData = mockProjectData;
    } else {
      // In production, fetch real data from various sources
      try {
        // Get monitoring data (replace with actual implementation)
        const monitoringData = await monitorProject();
        
        // Aggregate data from different sources
        dashboardData = {
          totalBudget: monitoringData.budget?.total || 0,
          budgetUsed: monitoringData.budget?.used || 0,
          tasksCompleted: monitoringData.tasks?.completed || 0,
          totalTasks: monitoringData.tasks?.total || 0,
          projectProgress: monitoringData.progress || 0,
          nextMilestone: monitoringData.nextMilestone || '',
          recentUpdates: monitoringData.updates || [],
          taskDistribution: monitoringData.taskDistribution || {},
          resourceAllocation: monitoringData.resourceAllocation || {},
          monthlyHours: monitoringData.monthlyHours || []
        };
      } catch (error) {
        console.error('Error fetching real dashboard data:', error);
        // Fallback to mock data if real data fetch fails
        dashboardData = mockProjectData;
      }
    }

    // Cache the data for 5 minutes
    await cacheData('dashboardData', JSON.stringify(dashboardData), 5 * 60);

    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}