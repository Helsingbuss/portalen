// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Miljövariabler:
 * - URL prioriterar SUPABASE_URL (server) och faller tillbaka till NEXT_PUBLIC_SUPABASE_URL (client)
 * - Service key prioriterar SUPABASE_SERVICE_KEY och aliaserna SUPABASE_SERVICE_ROLE(_KEY)
 * - Anon key prioriterar NEXT_PUBLIC_SUPABASE_KEY och aliasen SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const url =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

// ---- Sanity checks (loggar tydligt i Vercel) ----
if (!url) {
  console.error("❌ SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL saknas – kan inte initiera Supabase-klient.");
}
if (!serviceKey) {
  console.warn(
    "⚠️ SUPABASE_SERVICE_KEY saknas. 'supabaseAdmin' skapas i READ-ONLY-läge (anon). " +
      "Skrivningar/insert kan misslyckas i API:er som kräver service role."
  );
}
if (!anonKey) {
  console.warn("⚠️ NEXT_PUBLIC_SUPABASE_KEY (anon) saknas – klientanrop från browsern kan fallera.");
}

// ---- Admin-klient (server): använder service key om finns, annars fall-back till anon (read-only) ----
const adminKeyToUse = serviceKey || anonKey || "invalid-key";
export const supabaseAdmin = createClient(url, adminKeyToUse, {
  auth: { persistSession: false },
});

// ---- Anon-klient (för ev. server-sidiga read-only anrop, eller att exporteras till client libs) ----
export const supabaseAnon = createClient(url, anonKey || "invalid-key", {
  auth: { persistSession: false },
});

// Backwards compatibility:
// Vissa filer kan importera { supabase } eller default-import.
// Vi pekar dem mot admin-klienten (som tidigare kod gjorde).
export const supabase = supabaseAdmin;
export default supabaseAdmin;
