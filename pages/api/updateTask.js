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
    const { taskName, actualPercentage, hoursLogged } = req.body;
    
    if (!taskName || typeof actualPercentage !== 'number' || !hoursLogged) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Read the current data.json file
    const dataPath = path.join(process.cwd(), 'public', 'data', 'data.json');
    const dataRaw = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(dataRaw);

    // Update the task in the schedule
    const taskIndex = data.schedule.findIndex(task => task.task === taskName);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Calculate hours for this specific task and update
    const originalPercentage = data.schedule[taskIndex].Actual;
    data.schedule[taskIndex].Actual = actualPercentage;

    // Update the hours tracking data
    // 1. Update the total hours used
    data.hoursTracking.totalHoursUsed += hoursLogged;
    
    // 2. Update the current week's actual hours
    const today = new Date();
    const currentWeekEnding = new Date(today);
    const dayOfWeek = today.getDay();
    // Calculate the next Friday date
    const daysToAdd = (5 - dayOfWeek + 7) % 7;
    currentWeekEnding.setDate(today.getDate() + daysToAdd);

    // Format as ISO string and extract just the date part
    const currentWeekEndingStr = currentWeekEnding.toISOString().split('T')[0];
    
    // Find the current week in weeklyHours
    const weekIndex = data.hoursTracking.weeklyHours.findIndex(
      week => week.weekEnding === currentWeekEndingStr
    );
    
    if (weekIndex !== -1) {
      data.hoursTracking.weeklyHours[weekIndex].hoursActual += hoursLogged;
      data.hoursTracking.weeklyHours[weekIndex].cumulativeActual += hoursLogged;
      
      // Update all subsequent weeks' cumulative values
      for (let i = weekIndex + 1; i < data.hoursTracking.weeklyHours.length; i++) {
        data.hoursTracking.weeklyHours[i].cumulativeActual += hoursLogged;
      }
    }

    // 3. Calculate remaining hours
    data.hoursTracking.completionMetrics.hoursRemaining = 
      data.hoursTracking.totalHoursAllocated - data.hoursTracking.totalHoursUsed;
    
    // 4. Calculate new percentage complete
    data.hoursTracking.completionMetrics.percentageComplete = 
      (data.hoursTracking.totalHoursUsed / data.hoursTracking.totalHoursAllocated * 100).toFixed(1);
    
    // 5. Calculate new estimated weeks remaining
    const completedWeeks = data.hoursTracking.weeklyHours.filter(
      week => week.hoursActual > 0
    ).length;
    
    const totalHoursCompleted = data.hoursTracking.totalHoursUsed;
    data.hoursTracking.completionMetrics.burndownRate = totalHoursCompleted / completedWeeks;
    
    data.hoursTracking.completionMetrics.estimatedWeeksRemaining = 
      data.hoursTracking.completionMetrics.hoursRemaining / data.hoursTracking.completionMetrics.burndownRate;
    
    // 6. Calculate new projected end date
    const projectedEndDateObj = new Date();
    projectedEndDateObj.setDate(
      projectedEndDateObj.getDate() + 
      (data.hoursTracking.completionMetrics.estimatedWeeksRemaining * 7)
    );
    data.hoursTracking.projectedEndDate = projectedEndDateObj.toISOString().split('T')[0];

    // Write the updated data back to the file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    // Track the update
    trackEvent('taskCompleted', {
      taskName,
      newPercentage: actualPercentage,
      originalPercentage,
      hoursLogged,
      projectedEndDate: data.hoursTracking.projectedEndDate
    });

    const duration = performance.now() - startTime;
    trackMetric('taskUpdateDuration', duration);

    return res.status(200).json({
      success: true,
      task: data.schedule[taskIndex],
      hoursTracking: data.hoursTracking,
      message: 'Task and hours tracking updated successfully'
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    return res.status(500).json({ error: error.message || 'Failed to update task' });
  }
}

export default withApiAuth(handler);