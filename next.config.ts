import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Keep pdfjs on Node with real worker path (docmap in /api/extract). */
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
