import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const FALLBACK_SUPABASE_URL = "https://meotcdztoehulrirqzxn.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lb3RjZHp0b2VodWxyaXJxenhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTIwMDcsImV4cCI6MjA3MTUyODAwN30.bdNLk1ShAWJ_ABkvoqKLsvVemrN7NwKtSnsb5dQkuUA";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  FALLBACK_SUPABASE_URL;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||
  FALLBACK_SUPABASE_ANON_KEY;

console.log("[SUPABASE] URL finns:", Boolean(supabaseUrl));
console.log("[SUPABASE] KEY finns:", Boolean(supabaseAnonKey));
console.log("[SUPABASE] URL:", supabaseUrl);
console.log("[SUPABASE] KEY längd:", supabaseAnonKey ? supabaseAnonKey.length : 0);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL eller Supabase key saknas.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
