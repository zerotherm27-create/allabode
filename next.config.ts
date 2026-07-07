import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Next.js defaults Server Action bodies to 1MB — well under the 10MB
      // government-ID upload allowed by the contract-signing flow (phone
      // camera photos are commonly 2-8MB). Without this, uploads silently
      // fail past 1MB.
      bodySizeLimit: "12mb",
    },
  },
  async redirects() {
    // Old marketing URLs (indexed + linked externally) → the restructured IA.
    return [
      { source: "/buy-sell", destination: "/property-solutions/brokerage", permanent: true },
      { source: "/leasing", destination: "/property-solutions/leasing", permanent: true },
      { source: "/property-management", destination: "/property-solutions/property-management", permanent: true },
      { source: "/documentation", destination: "/property-solutions/documentation-assistance", permanent: true },
      { source: "/appraisal", destination: "/valuation", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // The service worker must not be cached and needs root scope.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Baseline security hardening (per the Next.js PWA guide).
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
