import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase env saknas. Admin kräver SUPABASE_SERVICE_ROLE_KEY eller SUPABASE_SERVICE_KEY i .env.local."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function buildInsertData(body: any) {
  return {
    partner_id: cleanText(body.partner_id),
    title: cleanText(body.title),
    message: cleanText(body.message),
    note_type: cleanText(body.note_type) || "quality",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildInsertData(req.body || {});

      if (!insertData.partner_id) {
        return res.status(400).json({
          ok: false,
          error: "Partner/operatör saknas.",
        });
      }

      if (!insertData.title) {
        return res.status(400).json({
          ok: false,
          error: "Rubrik saknas.",
        });
      }

      const { data, error } = await supabase
        .from("app_partner_notes")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        note: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const partnerId = String(req.query.partner_id || "").trim();
    const noteType = String(req.query.note_type || "").trim();

    const { data: partnersData, error: partnersError } = await supabase
      .from("app_partners")
      .select("*")
      .order("name", { ascending: true });

    if (partnersError) throw partnersError;

    let notesQuery = supabase
      .from("app_partner_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (partnerId) notesQuery = notesQuery.eq("partner_id", partnerId);
    if (noteType) notesQuery = notesQuery.eq("note_type", noteType);

    const { data: notesData, error: notesError } = await notesQuery;

    if (notesError) {
      if (isMissingTableError(notesError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          partners: partnersData || [],
          notes: [],
          summary: {
            total: 0,
            quality: 0,
            deviations: 0,
            followUps: 0,
          },
        });
      }

      throw notesError;
    }

    const partners = partnersData || [];
    let notes = notesData || [];

    if (q) {
      notes = notes.filter((row: any) => {
        const partner = partners.find((item: any) => item.id === row.partner_id);

        const haystack = [
          row.title,
          row.message,
          row.note_type,
          partner?.name,
          partner?.contact_person,
          partner?.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: notes.length,
      quality: notes.filter((r: any) => r.note_type === "quality").length,
      deviations: notes.filter((r: any) =>
        ["deviation", "complaint"].includes(String(r.note_type || ""))
      ).length,
      followUps: notes.filter((r: any) =>
        ["follow_up", "inspection"].includes(String(r.note_type || ""))
      ).length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      partners,
      notes,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/partners/kvalitet error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera kvalitet och uppföljning.",
    });
  }
}
