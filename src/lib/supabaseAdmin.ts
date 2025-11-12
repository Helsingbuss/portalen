// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL) {
  console.error("[supabaseAdmin] Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL");
}
if (!SUPABASE_SERVICE_ROLE) {
  console.error("[supabaseAdmin] Missing SUPABASE_SERVICE_ROLE (service role key)");
}

export const supabaseAdmin = createClient(String(SUPABASE_URL), String(SUPABASE_SERVICE_ROLE), {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { headers: { "X-Client-Info": "helsingbuss-admin" } }
});

export default supabaseAdmin;
