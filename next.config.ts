import type { NextConfig } from "next";
import { DOCS_URL } from "./src/config/links";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    proxyClientMaxBodySize: '50mb',
  },
  async redirects() {
    return [
      {
        source: '/docs',
        destination: DOCS_URL,
        permanent: true,
      },
      {
        source: '/docs/:path*',
        destination: `${DOCS_URL}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
