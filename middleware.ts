// middleware.ts
import { NextResponse } from "next/server";
export function middleware(req: Request) {
  const { pathname } = new URL(req.url);
  if (
    pathname.startsWith("/api/offert/create") ||
    pathname.startsWith("/api/offert/ticket") ||
    pathname.startsWith("/api/offert/selftest")
  ) {
    return NextResponse.next();
  }
  return NextResponse.next();
}
