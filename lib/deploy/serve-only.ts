/**
 * Vercel / production deploy is read-only (Facts API). Skip on-request PDF parsing
 * that needs pdfjs + optional canvas (docmap / phase7 refresh).
 *
 * Opt in to PDF parsing locally with EPDAGENT_ALLOW_PDF_PARSE=1 (e.g. in .env.local).
 */
export function isServeOnlyDeploy(): boolean {
  if (process.env.EPDAGENT_ALLOW_PDF_PARSE === "1") return false;
  if (process.env.EPDAGENT_SERVE_ONLY === "1") return true;
  if (process.env.VERCEL === "1") return true;
  if (process.env.VERCEL_ENV) return true;
  return false;
}
