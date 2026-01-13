import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Optimize for production
    optimizePackageImports: ['react-markdown'],
  },
};

export default nextConfig;
