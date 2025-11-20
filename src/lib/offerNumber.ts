// Genererar nästa offertnummer. Start ska vara HB25 009.
import type { SupabaseClient } from "@supabase/supabase-js";

export async function nextOfferNumber(db: SupabaseClient): Promise<string> {
  const year2 = new Date().getFullYear().toString().slice(-2); // "25"
  const prefix = `HB${year2}`;

  const { data, error } = await db
    .from("offers")
    .select("offer_number")
    .ilike("offer_number", `${prefix}%`)
    .order("offer_number", { ascending: false })
    .limit(100);

  if (error) throw error;

  let maxSeq = 8; // så att första blir 009
  for (const row of data ?? []) {
    const no = String((row as any).offer_number || "");
    const m = no.match(/^HB\d{2}(\d+)$/);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
  }
  const next = (maxSeq + 1).toString().padStart(3, "0");
  return `${prefix}${next}`;
}
