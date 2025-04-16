import { withApiAuth } from '../../lib/middleware';
import { trackEvent, trackMetric } from '../../lib/monitoringService';
import fs from 'fs';
import path from 'path';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = performance.now();

  try {
    const { workerName, weekEnding, hours, totalHours } = req.body;
    
    if (!workerName || !weekEnding || !hours || typeof totalHours !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Read the current data.json file
    const dataPath = path.join(process.cwd(), 'public', 'data', 'data.json');
    const dataRaw = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(dataRaw);

    // Initialize workerHours if it doesn't exist
    if (!data.workerHours) {
      data.workerHours = [];
    }

    // Check if entry for this worker and week already exists
    const existingEntryIndex = data.workerHours.findIndex(
      entry => entry.workerName === workerName && entry.weekEnding === weekEnding
    );

    if (existingEntryIndex !== -1) {
      // Update existing entry
      data.workerHours[existingEntryIndex].hours = hours;
      data.workerHours[existingEntryIndex].totalHours = totalHours;
    } else {
      // Create new entry
      data.workerHours.push({
        workerName,
        weekEnding,
        hours,
        totalHours
      });
    }

    // Find the current week in weeklyHours
    const weekIndex = data.hoursTracking.weeklyHours.findIndex(
      week => week.weekEnding === weekEnding
    );
    
    // Update the hours tracking data at the project level
    if (weekIndex !== -1) {
      // If we're updating hours, account for any previous logged hours
      const previousHours = existingEntryIndex !== -1 
        ? data.workerHours[existingEntryIndex].totalHours
        : 0;
      
      // Calculate delta (could be positive or negative)
      const hoursDelta = totalHours - previousHours;
      
      // Only update if there's a change
      if (hoursDelta !== 0) {
        // Update the week's actual hours
        data.hoursTracking.weeklyHours[weekIndex].hoursActual += hoursDelta;
        data.hoursTracking.weeklyHours[weekIndex].cumulativeActual += hoursDelta;
        
        // Update all subsequent weeks' cumulative values
        for (let i = weekIndex + 1; i < data.hoursTracking.weeklyHours.length; i++) {
          data.hoursTracking.weeklyHours[i].cumulativeActual += hoursDelta;
        }
        
        // Update total hours used
        data.hoursTracking.totalHoursUsed += hoursDelta;
        
        // Recalculate metrics
        data.hoursTracking.completionMetrics.hoursRemaining = 
          data.hoursTracking.totalHoursAllocated - data.hoursTracking.totalHoursUsed;
        
        data.hoursTracking.completionMetrics.percentageComplete = 
          (data.hoursTracking.totalHoursUsed / data.hoursTracking.totalHoursAllocated * 100).toFixed(1);
        
        // Calculate new burn rate and projected completion
        const completedWeeks = data.hoursTracking.weeklyHours.filter(
          week => week.hoursActual > 0
        ).length;
        
        data.hoursTracking.completionMetrics.burndownRate = 
          data.hoursTracking.totalHoursUsed / completedWeeks;
        
        data.hoursTracking.completionMetrics.estimatedWeeksRemaining = 
          data.hoursTracking.completionMetrics.hoursRemaining / 
          data.hoursTracking.completionMetrics.burndownRate;
        
        // Calculate new projected end date
        const projectedEndDateObj = new Date();
        projectedEndDateObj.setDate(
          projectedEndDateObj.getDate() + 
          (data.hoursTracking.completionMetrics.estimatedWeeksRemaining * 7)
        );
        data.hoursTracking.projectedEndDate = projectedEndDateObj.toISOString().split('T')[0];
      }
    }

    // Make a backup of the data.json file before writing
    const backupDir = path.join(process.cwd(), 'public', 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `data-${timestamp}.json`);
    fs.writeFileSync(backupPath, dataRaw);

    // Write the updated data back to the file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    // Track the operation
    trackEvent('workerHoursLogged', {
      workerName,
      weekEnding,
      totalHours,
      hoursDelta: existingEntryIndex !== -1 ? totalHours - data.workerHours[existingEntryIndex].totalHours : totalHours
    });

    const duration = performance.now() - startTime;
    trackMetric('workerHoursLogDuration', duration);

    return res.status(200).json({
      success: true,
      workerHours: data.workerHours.filter(entry => entry.workerName === workerName),
      hoursTracking: data.hoursTracking,
      message: 'Worker hours logged successfully'
    });
  } catch (error) {
    console.error('Failed to log worker hours:', error);
    
    trackEvent('workerHoursError', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({ error: error.message || 'Failed to log worker hours' });
  }
}

export default withApiAuth(handler);