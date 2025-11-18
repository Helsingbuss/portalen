// src/pages/api/offers/options.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";




// samma â€œfallbackâ€ som i dina andra API-filer
const supabase =
  // @ts-ignore
  (admin as any).supabaseAdmin ||
  // @ts-ignore
  (admin as any).supabase ||
  // @ts-ignore
  (admin as any).default;

// Helper: sÃ¤kra strÃ¤ng
function s(x: any, fallback = ""): string {
  if (x === null || x === undefined) return fallback;
  return String(x);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const search = s((req.query.search as string | undefined)?.trim() ?? "");

    // BasfrÃ¥ga â€“ hÃ¤mta de fÃ¤lt vi behÃ¶ver fÃ¶r label + autofill
    // (Vi exkluderar â€œavbojd/makuleradâ€ men i Ã¶vrigt Ã¶ppet sÃ¥ du hittar dina 3 st)
    let q = supabase
      .from("offers")
      .select(
        [
          "id",
          "offer_number",
          "status",
          "created_at",
          "offer_date",
          "contact_person",
          "contact_email",
          "customer_email",
          "contact_phone",
          "customer_phone",
          "passengers",
          "notes",

          "departure_place",
          "destination",
          "departure_date",
          "departure_time",

          "return_departure",
          "return_destination",
          "return_date",
          "return_time",
        ].join(",")
      )
      .not("status", "in", '("avbojd","makulerad")') // tÃ¥l att status inte finns
      .order("created_at", { ascending: false })
      .limit(20);

    if (search) {
      // SÃ¶k pÃ¥ offertnummer, kund, e-post, frÃ¥n/till
      const term = search.replace(/%/g, ""); // enkel sanering
      q = q.or(
        [
          `offer_number.ilike.%${term}%`,
          `contact_person.ilike.%${term}%`,
          `contact_email.ilike.%${term}%`,
          `customer_email.ilike.%${term}%`,
          `departure_place.ilike.%${term}%`,
          `destination.ilike.%${term}%`,
        ].join(",")
      );
    }

    const { data, error } = await q;
    if (error) throw error;

    // Bygg options-lista (label + autofill)
    const options =
      (data ?? []).map((o: any) => {
        const num = s(o.offer_number) || s(o.id).slice(0, 8);
        const d = s(o.departure_date);
        const t = s(o.departure_time).slice(0, 5); // HH:MM
        const from = s(o.departure_place);
        const to = s(o.destination);
        const pax = o.passengers ?? null;

        const labelParts = [
          num ? `${num}` : "",
          d || t ? `${[d, t].filter(Boolean).join(" ")}` : "",
          [from, to].filter(Boolean).join(" â†’ "),
          pax ? `(${pax} p)` : "",
        ].filter(Boolean);

        return {
          id: String(o.id),
          label: labelParts.join(" â€” "),
          autofill: {
            contact_person: o.contact_person ?? null,
            contact_email: o.contact_email ?? o.customer_email ?? null,
            contact_phone: o.contact_phone ?? o.customer_phone ?? null,
            passengers: o.passengers ?? null,
            notes: o.notes ?? null,

            out_from: o.departure_place ?? null,
            out_to: o.destination ?? null,
            out_date: o.departure_date ?? null,
            out_time: o.departure_time ?? null,

            ret_from: o.return_departure ?? null,
            ret_to: o.return_destination ?? null,
            ret_date: o.return_date ?? null,
            ret_time: o.return_time ?? null,
          },
        };
      }) ?? [];

    return res.status(200).json({ options });
  } catch (e: any) {
    console.error("/api/offers/options error:", e?.message || e);
    return res.status(200).json({ options: [] });
  }
}

