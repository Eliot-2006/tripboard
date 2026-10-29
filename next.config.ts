import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-only "N" badge sits over the phone bottom sheet's Edit button and swallows taps.
  devIndicators: false,
  // ponytail: no Content-Security-Policy yet; it needs nonces for Next's inline scripts plus the Supabase and tile hosts.
  headers: () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        // The browser default, stated so map tile requests keep sending the origin MapTiler's key restriction checks.
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default nextConfig;
