import path from 'path';
import { fileURLToPath } from 'url';

/** @type {import('next').NextConfig} */
const defaultDistDir = process.env.NODE_ENV === 'development' ? '.next-dev' : '.next';
const distDir = process.env.NEXT_DIST_DIR?.trim() || defaultDistDir;
const outputFileTracingRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const nextConfig = {
  distDir,
  outputFileTracingRoot,
  reactStrictMode: true,
  // PWA Configuration
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Exclude Node.js modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        util: false,
      };
    }
    return config;
  },
};

export default nextConfig;
