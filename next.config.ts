import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/storage/:path*',
        destination: 'http://localhost:8000/storage/:path*',
      },
    ];
  },
};

export default nextConfig;
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // ← tambah ini
  },
};

export default nextConfig;