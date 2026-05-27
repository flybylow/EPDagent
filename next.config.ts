import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Keep pdfjs on Node with real worker path (local /api/extract only). */
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/extract/**/*": ["./node_modules/pdfjs-dist/**/*"],
    "/api/extract/step/**/*": ["./node_modules/pdfjs-dist/**/*"],
    "/epd/*": [
      "./templates/**/*.json",
      "./data/reference/**/*",
      "./out/phase_docmap/**/*",
    ],
    "/*": ["./templates/**/*.json"],
  },
};

export default nextConfig;
