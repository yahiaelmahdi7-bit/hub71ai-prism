import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local browser checks use the loopback IP as well as localhost.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
