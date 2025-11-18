// src/lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

/**
 * Skapa en admin-klient. Kastar INTE vid import.
 * Om env saknas loggar vi bara en varning; då kastar requireAdmin() senare.
 */
let _admin: SupabaseClient | null = null;

function initAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Kasta först NÄR någon verkligen försöker använda klienten.
    throw new Error("Supabase-konfiguration saknas (.env.local?)");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Source": "helsingbuss-portal-admin" } },
  });
}

/** Bakåtkompatibel helper: anropa där gamla koden förväntar sig en funktion */
export function requireAdmin(): SupabaseClient {
  if (_admin) return _admin;
  _admin = initAdmin();
  return _admin;
}

/** För de filer som gör `import supabase from "@/lib/supabaseAdmin"` */
const supabaseAdmin: SupabaseClient = (() => {
  try {
    return requireAdmin();
  } catch {
    // Skapa en "no-op" klient med tomma värden så att import inte spränger build;
    // första riktiga queryn kommer ändå kasta från servern om env saknas.
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
})();

/** Alias för annan gammal importstil: `import { supabase } from "@/lib/supabaseAdmin"` */
export const supabase = supabaseAdmin;

/** Named + default export så ALLA varianter funkar */
export { supabaseAdmin };
export default supabaseAdmin;
