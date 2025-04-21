import { cacheService } from '../../lib/cacheService';

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
    const cacheKey = 'dashboardData';
    // Try to get cached data first using cacheService.get
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      // Assuming cachedData is already an object, no need to parse
      return res.status(200).json(cachedData);
    }

    // Simplify: Always use mock data for now, remove config/monitoring calls
    const dashboardData = mockProjectData;

    // Cache the data for 5 minutes using cacheService.set
    // Ensure the value is stringified if cacheService expects a string
    await cacheService.set(cacheKey, dashboardData, 5 * 60);

    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve dashboard data',
      // Use error.message directly if available
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}