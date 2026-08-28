import type { NextConfig } from "next";

const backendUrl = (process.env.CHAOTIC_CUSTOM_AI_URL ?? "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      { source: "/api/v1/custom-product", destination: `${backendUrl}/api/v1/custom-product` },
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/health", destination: `${backendUrl}/health` },
    ];
  },
};

export default nextConfig;
