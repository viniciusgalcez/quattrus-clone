import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker consumes Next's minimal standalone server. Vercel needs the
  // platform-managed output so its post-build step can assemble functions.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  experimental: {
    // Server Actions default to 1 MB. Leave multipart overhead below Vercel's
    // 4.5 MB request limit; the import validator caps files at 4 MB there.
    serverActions: { bodySizeLimit: process.env.VERCEL ? "4.25mb" : "16mb" },
  },
  images: {
    qualities: [75, 92],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
