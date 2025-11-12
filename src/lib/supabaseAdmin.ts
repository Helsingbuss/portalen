// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

if (!url) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL saknas");
}

/**
 * Normalfall: service role key (server-sida, full access).
 * Nödläge: om serviceKey saknas, använd anonKey (read-only) så att dev inte kraschar.
 */
let keyToUse = serviceKey || anonKey;
if (!keyToUse) {
  console.error("❌ Inga Supabase-nycklar hittades (.env.local)");
  keyToUse = "invalid-key"; // gör att Supabase svarar "Invalid API key" men Next fortsätter köra
}

export const supabase = createClient(url, keyToUse, { auth: { persistSession: false } });
export const supabaseAdmin = supabase; // vissa filer importerar detta namnet
export default supabase;               // andra använder default-import
