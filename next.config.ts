import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (supabaseUrl) {
  const parsed = new URL(supabaseUrl);

  remotePatterns.push({
    protocol: parsed.protocol.replace(":", "") as "http" | "https",
    hostname: parsed.hostname,
  });
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns,
  },
};

export default nextConfig;
