// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

if (!URL || !SERVICE_KEY) {
  console.error("❌ Supabase env saknas", {
    hasUrl: !!URL,
    hasServiceKey: !!SERVICE_KEY,
  });
}

export const supabaseAdmin = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: process.env.SUPABASE_SCHEMA || "public" },
  global: { headers: { "X-Client-Info": "hb-portal-server" } },
});

// kompatibla exports
export const supabase = supabaseAdmin;
export default supabaseAdmin;

console.log("✅ Supabase admin klar", {
  hasUrl: !!URL,
  keyLen: SERVICE_KEY.length,
});
