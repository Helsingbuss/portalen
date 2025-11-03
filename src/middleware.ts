import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const path = req.nextUrl.pathname;

  // Tillåt alltid Vercels interna paths och statiska filer
  if (path.startsWith("/_next") || path === "/favicon.ico") {
    return NextResponse.next();
  }

  // På api.helsingbuss.se: endast /api/* och /widget/*
  if (host.startsWith("api.")) {
    if (path.startsWith("/api/") || path.startsWith("/widget/")) {
      return NextResponse.next();
    }
    return new NextResponse("Not Found", { status: 404 });
  }

  // På login.helsingbuss.se: hela appen
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
