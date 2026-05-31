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
    vehicle_id: cleanText(body.vehicle_id),
    document_type: cleanText(body.document_type) || "other",
    title: cleanText(body.title),
    document_number: cleanText(body.document_number),
    issue_date: cleanText(body.issue_date),
    expiry_date: cleanText(body.expiry_date),
    status: cleanText(body.status) || "active",
    file_url: cleanText(body.file_url),
    content: cleanText(body.content),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildInsertData(req.body || {});

      if (!insertData.vehicle_id) {
        return res.status(400).json({
          ok: false,
          error: "Fordon saknas.",
        });
      }

      if (!insertData.title) {
        return res.status(400).json({
          ok: false,
          error: "Titel saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_documents")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        document: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const documentType = String(req.query.document_type || "").trim();
    const vehicleId = String(req.query.vehicle_id || "").trim();

    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_code", { ascending: true });

    if (vehiclesError) throw vehiclesError;

    let documentsQuery = supabase
      .from("vehicle_documents")
      .select("*")
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) documentsQuery = documentsQuery.eq("status", status);
    if (documentType) documentsQuery = documentsQuery.eq("document_type", documentType);
    if (vehicleId) documentsQuery = documentsQuery.eq("vehicle_id", vehicleId);

    const { data: documentsData, error: documentsError } = await documentsQuery;

    if (documentsError) {
      if (isMissingTableError(documentsError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          vehicles: vehiclesData || [],
          documents: [],
          summary: {
            total: 0,
            documents: 0,
            manuals: 0,
            serviceBook: 0,
            expiringSoon: 0,
          },
        });
      }

      throw documentsError;
    }

    const vehicles = vehiclesData || [];
    let documents = documentsData || [];

    if (q) {
      documents = documents.filter((row: any) => {
        const vehicle = vehicles.find((item: any) => item.id === row.vehicle_id);

        const haystack = [
          row.document_type,
          row.title,
          row.document_number,
          row.status,
          row.file_url,
          row.content,
          row.notes,
          vehicle?.vehicle_code,
          vehicle?.registration_number,
          vehicle?.model,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in60Days = new Date(today);
    in60Days.setDate(in60Days.getDate() + 60);

    const manualTypes = ["manual", "driver_instruction", "safety_instruction"];
    const serviceTypes = ["service_book", "service_note"];

    const summary = {
      total: documents.length,
      documents: documents.filter((r: any) => !manualTypes.includes(r.document_type) && !serviceTypes.includes(r.document_type)).length,
      manuals: documents.filter((r: any) => manualTypes.includes(r.document_type)).length,
      serviceBook: documents.filter((r: any) => serviceTypes.includes(r.document_type)).length,
      expiringSoon: documents.filter((r: any) => {
        if (!r.expiry_date) return false;
        const d = new Date(r.expiry_date);
        d.setHours(0, 0, 0, 0);
        return d >= today && d <= in60Days && r.status === "active";
      }).length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      vehicles,
      documents,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/fordon/dokument error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera dokument och tillstånd.",
    });
  }
}
