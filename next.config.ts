import type { NextConfig } from 'next';

const gateway = process.env.GATEWAY_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${gateway}/api/:path*` },
      { source: '/webhooks/:path*', destination: `${gateway}/webhooks/:path*` },
    ];
  },
};

export default config;
