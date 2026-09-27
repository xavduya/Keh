import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Images are uploaded through Server Actions (5 MB each, see
      // MAX_UPLOAD_BYTES); the brand form can send a logo and a brand image
      // together. The default 1 MB body limit is too small.
      bodySizeLimit: "11mb",
    },
  },
  images: {
    remotePatterns: [
      // Supabase Storage — your project's public image bucket
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Unsplash CDN — product images in supabase/seed.sql (dev seed only)
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
