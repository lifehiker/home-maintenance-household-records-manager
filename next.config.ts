import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
