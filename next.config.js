const createNextIntlPlugin = require('next-intl/plugin').default;
const nextIntlConfig = require('./next-intl.config.js');
const withNextIntl = createNextIntlPlugin(nextIntlConfig);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable the App Router under `/app`
  experimental: { appDir: true },
  reactStrictMode: true,
  env: {
    AZURE_FUNCTION_URL: process.env.AZURE_FUNCTION_URL || 'http://localhost:7071',
    CUSTOM_DOMAIN: 'https://higueradashboard.live'
  },
  // Disable image optimization for Static Web Apps
  images: {
    unoptimized: true
  },
  // Only apply rewrites in development, not during build
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.AZURE_FUNCTION_URL || 'http://localhost:7071'}/api/:path*`
        }
      ];
    }
    return [
      {
        source: '/higuera-dashboard',
        destination: '/higuera-dashboard/index.html'
      },
      {
        source: '/higuera-dashboard/:path*',
        destination: '/higuera-dashboard/:path*'
      }
    ];
  },
  // Handle server-side packages that shouldn't be bundled in the client
  webpack: (config, { isServer }) => {
    // If it's a client-side bundle, exclude packages that are server-only
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        net: false,
        tls: false,
        'redis': false,
        '@azure/monitor-query': false,
        'exceljs': false,
        'applicationinsights': false,
        '@azure/applicationinsights': false,
        '@azure/identity': false,
        '@azure/keyvault-secrets': false,
        'jspdf': false,
        'jspdf-autotable': false,
        '@microsoft/microsoft-graph-client': false,
        '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials': false
      };
    }
    // On the server side, mark certain modules as external so they aren't resolved at build time
    if (isServer) {
      config.externals = [
        ...((config.externals instanceof Array) ? config.externals : []),
        'exceljs',
        '@azure/identity',
        'jspdf-autotable',
        '@microsoft/microsoft-graph-client',
        '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
      ];
    }
    return config;
  }
}

module.exports = withNextIntl(nextConfig);