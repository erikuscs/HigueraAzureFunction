// Server-only modules that will be imported conditionally
let MSGraphClient = null;
let TokenCredentialAuthProvider = null;
let DefaultAzureCredentialClass = null;
let jsPDFModule = null;

// Only import server-side modules when running on the server
if (typeof window === 'undefined') {
  try {
    const { Client } = require('@microsoft/microsoft-graph-client');
    const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
    const { DefaultAzureCredential } = require('@azure/identity');
    const jsPDF = require('jspdf');
    require('jspdf-autotable');
    
    MSGraphClient = Client;
    TokenCredentialAuthProvider = TokenCredentialAuthenticationProvider;
    DefaultAzureCredentialClass = DefaultAzureCredential;
    jsPDFModule = jsPDF;
  } catch (error) {
    console.error('Error importing server-side modules:', error);
  }
}

import { trackException, trackMetric } from '../../lib/monitoringService';

function formatCurrency(number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
}

export default async function handler(req, res) {
  // This is an API route, which only runs on the server side
  // But we still need to ensure the imports worked correctly
  if (!jsPDFModule) {
    return res.status(500).json({ error: 'Server-side modules not available' });
  }
  
  const startTime = performance.now();
  
  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { dashboardData, filters } = req.body;
    if (!dashboardData) {
      throw new Error('No dashboard data provided');
    }

    const doc = new jsPDFModule();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text('Higuera Project - Executive Summary', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
    
    if (filters && (filters.week || filters.system)) {
      doc.text(`Filters: ${filters.week ? 'Week: ' + filters.week : ''} ${filters.system ? 'System: ' + filters.system : ''}`, 14, 35);
    }

    // KPIs
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Key Metrics', 14, 45);
    
    doc.autoTable({
      startY: 50,
      head: [['Metric', 'Value']],
      body: [
        ['Total Budget', `$${dashboardData.kpis.totalBudget.toLocaleString()}`],
        ['Spent', `$${dashboardData.kpis.spent.toLocaleString()}`],
        ['Remaining', `$${dashboardData.kpis.remaining.toLocaleString()}`],
        ['Overrun Risk', dashboardData.kpis.risk]
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102] }
    });

    // Hours Tracking section (new)
    if (dashboardData.hoursTracking) {
      const hoursY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Hours Tracking & Projections', 14, hoursY);
      
      doc.autoTable({
        startY: hoursY + 5,
        head: [['Metric', 'Value']],
        body: [
          ['Total Hours Allocated', dashboardData.hoursTracking.totalHoursAllocated],
          ['Hours Used', dashboardData.hoursTracking.totalHoursUsed],
          ['Hours Remaining', dashboardData.hoursTracking.completionMetrics.hoursRemaining],
          ['Completion Percentage', `${dashboardData.hoursTracking.completionMetrics.percentageComplete}%`],
          ['Planned End Date', new Date(dashboardData.hoursTracking.plannedEndDate).toLocaleDateString()],
          ['Projected End Date', new Date(dashboardData.hoursTracking.projectedEndDate).toLocaleDateString()],
          ['Estimated Weeks Remaining', dashboardData.hoursTracking.completionMetrics.estimatedWeeksRemaining.toFixed(1)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102] }
      });
    }

    // Schedule Status
    const scheduleY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Schedule Status', 14, scheduleY);
    
    doc.autoTable({
      startY: scheduleY + 5,
      head: [['Task', 'Planned %', 'Actual %']],
      body: dashboardData.schedule.map(item => [
        item.task,
        item.Planned,
        item.Actual
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102] }
    });

    // Issues
    if (doc.lastAutoTable.finalY > 230) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Recent Issues', 14, 20);
      
      doc.autoTable({
        startY: 25,
        head: [['Date', 'System', 'Issue', 'Impact', 'Accountability']],
        body: (filters.system 
          ? dashboardData.issues.filter(i => i.system === filters.system)
          : dashboardData.issues
        ).map(item => [
          item.date,
          item.system,
          item.issue,
          item.impact,
          item.accountability
        ]),
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102] }
      });
    } else {
      const issuesY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Recent Issues', 14, issuesY);
      
      doc.autoTable({
        startY: issuesY + 5,
        head: [['Date', 'System', 'Issue', 'Impact', 'Accountability']],
        body: (filters.system 
          ? dashboardData.issues.filter(i => i.system === filters.system)
          : dashboardData.issues
        ).map(item => [
          item.date,
          item.system,
          item.issue,
          item.impact,
          item.accountability
        ]),
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102] }
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Higuera Project - Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Confidential - Ayala Development Inc.`, doc.internal.pageSize.width - 65, doc.internal.pageSize.height - 10);
    }

    const duration = performance.now() - startTime;
    trackMetric('pdfGenerationDuration', duration);

    // Send the PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=higuera-summary-${new Date().toISOString().split('T')[0]}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    
    trackException(error, {
      operation: 'generatePdf',
      filters: JSON.stringify(req.body?.filters),
      errorDetails: error.toString()
    });

    const statusCode = error.message === 'Method not allowed' ? 405 : 500;
    res.status(statusCode).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

function formatCurrency(number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
}