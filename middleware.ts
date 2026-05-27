import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { corsHeaders, corsPreflightResponse, isCorsApiPath } from "@/lib/http/cors";

export function middleware(request: NextRequest) {
  if (!isCorsApiPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return corsPreflightResponse(request);
  }

  const response = NextResponse.next();
  const origin = request.headers.get("origin");
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    "/api/epds",
    "/api/products",
    "/api/products/types",
    "/api/facts/:path*",
    "/api/graph/:path*",
  ],
};
