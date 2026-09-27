import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Product photos are uploaded through a Server Action (limit 5 MB, see
      // MAX_UPLOAD_BYTES). The default 1 MB body limit is too small.
      bodySizeLimit: "6mb",
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
      // Unsplash CDN — used by the current mock product images
      // Remove once product images are stored in Supabase Storage
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
