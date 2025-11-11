// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ""; // <- service role key (server only)

const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||
  ""; // fallback (read-only)

const keyToUse = serviceKey || anonKey; // prioriterar service role
export const supabaseAdmin = createClient(url, keyToUse, {
  auth: { persistSession: false },
});

export const supabase = supabaseAdmin; // bakåtkomp.
export default supabaseAdmin;
