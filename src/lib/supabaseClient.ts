// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  // Den här syns i serverkonsolen (VS Code / terminal)
  console.error("❌ Supabase env saknas",
    { hasUrl: !!url, keyLen: (key || "").length }
  );
  throw new Error("Supabase-konfiguration saknas (.env.local?)");
} else {
  console.log("✅ Supabase env laddad",
    { hasUrl: true, keyLen: key.length }
  );
}

export const supabase = createClient(url, key);
