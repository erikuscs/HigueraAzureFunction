// Use conditional imports for server-side only modules
let DefaultAzureCredentialClass = null;
let trackExceptionFn = null;

// Only import server-side modules when running on the server
if (typeof window === 'undefined') {
  try {
    const { DefaultAzureCredential } = require('@azure/identity');
    const { trackException } = require('./monitoringService');
    
    DefaultAzureCredentialClass = DefaultAzureCredential;
    trackExceptionFn = trackException;
  } catch (error) {
    console.error('Error importing server-side modules:', error);
  }
}

// Reusable error types
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Retry logic with exponential backoff
async function withRetry(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, 10000);
      
      if (typeof window === 'undefined' && trackExceptionFn) {
        trackExceptionFn(error, {
          operation: 'retry',
          attempt: attempt.toString(),
          nextDelay: delay.toString()
        });
      }

      await sleep(delay);
    }
  }
  
  throw lastError;
}

function isRetryableError(error) {
  const retryableCodes = [408, 429, 500, 502, 503, 504];
  const retryableMessages = [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EPIPE',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ESOCKETTIMEDOUT'
  ];

  return (
    retryableCodes.includes(error.statusCode) ||
    retryableMessages.includes(error.code) ||
    error.message.toLowerCase().includes('timeout') ||
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('temporarily unavailable')
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced error response formatter
function formatErrorResponse(error) {
  const response = {
    error: {
      message: error.message,
      type: error.name,
      statusCode: error.statusCode || 500
    }
  };

  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
    response.error.details = error.details;
  }

  return response;
}

// Application Insights integration
const appInsightsEnabled = typeof window === 'undefined' && !!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

function logError(error, context = {}) {
  if (typeof window === 'undefined' && trackExceptionFn) {
    trackExceptionFn(error, {
      ...context,
      timestamp: new Date().toISOString(),
      errorName: error.name,
      errorMessage: error.message,
      stackTrace: error.stack
    });
  }
}

function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  } else if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  } else if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email);
}

function formatDashboardData(data) {
  try {
    if (!data || typeof data !== 'object') {
      throw new AppError('Invalid dashboard data', 400);
    }

    const kpiSection = formatKPISection(data.kpis);
    const issuesSection = formatIssuesSection(data.issues);
    const scheduleSection = formatScheduleSection(data.schedule);

    return `${kpiSection}${issuesSection}${scheduleSection}`;
  } catch (error) {
    if (typeof window === 'undefined' && trackExceptionFn) {
      trackExceptionFn(error, { operation: 'formatDashboardData' });
    }
    throw new AppError('Error formatting dashboard data', 500);
  }
}

function formatKPISection(kpis) {
  if (!kpis || typeof kpis !== 'object') {
    throw new AppError('Invalid KPI data', 400);
  }

  return `
HIGUERA PROJECT - EXECUTIVE SUMMARY

KEY METRICS:
• Total Budget: ${formatCurrency(kpis.totalBudget)}
• Spent: ${formatCurrency(kpis.spent)}
• Remaining: ${formatCurrency(kpis.remaining)}
• Overrun Risk: ${kpis.risk}
`;
}

function formatIssuesSection(issues) {
  if (!Array.isArray(issues)) {
    throw new AppError('Invalid issues data', 400);
  }

  const recentIssues = issues
    .slice(0, 5)
    .map(issue => `
• ${issue.date} - ${issue.system}
  Issue: ${sanitizeInput(issue.issue)}
  Impact: ${sanitizeInput(issue.impact)}
  Accountability: ${sanitizeInput(issue.accountability)}`)
    .join('\n');

  return `
RECENT ISSUES:${recentIssues}`;
}

function formatScheduleSection(schedule) {
  if (!Array.isArray(schedule)) {
    throw new AppError('Invalid schedule data', 400);
  }

  const scheduleItems = schedule
    .map(item => `• ${sanitizeInput(item.task)}: Plan ${item.Planned}% vs Actual ${item.Actual}%`)
    .join('\n');

  return `
SCHEDULE STATUS:
${scheduleItems}

For detailed charts and visualizations, please visit the project dashboard.
`;
}

function formatCurrency(number) {
  if (typeof number !== 'number' || isNaN(number)) {
    throw new AppError('Invalid currency value', 400);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
}

module.exports = {
  AppError,
  withRetry,
  sleep,
  sanitizeInput,
  validateEmail,
  formatDashboardData,
  formatCurrency,
  formatErrorResponse,
  logError
};