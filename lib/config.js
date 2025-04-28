// lib/config.js
// Stub configuration loader for Azure Functions
// Replace with real Key Vault or env-based secret retrieval as needed

module.exports.getSecretConfig = () => ({
  // Example: retrieve Application Insights instrumentation key or other secrets
  appInsightsConnectionString: process.env.APPINSIGHTS_CONNECTION_STRING || process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
  // Add additional secret keys here
});
