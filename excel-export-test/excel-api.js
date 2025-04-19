/**
 * Standalone Excel Export API endpoint for Higuera project
 * This provides a reliable Excel export functionality using Express
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const cors = require('cors');
const morgan = require('morgan');
const app = express();
const PORT = process.env.PORT || 7090;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));  // For logging

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Excel export API is running' });
});

// Excel export endpoint
app.get('/api/exportExcel', async (req, res) => {
  console.log('Excel export endpoint called');
  const startTime = Date.now();
  
  try {
    // Load project data
    const dataPath = path.join(__dirname, '..', 'public', 'data', 'data.json');
    console.log(`Loading data from: ${dataPath}`);
    
    const dataRaw = fs.readFileSync(dataPath, 'utf8');
    const projectData = JSON.parse(dataRaw);
    
    console.log('Project data loaded successfully');
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Higuera Project Dashboard';
    workbook.lastModifiedBy = 'Excel Export API';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Project Overview Sheet
    const overviewSheet = workbook.addWorksheet('Project Overview');
    overviewSheet.columns = [
      { header: 'Parameter', key: 'parameter', width: 25 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];
    
    // Add project overview data
    overviewSheet.addRows([
      { parameter: 'Project Start', value: projectData.hoursTracking.startDate, notes: '' },
      { parameter: 'Planned End Date', value: projectData.hoursTracking.plannedEndDate, notes: '' },
      { parameter: 'Projected End Date', value: projectData.hoursTracking.projectedEndDate, notes: 'Based on current burndown rate' },
      { parameter: 'Total Budget', value: projectData.kpis.totalBudget, notes: 'USD' },
      { parameter: 'Spent', value: projectData.kpis.spent, notes: 'USD' },
      { parameter: 'Remaining', value: projectData.kpis.remaining, notes: 'USD' },
      { parameter: 'Overrun Risk', value: projectData.kpis.risk, notes: '' },
      { parameter: 'Total Hours Allocated', value: projectData.hoursTracking.totalHoursAllocated, notes: '' },
      { parameter: 'Total Hours Used', value: projectData.hoursTracking.totalHoursUsed, notes: '' },
      { parameter: 'Hours Remaining', value: projectData.hoursTracking.completionMetrics.hoursRemaining, notes: '' },
      { parameter: 'Percent Complete', value: `${projectData.hoursTracking.completionMetrics.percentageComplete}%`, notes: '' },
      { parameter: 'Burndown Rate', value: projectData.hoursTracking.completionMetrics.burndownRate, notes: 'Hours per week' },
      { parameter: 'Estimated Weeks Remaining', value: projectData.hoursTracking.completionMetrics.estimatedWeeksRemaining, notes: '' }
    ]);
    
    // Format cells
    overviewSheet.getColumn('parameter').font = { bold: true };
    
    // Weekly Hours Sheet
    const weeklyHoursSheet = workbook.addWorksheet('Weekly Hours');
    weeklyHoursSheet.columns = [
      { header: 'Week Ending', key: 'weekEnding', width: 15 },
      { header: 'Planned Hours', key: 'hoursPlanned', width: 15 },
      { header: 'Actual Hours', key: 'hoursActual', width: 15 },
      { header: 'Cumulative Planned', key: 'cumulativePlanned', width: 20 },
      { header: 'Cumulative Actual', key: 'cumulativeActual', width: 20 },
      { header: 'Hours Variance', key: 'hoursVariance', width: 15 }
    ];
    
    // Add weekly hours data
    projectData.hoursTracking.weeklyHours.forEach(week => {
      weeklyHoursSheet.addRow({
        weekEnding: week.weekEnding,
        hoursPlanned: week.hoursPlanned,
        hoursActual: week.hoursActual,
        cumulativePlanned: week.cumulativePlanned,
        cumulativeActual: week.cumulativeActual,
        hoursVariance: week.hoursActual - week.hoursPlanned
      });
    });
    
    // Task Completion Sheet
    const taskSheet = workbook.addWorksheet('Task Completion');
    taskSheet.columns = [
      { header: 'Task', key: 'task', width: 20 },
      { header: 'Planned %', key: 'planned', width: 15 },
      { header: 'Actual %', key: 'actual', width: 15 },
      { header: 'Variance', key: 'variance', width: 15 }
    ];
    
    // Add task data
    projectData.schedule.forEach(task => {
      taskSheet.addRow({
        task: task.task,
        planned: task.Planned,
        actual: task.Actual,
        variance: task.Actual - task.Planned
      });
    });
    
    // Issues Sheet
    const issuesSheet = workbook.addWorksheet('Issues');
    issuesSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'System', key: 'system', width: 15 },
      { header: 'Issue', key: 'issue', width: 30 },
      { header: 'Impact', key: 'impact', width: 20 },
      { header: 'Accountability', key: 'accountability', width: 20 },
      { header: 'Consequence', key: 'consequence', width: 25 }
    ];
    
    // Add issues data
    projectData.issues.forEach(issue => {
      issuesSheet.addRow({
        date: issue.date,
        system: issue.system,
        issue: issue.issue,
        impact: issue.impact,
        accountability: issue.accountability,
        consequence: issue.consequence
      });
    });
    
    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    const duration = Date.now() - startTime;
    console.log(`Excel export completed in ${duration}ms`);
    
    // Set headers and send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Higuera-Project-Export-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate Excel file',
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Excel Export API running on port ${PORT}`);
  console.log(`Access the Excel export at: http://localhost:${PORT}/api/exportExcel`);
});