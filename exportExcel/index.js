const ExcelJS = require('exceljs');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const { trackException, trackMetric, trackEvent } = require('../lib/monitoringService');
const { withRetry, AppError } = require('../lib/utils');
const { applySecurityMiddleware, addSecurityHeaders, validateToken } = require('../lib/securityMiddleware');
const { cacheService } = require('../lib/cacheService');

module.exports = async function (context, req) {
    const startTime = Date.now();
    
    try {
        context.log('Excel export function started');
        
        // Apply security middleware (similar to sendEmail function)
        try {
            await new Promise((resolve, reject) => {
                applySecurityMiddleware(context, req, (err) => {
                    if (err) reject(new Error(err.message || 'Security middleware error'));
                    else resolve();
                });
            });
            
            // Validate authentication if not in development
            if (process.env.NODE_ENV !== 'development') {
                const authHeader = req.headers?.authorization;
                if (!await validateToken(authHeader)) {
                    throw new AppError('Unauthorized', 401);
                }
            }
        } catch (secError) {
            context.log.error('Security validation failed:', secError);
            throw new AppError(secError.message || 'Authorization failed', 401);
        }
        
        // Try to get data from cache first
        const cacheKey = 'project_data';
        let projectData = await cacheService.get(cacheKey);
        
        // Replace the file system section with this Azure Blob Storage implementation:
        if (!projectData) {
            // Get correlation ID for request tracing
            const correlationId = req.headers['x-correlation-id'] || 
                                  req.headers['x-request-id'] || 
                                  context.invocationId;
            
            try {
                // Initialize the BlobServiceClient
                const connectionString = process.env.AzureWebJobsStorage;
                const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
                const containerClient = blobServiceClient.getContainerClient('project-data');
                const blobClient = containerClient.getBlobClient('data.json');
                
                context.log(`Loading data from blob: ${blobClient.url}`);
                
                // Download the blob content
                const downloadResponse = await blobClient.download();
                
                // Process the stream
                const chunks = [];
                for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
                }
                
                // Parse JSON data
                const dataRaw = Buffer.concat(chunks).toString('utf8');
                projectData = JSON.parse(dataRaw);
                
                // Cache the data for 5 minutes
                await cacheService.set(cacheKey, projectData, 300);
                
                // Track successful data retrieval
                trackEvent('blobDataRetrieved', {
                    correlationId,
                    container: 'project-data',
                    blob: 'data.json'
                });
            } catch (dataError) {
                context.log.error('Failed to load data from Azure Blob Storage:', dataError);
                trackException(dataError, {
                    correlationId,
                    operation: 'blobDataRetrieval',
                    container: 'project-data',
                    blob: 'data.json'
                });
                throw new AppError('Failed to load project data from storage', 500);
            }
        }
        
        // Generate Excel report with retry logic for resilience
        const excelBuffer = await withRetry(async () => {
            // Create a new Excel workbook
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Higuera Project Dashboard';
            workbook.lastModifiedBy = 'Azure Function';
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
            return await workbook.xlsx.writeBuffer();
        }, 3);  // Retry up to 3 times
        
        // Add security headers to response
        addSecurityHeaders(context);
        
        // Track detailed metrics
        const duration = Date.now() - startTime;
        trackMetric('excelExportDuration', duration, {
            sheetCount: workbook.worksheets.length,
            issueCount: (projectData.issues || []).length,
            taskCount: (projectData.schedule || []).length
        });

        // Add comprehensive event tracking
        trackEvent('excelExport', {
            functionName: context.executionContext.functionName,
            duration: duration.toString(),
            fileSize: excelBuffer.length,
            correlationId: req.headers['x-correlation-id'] || context.invocationId,
            timestamp: new Date().toISOString()
        });
        
        // Return Excel file
        context.log('Excel export completed successfully');
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename=Higuera-Project-Export-${new Date().toISOString().split('T')[0]}.xlsx`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            body: excelBuffer
        };
    } catch (error) {
        // Handle any errors that occur
        context.log.error('Excel export error:', error);
        
        // Track exception
        trackException(error, {
            functionName: context.executionContext.functionName,
            invocationId: context.invocationId
        });
        
        context.res = {
            status: error.statusCode || 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: error.message,
                correlationId: context.invocationId,
                timestamp: new Date().toISOString()
            }
        };
    } finally {
        // Always track function duration
        const duration = Date.now() - startTime;
        trackMetric('functionDuration', duration, {
            functionName: context.executionContext.functionName,
            success: (!context.res?.status || context.res.status < 400).toString()
        });
    }
};