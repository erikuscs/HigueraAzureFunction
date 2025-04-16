import { trackException, trackMetric } from '../../lib/monitoringService';

export default async function handler(req, res) {
  const startTime = performance.now();

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }

    const bearerToken = authHeader.substring(7);
    if (!bearerToken) {
      throw new Error('No bearer token provided');
    }

    const { dashboardData } = req.body;
    if (!dashboardData) {
      throw new Error('No dashboard data provided');
    }

    // Forward request to Azure Function
    const functionEndpoint = process.env.AZURE_FUNCTION_URL;
    if (!functionEndpoint) {
      throw new Error('Azure Function URL not configured');
    }

    const response = await fetch(functionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
      },
      body: JSON.stringify({ dashboardData })
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to send email');
    }

    const duration = performance.now() - startTime;
    trackMetric('apiEmailDuration', duration);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error forwarding request to Azure Function:', error);
    
    trackException(error, {
      operation: 'sendEmailApi',
      authorization: req.headers.authorization ? 'present' : 'missing',
      statusCode: error.response?.status,
      functionEndpoint: process.env.AZURE_FUNCTION_URL ? 'configured' : 'missing'
    });

    const statusCode = error.message === 'Method not allowed' ? 405 :
                      error.message.includes('authorization') ? 401 :
                      error.response?.status || 500;

    return res.status(statusCode).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}