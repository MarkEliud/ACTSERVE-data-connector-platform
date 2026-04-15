/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Disable ESLint during production build (run separately in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript type checking during build (run separately in CI)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Environment variables available to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  },
  
  // Image optimization domains
  images: {
    domains: ['localhost'],
    unoptimized: false,
  },
  
  // Output standalone directory for production
  output: 'standalone',
  
  // Compress responses
  compress: true,
  
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;