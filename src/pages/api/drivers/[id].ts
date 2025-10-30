// src/pages/api/drivers/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Upptäck “kolumn/tabell finns inte” på ett robust sätt */
function isMissingColumnOrTable(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return (
    (msg.includes("does not exist") && (msg.includes("column") || msg.includes("table"))) ||
    err?.code === "42P01" // undefined_table
  );
}

/** Tom sträng/undefined -> null  (annars behåll värdet) */
const toNull = (v: any) => (v === "" || v === undefined ? null : v);

/** Tillåt att license_classes skickas som "D, DE" eller ["D","DE"] */
function coerceLicenseClasses(input: any) {
  if (Array.isArray(input)) return input;
  if (typeof input === "string" && input.trim()) {
    return input.split(",").map((s) => s.trim());
  }
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "Saknar driver-id" });

  try {
    /* =========================
       GET  – hämta chaufför + dokument
       ========================= */
    if (req.method === "GET") {
      // Försök läsa alla nya fält
      let { data, error } = await supabaseAdmin
        .from("drivers")
        .select(
          // OBS: Den här SELECT:en antar att kolumnerna finns.
          // Saknas någon -> vi fångar felet och gör en fallback längre ner.
          "id, first_name, last_name, phone, email, license_classes, active, employment_type, note, updated_at, national_id, hired_at, avatar_url"
        )
        .eq("id", id)
        .single();

      // Fallback om schema saknar nya kolumner
      if (error && isMissingColumnOrTable(error)) {
        const fb = await supabaseAdmin
          .from("drivers")
          .select("id, first_name, last_name, phone, email, license_classes, active, note, updated_at")
          .eq("id", id)
          .single();
        if (fb.error) throw fb.error;

        // Lägg till “nya” fält som null så frontend kan läsa dem säkert
        data = {
          ...fb.data,
          employment_type: "tim",
          national_id: null,
          hired_at: null,
          avatar_url: null,
        };
      }
      if (error && !isMissingColumnOrTable(error)) throw error;

      // Dokument – tolerant om tabellen inte finns
      let documents: any[] = [];
      const docs = await supabaseAdmin
        .from("driver_documents")
        .select("id, type, file_url, expires_at, uploaded_at")
        .eq("driver_id", id)
        .order("uploaded_at", { ascending: false });

      if (!docs.error && Array.isArray(docs.data)) {
        documents = docs.data;
      }

      return res.status(200).json({ ok: true, driver: data, documents });
    }

    /* =========================
       PATCH – uppdatera chaufför
       ========================= */
    if (req.method === "PATCH") {
      const p = req.body ?? {};

      // Stötta både avatar_url och profile_image_path som in-nyckel
      const incomingAvatar =
        p.avatar_url !== undefined
          ? p.avatar_url
          : p.profile_image_path !== undefined
          ? p.profile_image_path
          : undefined;

      const update: Record<string, any> = {
        first_name: p.first_name ?? undefined,
        last_name: p.last_name ?? undefined,
        phone: p.phone ?? undefined,
        email: p.email ?? undefined,
        license_classes: coerceLicenseClasses(p.license_classes),
        active: typeof p.active === "boolean" ? p.active : undefined,
        employment_type: p.employment_type ?? undefined,
        note: p.note ?? undefined,
        national_id: p.national_id !== undefined ? toNull(p.national_id) : undefined, // personnummer
        hired_at: p.hired_at !== undefined ? toNull(p.hired_at) : undefined,          // anställd sedan (YYYY-MM-DD)
        avatar_url: incomingAvatar ?? undefined,                                       // profilbildens path i bucket
        updated_at: new Date().toISOString(),
      };

      // 1) Försök uppdatera med alla fält (nya kolumner)
      let { data, error } = await supabaseAdmin
        .from("drivers")
        .update(update)
        .eq("id", id)
        .select("id")
        .single();

      // 2) Om kolumn(er) saknas – ta bort dem och försök igen
      if (error && isMissingColumnOrTable(error)) {
        delete update.employment_type;
        delete update.national_id;
        delete update.hired_at;
        delete update.avatar_url;

        const fb = await supabaseAdmin
          .from("drivers")
          .update(update)
          .eq("id", id)
          .select("id")
          .single();

        if (fb.error) throw fb.error;
        data = fb.data;
      }
      if (error && !isMissingColumnOrTable(error)) throw error;

      return res.status(200).json({ ok: true, id: data?.id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/drivers/[id] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
