import { withApiAuth } from '../../lib/middleware';
import { trackEvent, trackMetric } from '../../lib/monitoringService';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = performance.now();

  try {
    // Read the data.json file
    const dataPath = path.join(process.cwd(), 'public', 'data', 'data.json');
    const dataRaw = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(dataRaw);
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Higuera Project Dashboard';
    workbook.lastModifiedBy = 'API';
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
      { parameter: 'Project Start', value: data.hoursTracking.startDate, notes: '' },
      { parameter: 'Planned End Date', value: data.hoursTracking.plannedEndDate, notes: '' },
      { parameter: 'Projected End Date', value: data.hoursTracking.projectedEndDate, notes: 'Based on current burndown rate' },
      { parameter: 'Total Budget', value: data.kpis.totalBudget, notes: 'USD' },
      { parameter: 'Spent', value: data.kpis.spent, notes: 'USD' },
      { parameter: 'Remaining', value: data.kpis.remaining, notes: 'USD' },
      { parameter: 'Overrun Risk', value: data.kpis.risk, notes: '' },
      { parameter: 'Total Hours Allocated', value: data.hoursTracking.totalHoursAllocated, notes: '' },
      { parameter: 'Total Hours Used', value: data.hoursTracking.totalHoursUsed, notes: '' },
      { parameter: 'Hours Remaining', value: data.hoursTracking.completionMetrics.hoursRemaining, notes: '' },
      { parameter: 'Percent Complete', value: `${data.hoursTracking.completionMetrics.percentageComplete}%`, notes: '' },
      { parameter: 'Burndown Rate', value: data.hoursTracking.completionMetrics.burndownRate, notes: 'Hours per week' },
      { parameter: 'Estimated Weeks Remaining', value: data.hoursTracking.completionMetrics.estimatedWeeksRemaining, notes: '' }
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
    data.hoursTracking.weeklyHours.forEach(week => {
      weeklyHoursSheet.addRow({
        weekEnding: week.weekEnding,
        hoursPlanned: week.hoursPlanned,
        hoursActual: week.hoursActual,
        cumulativePlanned: week.cumulativePlanned,
        cumulativeActual: week.cumulativeActual,
        hoursVariance: week.hoursActual - week.hoursPlanned
      });
    });
    
    // Format with alternating row colors
    weeklyHoursSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        if (rowNumber % 2) {
          row.eachCell({ includeEmpty: true }, cell => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F5F5F5' }
            };
          });
        }
      } else {
        // Header row
        row.eachCell({ includeEmpty: true }, cell => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E0E0E0' }
          };
        });
      }
    });
    
    // Worker Hours Sheet
    if (data.workerHours && data.workerHours.length > 0) {
      const workerHoursSheet = workbook.addWorksheet('Worker Hours');
      workerHoursSheet.columns = [
        { header: 'Worker Name', key: 'workerName', width: 15 },
        { header: 'Week Ending', key: 'weekEnding', width: 15 },
        { header: 'Monday', key: 'monday', width: 10 },
        { header: 'Tuesday', key: 'tuesday', width: 10 },
        { header: 'Wednesday', key: 'wednesday', width: 10 },
        { header: 'Thursday', key: 'thursday', width: 10 },
        { header: 'Friday', key: 'friday', width: 10 },
        { header: 'Total Hours', key: 'totalHours', width: 15 }
      ];
      
      // Add worker hours data
      data.workerHours.forEach(entry => {
        workerHoursSheet.addRow({
          workerName: entry.workerName,
          weekEnding: entry.weekEnding,
          monday: entry.hours.monday,
          tuesday: entry.hours.tuesday,
          wednesday: entry.hours.wednesday,
          thursday: entry.hours.thursday,
          friday: entry.hours.friday,
          totalHours: entry.totalHours
        });
      });
      
      // Format worker hours
      workerHoursSheet.getRow(1).font = { bold: true };
      workerHoursSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E0E0E0' }
      };
    }
    
    // Task Completion Sheet
    const taskSheet = workbook.addWorksheet('Task Completion');
    taskSheet.columns = [
      { header: 'Task', key: 'task', width: 20 },
      { header: 'Planned %', key: 'planned', width: 15 },
      { header: 'Actual %', key: 'actual', width: 15 },
      { header: 'Variance', key: 'variance', width: 15 }
    ];
    
    // Add task data
    data.schedule.forEach(task => {
      taskSheet.addRow({
        task: task.task,
        planned: task.Planned,
        actual: task.Actual,
        variance: task.Actual - task.Planned
      });
    });
    
    // Format task sheet
    taskSheet.getRow(1).font = { bold: true };
    
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
    data.issues.forEach(issue => {
      issuesSheet.addRow({
        date: issue.date,
        system: issue.system,
        issue: issue.issue,
        impact: issue.impact,
        accountability: issue.accountability,
        consequence: issue.consequence
      });
    });
    
    // Format issues sheet
    issuesSheet.getRow(1).font = { bold: true };
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    const duration = performance.now() - startTime;
    trackMetric('excelExportDuration', duration);
    
    trackEvent('excelExport', {
      sheets: workbook.worksheets.map(ws => ws.name),
      rows: {
        weekly: data.hoursTracking.weeklyHours.length,
        workers: data.workerHours ? data.workerHours.length : 0,
        tasks: data.schedule.length,
        issues: data.issues.length
      }
    });

    // Set headers and send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Higuera-Project-Export-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error('Excel export error:', error);
    
    trackEvent('excelExportError', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ error: error.message || 'Failed to export Excel file' });
  }
}

export default withApiAuth(handler);