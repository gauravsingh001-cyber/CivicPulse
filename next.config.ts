import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile testing via local network IP
  // @ts-ignore
  allowedDevOrigins: ["172.29.87.240", "localhost"],
};

export default nextConfig;
