import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* any other config options here */
  assetPrefix:
    process.env.NODE_ENV === "production"
      ? "https://kashmiri-shraad.vercel.app"
      : undefined,
};

export default nextConfig;