// src/lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL || // fallback om du råkat döpa den så
  "";

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||            // vanligast
  process.env.SUPABASE_SERVICE_ROLE_KEY ||       // alternativt
  "";

if (!URL || !SERVICE_KEY) {
  throw new Error(
    "Supabase admin saknar miljövariabler. Sätt NEXT_PUBLIC_SUPABASE_URL och SUPABASE_SERVICE_KEY."
  );
}

const client: SupabaseClient = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "X-Client-Info": "helsingbuss-portal/admin" } },
});

// ✅ default export (import supabaseAdmin from "@/lib/supabaseAdmin")
export default client;

// ✅ named export (import { supabaseAdmin } from "@/lib/supabaseAdmin")
export const supabaseAdmin = client;

// ✅ legacy alias (import { supabase } from "@/lib/supabaseAdmin")
export const supabase = client;

// ✅ helper (import { requireAdmin } from "@/lib/supabaseAdmin")
export function requireAdmin(): SupabaseClient {
  return client;
}
