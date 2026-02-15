import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict Mode double-mounts components in dev, which causes duplicate
  // getUserMedia calls that deadlock the PipeWire camera portal on Linux.
  // Safe to disable — Strict Mode has no effect in production builds.
  reactStrictMode: false,
};

export default nextConfig;
