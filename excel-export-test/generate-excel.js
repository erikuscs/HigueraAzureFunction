const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function generateExcel() {
  console.log('Starting Excel generation...');
  
  try {
    // Read the data.json file
    const dataPath = path.join(__dirname, '..', 'public', 'data', 'data.json');
    console.log(`Looking for data file at: ${dataPath}`);
    
    const dataRaw = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(dataRaw);
    console.log('Data loaded successfully');
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Higuera Project Dashboard';
    workbook.lastModifiedBy = 'Test Script';
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
    
    // Write to file
    const outputPath = path.join(__dirname, '..', 'test_excel_export.xlsx');
    console.log(`Writing Excel file to: ${outputPath}`);
    
    await workbook.xlsx.writeFile(outputPath);
    console.log('Excel file created successfully!');
    console.log(`File saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error generating Excel file:', error);
  }
}

// Run the function
generateExcel().then(() => {
  console.log('Excel generation process complete.');
}).catch(err => {
  console.error('Failed to generate Excel:', err);
});