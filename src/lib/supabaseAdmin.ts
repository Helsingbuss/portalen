// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || // 🔥 rätt namn
  process.env.SUPABASE_SERVICE_KEY;        // fallback (din gamla)

if (!url || !serviceKey) {
  throw new Error("Supabase URL eller SERVICE KEY saknas.");
}

const adminClient = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ✅ tydlig huvudexport
export const supabaseAdmin = adminClient;

// ✅ bakåtkompatibilitet (behåll ALLT du hade)
export const supabase = adminClient;
export const requireAdmin = () => adminClient;
export default adminClient;
