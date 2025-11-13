// src/lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Maybe<T> = T | null;

let client: Maybe<SupabaseClient> = null;

function init() {
  if (client) return;

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    "";

  if (!url || !key) {
    // Låt build gå igenom; vi kastar först när någon faktiskt försöker använda klienten.
    console.error(
      "❌ Supabase env saknas { hasUrl: %s, keyLen: %d }",
      Boolean(url),
      key.length
    );
    return;
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });
}

/** Säker åtkomst – kastar om env saknas */
export function requireAdmin(): SupabaseClient {
  init();
  if (!client) {
    throw new Error("Supabase-konfiguration saknas (.env.local?)");
  }
  return client;
}

/** Throwing proxy om någon råkar använda klienten innan env är korrekt */
const throwingProxy = new Proxy({} as any, {
  get() {
    throw new Error("Supabase admin client används innan den är konfigurerad.");
  },
}) as SupabaseClient;

/** Resolved klient: riktig om env finns, annars proxy (för att stilla TypeScript-typer) */
const resolved: SupabaseClient = (() => {
  try {
    return requireAdmin();
  } catch {
    return throwingProxy;
  }
})();

/** Back-compat: vi exponerar flera namn så befintliga imports funkar */
export const supabaseAdmin: SupabaseClient = resolved;
export const supabase: SupabaseClient = resolved; // alias för äldre kod

export default resolved;
