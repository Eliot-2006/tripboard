import type { NextConfig } from "next";

// The dev-only "N" badge sits over the phone bottom sheet's Edit button and swallows taps.
const nextConfig: NextConfig = { devIndicators: false };

export default nextConfig;
