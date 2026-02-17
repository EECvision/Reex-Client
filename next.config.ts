import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    proxyClientMaxBodySize: '50mb',
  },
  async rewrites() {
    return [
      {
        source: '/docs',
        destination: 'https://reex-api-docs.vercel.app/docs',
      },
      {
        source: '/docs/:path*',
        destination: 'https://reex-api-docs.vercel.app/docs/:path*',
      },
    ];
  },
};

export default nextConfig;
