// Anon-klient för client-side / SSR
import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

if (!url || !anon) {
  throw new Error("Supabase saknar URL eller ANON KEY (env).");
}

const client = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true }
});

export default client;
export { client as supabase };
