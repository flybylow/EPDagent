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
      "./out/phase1_filename/**/*",
      "./out/phase2_header/**/*",
      "./out/phase3_product/**/*",
      "./out/phase3_composition/**/*",
      "./out/phase3_lca_study/**/*",
      "./out/phase4_lca_probe/**/*",
      "./out/phase5_scenarios/**/*",
      "./out/phase6_refs/**/*",
      "./out/phase7_epd_sections/**/*",
    ],
    "/": [
      "./out/phase1_filename/**/*",
      "./out/phase2_header/**/*",
      "./out/phase_docmap/**/*",
    ],
    "/*": ["./templates/**/*.json"],
  },
};

export default nextConfig;
