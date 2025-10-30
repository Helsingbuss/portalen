import { createClient } from "@supabase/supabase-js";
const clean = (v?: string) => (v ?? "").trim().replace(/\/+$/, "");
const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url) throw new Error("Supabase URL saknas (.env.local)");
if (!key) throw new Error("Supabase nyckel saknas (.env.local)");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
export default supabase;
