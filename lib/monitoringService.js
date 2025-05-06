import appInsights from "applicationinsights";

// Initialize Application Insights if not already started
if (!appInsights.defaultClient) {
  const connString = process.env.APPINSIGHTS_CONNECTION_STRING || process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
  if (connString) {
    appInsights.setup(connString)
      .setAutoCollectRequests(false)
      .setAutoCollectPerformance(false)
      .setAutoCollectExceptions(false)
      .setAutoCollectDependencies(false)
      .setAutoDependencyCorrelation(false)
      .start();
  }
}

const client = appInsights.defaultClient;

export const trackEvent = async (name, properties) => {
  if (client) client.trackEvent({ name, properties });
};

export const trackMetric = async (name, value, properties) => {
  if (client) client.trackMetric({ name, value, properties });
};

export const trackException = async (error, properties) => {
  if (client) client.trackException({ exception: error, properties });
};
