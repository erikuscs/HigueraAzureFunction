/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    AZURE_FUNCTION_URL: process.env.AZURE_FUNCTION_URL || 'http://localhost:7071'
  }
}

module.exports = nextConfig