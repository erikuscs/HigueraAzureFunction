const { Client } = require("@microsoft/microsoft-graph-client");
const { DefaultAzureCredential } = require("@azure/identity");
const { getSecretConfig } = require("../lib/config");
const { ipRestriction, validateRequest, monitorPerformance } = require("../lib/middleware");
const { trackException, trackMetric, trackEvent } = require("../lib/monitoringService");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const { withRetry, AppError, logError, formatDashboardData } = require('../lib/utils');
const { cacheService } = require('../lib/cacheService');
const { applySecurityMiddleware, addSecurityHeaders, validateToken } = require('../lib/securityMiddleware');
require("isomorphic-fetch");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithExponentialBackoff(operation, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || i === maxRetries - 1) throw error;
      
      const delayMs = Math.pow(2, i) * 1000 + Math.random() * 1000;
      console.log(`Attempt ${i + 1} failed, retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

function shouldRetry(error) {
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  return retryableStatusCodes.includes(error.statusCode) || 
         error.code === 'ServiceTemporarilyUnavailable';
}

function formatCurrency(number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
}

// Removed duplicate formatDashboardData function as it's already imported from ../lib/utils

module.exports = async function (context, req) {
    const startTime = Date.now();
    const performanceMonitor = monitorPerformance(context, 'sendEmail');
    
    try {
        // Apply security middleware
        await new Promise((resolve, reject) => {
            applySecurityMiddleware(context, req, (err) => {
                if (err) reject(new Error(err.message || 'Security middleware error'));
                else resolve();
            });
        });

        // Validate authentication
        const authHeader = req.headers?.authorization;
        if (!await validateToken(authHeader)) {
            throw new AppError('Unauthorized', 401);
        }

        // Get email parameters from request
        const { recipients } = req.body;
        if (!recipients || !Array.isArray(recipients)) {
            throw new AppError('Invalid recipients', 400);
        }

        // Try to get dashboard data from cache first
        const cacheKey = 'dashboard_data';
        let dashboardData = await cacheService.get(cacheKey);
        
        if (!dashboardData) {
            // If not in cache, generate new data
            const data = require('../public/data/data.json');
            dashboardData = formatDashboardData(data);
            
            // Cache the formatted data for 5 minutes
            await cacheService.set(cacheKey, dashboardData, 300);
        }

        // Initialize Graph client with managed identity
        const credential = new DefaultAzureCredential();
        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: ['https://graph.microsoft.com/.default']
        });
        const client = Client.initWithMiddleware({ authProvider });

        // Send email with retry logic
        await withRetry(async () => {
            const message = {
                subject: "Higuera Project - Executive Summary",
                body: {
                    contentType: 'HTML',
                    content: dashboardData
                },
                toRecipients: recipients.map(email => ({
                    emailAddress: { address: email }
                }))
            };

            await client.api('/me/sendMail')
                .post({ message });
        });

        // Track successful email send
        const duration = Date.now() - startTime;
        trackMetric('emailSendDuration', duration);
        trackEvent('emailSent', {
            recipientCount: recipients.length.toString(),
            duration: duration.toString()
        });

        // Add security headers to response
        addSecurityHeaders(context);

        context.res = {
            status: 200,
            body: {
                message: "Executive summary email sent successfully",
                timestamp: new Date().toISOString(),
                correlationId: context.invocationId,
                recipients: {
                    to: recipients
                }
            }
        };
    } catch (error) {
        trackException(error, {
            functionName: context.executionContext.functionName,
            invocationId: context.invocationId
        });

        context.res = {
            status: error.statusCode || 500,
            body: {
                error: error.message,
                correlationId: context.invocationId,
                timestamp: new Date().toISOString()
            }
        };
    } finally {
        const duration = Date.now() - startTime;
        trackMetric('functionDuration', duration, {
            functionName: context.executionContext.functionName,
            success: (!context.res?.status || context.res.status < 400).toString()
        });
        performanceMonitor?.end();
    }
};