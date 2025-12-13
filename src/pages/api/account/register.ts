// src/pages/api/account/register.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type RegisterBody = {
  name?: string;
  email?: string;
  phone?: string;
};

type RegisterResponse = {
  ok: boolean;
  error?: string;
  account?: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed (use POST)." });
  }

  const body = req.body as RegisterBody;

  const rawEmail = (body.email || "").trim().toLowerCase();
  const fullName = (body.name || "").trim();
  const phone = (body.phone || "").trim();

  if (!rawEmail) {
    return res
      .status(400)
      .json({ ok: false, error: "E-postadress saknas." });
  }

  try {
    // 1) Finns konto redan?
    const { data: existing, error: existingErr } = await supabase
      .from("customer_accounts")
      .select("*")
      .eq("email", rawEmail)
      .maybeSingle();

    if (existingErr) {
      console.error("register account | existingErr", existingErr);
      return res
        .status(500)
        .json({ ok: false, error: "Tekniskt fel vid läsning av konto." });
    }

    let account = existing;

    // 2) Om inget konto – skapa nytt
    if (!account) {
      const { data: inserted, error: insertErr } = await supabase
        .from("customer_accounts")
        .insert({
          email: rawEmail,
          full_name: fullName || null,
          phone: phone || null,
        })
        .select("*")
        .single();

      if (insertErr) {
        console.error("register account | insertErr", insertErr);
        return res.status(500).json({
          ok: false,
          error: "Kunde inte skapa konto. Testa igen senare.",
        });
      }

      account = inserted;
    } else {
      // 3) Uppdatera ev. namn/telefon om tomma sedan tidigare
      const needUpdate =
        (!!fullName && !existing.full_name) ||
        (!!phone && !existing.phone);

      if (needUpdate) {
        const { data: updated, error: updateErr } = await supabase
          .from("customer_accounts")
          .update({
            full_name: existing.full_name || fullName || null,
            phone: existing.phone || phone || null,
          })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (!updateErr && updated) {
          account = updated;
        }
      }
    }

    // 4) Koppla trip_orders till detta konto baserat på e-post
    //
    // OBS! Här antar jag att trip_orders har en kolumn "customer_email".
    // Om din kolumn heter något annat (t.ex. "booker_email"),
    // ändra raden .eq("customer_email", rawEmail) nedan.
    //
    const { error: linkErr } = await supabase
      .from("trip_orders")
      .update({ customer_account_id: account.id })
      .eq("customer_email", rawEmail)
      .is("customer_account_id", null);

    if (linkErr) {
      console.warn("register account | link orders warning", linkErr);
      // inte fatal – kontot är skapat ändå
    }

    return res.status(200).json({
      ok: true,
      account: {
        id: account.id,
        email: account.email,
        full_name: account.full_name,
        phone: account.phone,
      },
    });
  } catch (e: any) {
    console.error("register account | unexpected error", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Okänt fel vid skapande av konto.",
    });
  }
}
