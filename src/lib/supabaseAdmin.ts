import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!url || !serviceKey) throw new Error("Supabase URL eller SERVICE_KEY saknas.");

const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default adminClient;
// Bakåtkomp:
export const supabaseAdmin = adminClient;
export const supabase = adminClient;
export const requireAdmin = () => adminClient;
