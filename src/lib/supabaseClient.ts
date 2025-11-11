// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||
  "";

export const supabaseClient = createClient(url, anonKey, {
  auth: { persistSession: true },
});

export default supabaseClient;
