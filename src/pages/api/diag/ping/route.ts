// src/app/api/diag/ping/route.ts
import { NextResponse } from "next/server";




export const dynamic = "force-dynamic"; // undvik cache
export const runtime = "nodejs";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

export async function GET() {
  return NextResponse.json(
    { ok: true, via: "app", method: "GET", time: new Date().toISOString() },
    { headers: corsHeaders() }
  );
}

export async function POST() {
  return NextResponse.json(
    { ok: true, via: "app", method: "POST", time: new Date().toISOString() },
    { headers: corsHeaders() }
  );
}

