/** Public site origin for curl examples (no trailing slash). */
export function publicApiBase(): string {
  const configured = process.env.EPDAGENT_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
