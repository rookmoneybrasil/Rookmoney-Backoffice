import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Proxy /api/v1 calls to avoid CORS + cookie issues in dev
  async rewrites() {
    return [
      {
        source:      '/api/proxy/:path*',
        destination: `${API_URL}/api/v1/:path*`,
      },
    ]
  },
};

export default nextConfig;
