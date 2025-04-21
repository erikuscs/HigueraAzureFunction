import { useEffect, useState, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"
import { authService } from "../lib/msalAuth"
import HoursTrackingChart from "../components/HoursTrackingChart"
import TaskUpdateForm from "../components/TaskUpdateForm"
import WorkerHoursForm from "../components/WorkerHoursForm"
import Link from "next/link"

// Remove direct imports of server-only modules
// import { cacheGet, cacheSet } from '../lib/cacheService';
// import { monitorPerformance } from '../lib/middleware';

const Button = ({ children, ...props }) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-lg ${
      props.disabled ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
    } text-white ${props.className || ''}`}
  >
    {children}
  </button>
)

const Card = ({ children, ...props }) => (
  <div {...props} className={`rounded-2xl shadow ${props.className || ''}`}>
    {children}
  </div>
)

const CardContent = ({ children, ...props }) => (
  <div {...props} className={`p-4 ${props.className || ''}`}>
    {children}
  </div>
)

// Add new utility functions
function generateShareableLink(weekFilter, systemFilter) {
  const params = new URLSearchParams();
  if (weekFilter) params.set('week', weekFilter);
  if (systemFilter) params.set('system', systemFilter);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export default function ExecutiveSummary() {
  const [data, setData] = useState(null)
  const [lastUpdated, setLastUpdated] = useState("")
  const [weekFilter, setWeekFilter] = useState(null)
  const [systemFilter, setSystemFilter] = useState(null)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [shareLink, setShareLink] = useState("")
  const version = "v1.0.0"

  // Rest of your component code...

  // Add navigation component
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

  // Rest of your code remains the same
  useEffect(() => {
    const publicPath = process.env.NEXT_PUBLIC_BASE_PATH || ""
    fetch(`${publicPath}/data/data.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json()
      })
      .then((json) => {
        setData(json)
        setLastUpdated(new Date().toLocaleDateString())

        const projectStart = new Date("2025-01-20")
        const today = new Date()
        const weekNumber = Math.floor((today.getTime() - projectStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
        const currentWeekLabel = `Week ${weekNumber}`

        const match = json.weeklyCost.find(w => w.week === currentWeekLabel)
        if (match) setWeekFilter(currentWeekLabel)
      })
      .catch((err) => {
        console.error("Failed to load data.json", err)
        setEmailError("⚠️ Could not find or read /public/data/data.json. Please verify that the file exists and is valid JSON.")
      })
  }, [])

  // Add URL params handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('week')) setWeekFilter(params.get('week'));
    if (params.has('system')) setSystemFilter(params.get('system'));
  }, []);

  const sendEmailReport = async () => {
    if (!data) {
      setEmailError("No dashboard data available");
      return;
    }
    
    setIsSendingEmail(true);
    setEmailError("");
    setEmailSuccess(false);

    const sendStartTime = performance.now();

    try {
      const token = await authService.acquireToken(['Mail.Send']).catch(error => { // Use appropriate scope for sending mail
        console.error('Authentication error:', error);
        throw new Error("Authentication failed. Please sign in again.");
      });
      
      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dashboardData: data
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to send email report");
      }

      const sendDuration = performance.now() - sendStartTime;
      // Track metrics on the server side instead
      
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 5000); // Clear success message after 5 seconds
    } catch (error) {
      console.error('Email report error:', error);
      
      setEmailError(
        error instanceof Error && error.message.includes("Authentication failed")
          ? "⚠️ Authentication error. Please sign in and try again."
          : error instanceof Error ? `⚠️ ${error.message}` : "⚠️ An unknown error occurred while sending the email."
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const refreshData = async () => {
    setData(null);
    const fetchStartTime = performance.now();

    try {
      // Fetch directly without using server-side caching
      const publicPath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${publicPath}/data/data.json`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const newData = await response.json();
      
      setData(newData);
      console.log(`Data refreshed in ${performance.now() - fetchStartTime}ms`);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setEmailError(error.message);
    }
  };

  const clearFilters = () => {
    setWeekFilter(null);
    setSystemFilter(null);
  };

  const handleShare = () => {
    const link = generateShareableLink(weekFilter, systemFilter);
    setShareLink(link);
    navigator.clipboard.writeText(link)
      .then(() => alert("Link copied to clipboard!"))
      .catch(console.error);
  };

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const response = await fetch('/api/generatePdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboardData: data,
          filters: {
            week: weekFilter,
            system: systemFilter
          }
        })
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `higuera-summary-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setEmailError('Failed to generate PDF report');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!data) return <div className="p-6 text-gray-500">Loading dashboard...</div>

  const uniqueWeeks = [...new Set(data.weeklyCost.map(item => item.week))]
  const uniqueSystems = [...new Set(data.issues.map(item => item.system))]

  const filteredWeeklyCost = weekFilter 
    ? data.weeklyCost.filter(w => w.week === weekFilter) 
    : data.weeklyCost

  const filteredIssues = systemFilter 
    ? data.issues.filter(i => i.system === systemFilter) 
    : data.issues

  return (
    <div className="p-6 space-y-8 bg-white text-gray-800 font-sans">
      <Navigation />
      
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-blue-900">Executive Summary</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Button
              onClick={refreshData}
              className="bg-gray-600 hover:bg-gray-700"
            >
              🔄 Refresh
            </Button>
            <Button
              onClick={clearFilters}
              className="bg-gray-600 hover:bg-gray-700"
              disabled={!weekFilter && !systemFilter}
            >
              ❌ Clear Filters
            </Button>
            <Button
              onClick={handleShare}
              className="bg-green-600 hover:bg-green-700"
            >
              🔗 Share
            </Button>
            <Button
              onClick={downloadPDF}
              disabled={isGeneratingPDF}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGeneratingPDF ? 'Generating...' : '📥 Download PDF'}
            </Button>
            <a 
              href="/api/exportExcel" 
              target="_blank"
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
            >
              📊 Export Excel
            </a>
            <Button
              onClick={sendEmailReport}
              disabled={isSendingEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSendingEmail ? 'Sending...' : '📧 Send Email'}
            </Button>
          </div>
          <img src="/ADI_Logo.png" alt="ADI Logo" className="h-14" />
        </div>
      </div>

      {shareLink && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg">
          Link copied to clipboard! 
          <button 
            onClick={() => setShareLink("")}
            className="float-right text-blue-500 hover:text-blue-700"
          >
            ✕
          </button>
        </div>
      )}

      {emailError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">
          {emailError}
        </div>
      )}

      {emailSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">
          Email report sent successfully!
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[ 
          { label: "Total Budget", value: `$${data.kpis.totalBudget.toLocaleString()}` },
          { label: "Spent", value: `$${data.kpis.spent.toLocaleString()}` },
          { label: "Remaining", value: `$${data.kpis.remaining.toLocaleString()}` },
          { label: "Overrun Risk", value: data.kpis.risk, color: "text-red-500" }
        ].map((kpi, index) => (
          <Card key={index}>
            <CardContent>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {kpi.label}
              </div>
              <div className={`text-3xl font-bold ${kpi.color || 'text-gray-900'}`}>
                {kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-2">
        {uniqueWeeks.map((week, i) => (
          <Button
            key={i}
            onClick={() => setWeekFilter(weekFilter === week ? null : week)}
            className={weekFilter === week ? 'bg-blue-600' : 'bg-white text-blue-700 border-blue-500 border'}
          >
            {week}
          </Button>
        ))}
        {uniqueSystems.map((sys, i) => (
          <Button
            key={i}
            onClick={() => setSystemFilter(systemFilter === sys ? null : sys)}
            className={systemFilter === sys ? 'bg-green-600' : 'bg-white text-green-700 border-green-500 border'}
          >
            {sys}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h3 className="text-md font-semibold text-blue-800 mb-2">Cost Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={filteredWeeklyCost}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="AdjustedTotalCost" stroke="#2563eb" />
                <Line type="monotone" dataKey="TotalWeeklyCost" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-md font-semibold text-blue-800 mb-2">Budget Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="pt-10">
        <h2 className="text-xl font-bold mb-4 text-blue-900">Schedule Tracker</h2>
        <Card>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.schedule}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="task" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Planned" fill="#93c5fd" />
                <Bar dataKey="Actual" fill="#fca5a5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="pt-10">
        <h2 className="text-xl font-bold mb-4 text-blue-900">Hours Tracking & Forecasting</h2>
        <Card>
          <CardContent>
            {data.hoursTracking ? (
              <HoursTrackingChart hoursData={data.hoursTracking} />
            ) : (
              <div className="p-4 bg-gray-50 text-gray-600 rounded">
                No hours tracking data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="pt-10">
        <h2 className="text-xl font-bold mb-4 text-blue-900">Task Updates</h2>
        <Card>
          <CardContent>
            <TaskUpdateForm 
              tasks={data.schedule} 
              onTaskUpdated={(result) => {
                // Update local data with new data from server
                setData({
                  ...data,
                  schedule: data.schedule.map(task => 
                    task.task === result.task.task ? result.task : task
                  ),
                  hoursTracking: result.hoursTracking
                });
              }} 
            />
          </CardContent>
        </Card>
      </div>

      <div className="pt-10">
        <h2 className="text-xl font-bold mb-4 text-blue-900">Worker Hours Tracker</h2>
        <Card>
          <CardContent>
            <WorkerHoursForm 
              onHoursLogged={(result) => {
                // Update local data with new data from server
                setData({
                  ...data,
                  workerHours: result.workerHours,
                  hoursTracking: result.hoursTracking
                });
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="pt-10">
        <h2 className="text-xl font-bold mb-4 text-blue-900">Root Cause Matrix</h2>
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm text-left table-auto">
              <thead>
                <tr className="bg-blue-50 text-blue-800 border-b">
                  <th className="pr-4 pb-2">Date</th>
                  <th className="pr-4 pb-2">Issue</th>
                  <th className="pr-4 pb-2">System</th>
                  <th className="pr-4 pb-2">Impact</th>
                  <th className="pr-4 pb-2">Accountability</th>
                  <th className="pb-2">Consequence</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="pr-4 py-2">{row.date}</td>
                    <td className="pr-4 py-2">{row.issue}</td>
                    <td className="pr-4 py-2">{row.system}</td>
                    <td className="pr-4 py-2">{row.impact}</td>
                    <td className="pr-4 py-2">{row.accountability}</td>
                    <td className="py-2">{row.consequence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="pt-10 border-t pt-4 text-sm text-gray-500">
        Project Higuera Oversight Report | Ayala Development Inc.<br />
        Version: {version} — Last Updated: {lastUpdated}
      </div>
    </div>
  )
}