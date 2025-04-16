// This file contains custom initialization code for Azure Static Web Apps
// It ensures proper environment configuration and handling of server-side modules

// This script runs before the app is initialized
console.log('Initializing Azure Static Web App environment');

// Check if required environment variables are set
if (typeof window !== 'undefined') {
  // Client-side environment variable fallbacks
  if (!window.ENV) {
    window.ENV = {};
  }
  window.ENV.AZURE_FUNCTION_URL = window.ENV.AZURE_FUNCTION_URL || 
    process.env.NEXT_PUBLIC_AZURE_FUNCTION_URL || 
    process.env.AZURE_FUNCTION_URL;
}

// Export an empty module - this is just for initialization
export {};