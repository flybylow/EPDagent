/**
 * Vercel deployment is read-only (Facts API). Skip on-request PDF parsing
 * that needs pdfjs + optional canvas (docmap / phase7 refresh).
 */
export function isServeOnlyDeploy(): boolean {
  return process.env.EPDAGENT_SERVE_ONLY === "1" || process.env.VERCEL === "1";
}
