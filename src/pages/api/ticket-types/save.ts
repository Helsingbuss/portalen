// src/pages/api/ticket-types/save.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type Body = {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  kind: "ticket" | "addon" | string;
  sort_order?: number;
  is_active?: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const b = (req.body || {}) as Body;

  const code = (b.code || "").trim().toUpperCase();
  const name = (b.name || "").trim();
  const kind: "ticket" | "addon" =
    b.kind === "addon" ? "addon" : "ticket";
  const sort_order =
    typeof b.sort_order === "number" && Number.isFinite(b.sort_order)
      ? b.sort_order
      : 100;
  const description =
    typeof b.description === "string" && b.description.trim()
      ? b.description.trim()
      : null;
  const is_active = b.is_active !== false;

  if (!code) {
    return res
      .status(400)
      .json({ ok: false, error: "Kod krävs." });
  }
  if (!name) {
    return res
      .status(400)
      .json({ ok: false, error: "Namn krävs." });
  }

  const values = {
    code,
    name,
    kind,
    description,
    sort_order,
    is_active,
  };

  try {
    let data, error;

    if (b.id) {
      ({ data, error } = await supabase
        .from("ticket_types")
        .update(values)
        .eq("id", b.id)
        .select(
          "id, code, name, description, kind, sort_order, is_active, created_at"
        )
        .single());
    } else {
      ({ data, error } = await supabase
        .from("ticket_types")
        .insert(values)
        .select(
          "id, code, name, description, kind, sort_order, is_active, created_at"
        )
        .single());
    }

    if (error) {
      // fånga unikt-kods-fel lite snällare
      if (
        typeof error.message === "string" &&
        /duplicate key value violates unique constraint/i.test(
          error.message
        )
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Koden används redan. Välj en annan (t.ex. ADULT_2).",
        });
      }
      throw error;
    }

    return res.status(200).json({ ok: true, item: data });
  } catch (e: any) {
    console.error("/api/ticket-types/save error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte spara biljetttyp.",
    });
  }
}
