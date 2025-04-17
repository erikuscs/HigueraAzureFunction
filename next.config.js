/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    AZURE_FUNCTION_URL: process.env.AZURE_FUNCTION_URL || 'http://localhost:7071',
    CUSTOM_DOMAIN: 'https://higueradashboard.live'
  },
  // Change to export for better Static Web Apps compatibility
  output: 'export',
  // This setting is required for Static Web Apps deployment with Next.js
  trailingSlash: true,
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
    return [];
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
        '@azure/keyvault-secrets': false
      };
    }
    return config;
  }
}

module.exports = nextConfig