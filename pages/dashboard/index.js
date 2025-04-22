import Head from 'next/head';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import HoursTrackingChart from '../../components/HoursTrackingChart';
import TaskSummary from '../../components/dashboard/TaskSummary';
import BudgetOverview from '../../components/dashboard/BudgetOverview';
import ProjectStatus from '../../components/dashboard/ProjectStatus';
import fs from 'fs'
import path from 'path'

export async function getStaticProps() {
  const dataFilePath = path.join(process.cwd(), 'public', 'data', 'data.json')
  const fileContents = fs.readFileSync(dataFilePath, 'utf8')
  const data = JSON.parse(fileContents)
  // Ensure the data structure matches what the component expects
  // Add default values if necessary to prevent runtime errors
  const defaultData = {
    totalBudget: 0,
    budgetUsed: 0,
    tasksCompleted: 0,
    totalTasks: 0,
    projectProgress: 0,
    nextMilestone: 'N/A',
    recentUpdates: [],
    // Add other expected fields from data.json if needed
  };
  const dashboardData = { ...defaultData, ...data };

  return {
    props: {
      dashboardData // Pass the potentially merged data
    }
  }
}

// Navigation component for consistent UI
const Navigation = () => (
  <nav className="bg-blue-800 text-white py-3 px-6 mb-6 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="font-bold text-xl">Higuera Azure Project</div>
      <div className="flex space-x-6">
        <Link href="/ExecutiveSummary">
          <span className="hover:text-blue-200 font-medium cursor-pointer">Executive Summary</span>
        </Link>
        <Link href="/dashboard">
          <span className="hover:text-blue-200 font-medium cursor-pointer">Azure Dashboard</span>
        </Link>
      </div>
    </div>
  </nav>
);

export default function HigueraDashboard({ dashboardData }) {
  // Removed useState for projectData, loading, error
  // Removed useEffect hook

  // Directly use dashboardData from props
  const { totalBudget, budgetUsed, tasksCompleted, totalTasks, projectProgress, nextMilestone, recentUpdates } = dashboardData || {}; // Add default empty object for safety

  // Removed loading check

  return (
    // Page background and vertical padding
    <div className="bg-gray-100 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4">
        <Head>
          <title>Higuera Azure Dashboard</title>
          <meta name="description" content="Project management dashboard for Higuera Azure" />
        </Head>

        <Navigation />

        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-4xl font-extrabold text-gray-800">Higuera Azure Dashboard</h1>
          <p className="text-gray-600 mt-2">Project status as of {new Date().toLocaleDateString()}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <BudgetOverview
            totalBudget={totalBudget} // Use destructured prop
            budgetUsed={budgetUsed} // Use destructured prop
          />
          <ProjectStatus
            tasksCompleted={tasksCompleted} // Use destructured prop
            totalTasks={totalTasks} // Use destructured prop
            projectProgress={projectProgress} // Use destructured prop
            nextMilestone={nextMilestone} // Use destructured prop
          />
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Recent Updates</h2>
            <ul className="space-y-2">
              {/* Ensure recentUpdates exists before mapping */}
              {recentUpdates && recentUpdates.map((update, index) => (
                <li key={index} className="border-b pb-2">
                  <span className="text-sm text-gray-500">{update.date}</span>
                  <p className="text-gray-700">{update.description}</p>
                </li>
              ))}
            </ul>
            <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white">View All Updates</Button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Hours Tracking</h2>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <HoursTrackingChart />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Task Summary</h2>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <TaskSummary />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" className="mr-4">Export Report</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Update Dashboard</Button>
        </div>
      </div>
    </div>
  );
}