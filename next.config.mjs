import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    
    return config;
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  env: {
    FLAVOR: process.env.FLAVOR || process.env.NEXT_PUBLIC_FLAVOR || 'default',
    NEXT_PUBLIC_FLAVOR: process.env.FLAVOR || process.env.NEXT_PUBLIC_FLAVOR || 'default',
  },
};

export default nextConfig;
