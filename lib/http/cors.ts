import { NextResponse } from "next/server";

const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://tabulas.eu",
  "https://www.tabulas.eu",
];

/** Paths that accept cross-origin reads (Tabulas / Pentapylas prototype). */
export function isCorsApiPath(pathname: string): boolean {
  return (
    pathname === "/api/epds" ||
    pathname === "/api/products" ||
    pathname === "/api/products/types" ||
    pathname.startsWith("/api/facts/") ||
    pathname.startsWith("/api/graph/")
  );
}

export function corsAllowedOrigins(): string[] {
  const raw = process.env.EPDAGENT_CORS_ORIGINS?.trim();
  if (!raw) return DEFAULT_ORIGINS;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

function originAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = corsAllowedOrigins();
  if (allowed.includes("*")) return true;
  return allowed.includes(origin);
}

export function corsHeaders(origin: string | null): HeadersInit {
  const allowed = originAllowed(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (allowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

export function withCors(request: Request, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export function corsPreflightResponse(request: Request): NextResponse {
  const origin = request.headers.get("origin");
  if (!originAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
