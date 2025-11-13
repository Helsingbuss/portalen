// src/lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Miljövariabler (admin: service key om den finns, annars anon).
 * Vi försöker vara toleranta för att undvika build-fail vid import-tid,
 * men kastar tydligt fel när klienten faktiskt används utan env.
 */
const URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

// Håll en singleton i minnet
let _client: SupabaseClient | null = null;

/** Säker init – kasta tydligt fel om env saknas när man faktiskt behöver klienten. */
export function requireAdmin(): SupabaseClient {
  if (_client) return _client;
  if (!URL || !KEY) {
    // Ge en tydlig rad i loggen OCH kasta – så ser man snabbt vad som saknas.
    console.error("❌ Supabase env saknas", {
      hasUrl: !!URL,
      keyLen: KEY ? KEY.length : 0,
    });
    throw new Error("Supabase-konfiguration saknas (.env.local?)");
  }
  _client = createClient(URL, KEY, {
    auth: { persistSession: false }, // server-side
  });
  return _client;
}

/**
 * Bakåtkompatibla exporter:
 * - default export (som många filer använder)
 * - named: supabaseAdmin, supabase
 * - requireAdmin() för nya filer som vill initiera säkert.
 *
 * Vi undviker att kasta vid import-tid: om env saknas skapas klienten
 * först när den faktiskt används via requireAdmin()/supabase.
 */
let _eager: SupabaseClient | null = null;
try {
  _eager = requireAdmin();
} catch {
  // Låt den vara null tills någon anropar requireAdmin(); undviker build-stop.
  _eager = null;
}

const supabaseAdmin = (_eager ?? ({} as unknown)) as SupabaseClient;

// Bakåtkompatibla namn
export { supabaseAdmin };
export const supabase: SupabaseClient = (_eager ?? (new Proxy({}, {
  get() {
    // Om någon försöker använda proxyn innan env är korrekt – kasta med bra fel.
    throw new Error("Supabase ej initierad: kontrollera .env (SUPABASE_URL / SERVICE_KEY).");
  },
}) as unknown)) as SupabaseClient;

// Default (så funkar import supabase from "@/lib/supabaseAdmin")
export default supabaseAdmin;
