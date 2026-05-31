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

function cleanNumber(value: any) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function buildInsertData(body: any) {
  return {
    vehicle_id: cleanText(body.vehicle_id),
    contract_type: cleanText(body.contract_type) || "insurance",
    supplier: cleanText(body.supplier),
    contract_number: cleanText(body.contract_number),
    start_date: cleanText(body.start_date),
    end_date: cleanText(body.end_date),
    monthly_cost: cleanNumber(body.monthly_cost),
    deductible_amount: cleanNumber(body.deductible_amount),
    status: cleanText(body.status) || "active",
    document_url: cleanText(body.document_url),
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

      if (!insertData.supplier) {
        return res.status(400).json({
          ok: false,
          error: "Leverantör/försäkringsbolag saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_contracts")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        contract: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const contractType = String(req.query.contract_type || "").trim();
    const vehicleId = String(req.query.vehicle_id || "").trim();

    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_code", { ascending: true });

    if (vehiclesError) throw vehiclesError;

    let contractsQuery = supabase
      .from("vehicle_contracts")
      .select("*")
      .order("end_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) contractsQuery = contractsQuery.eq("status", status);
    if (contractType) contractsQuery = contractsQuery.eq("contract_type", contractType);
    if (vehicleId) contractsQuery = contractsQuery.eq("vehicle_id", vehicleId);

    const { data: contractsData, error: contractsError } = await contractsQuery;

    if (contractsError) {
      if (isMissingTableError(contractsError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          vehicles: vehiclesData || [],
          contracts: [],
          summary: {
            total: 0,
            active: 0,
            expiringSoon: 0,
            insurance: 0,
            leasing: 0,
            monthlyCost: 0,
          },
        });
      }

      throw contractsError;
    }

    const vehicles = vehiclesData || [];
    let contracts = contractsData || [];

    if (q) {
      contracts = contracts.filter((row: any) => {
        const vehicle = vehicles.find((item: any) => item.id === row.vehicle_id);

        const haystack = [
          row.contract_type,
          row.supplier,
          row.contract_number,
          row.status,
          row.document_url,
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

    const summary = {
      total: contracts.length,
      active: contracts.filter((r: any) => r.status === "active").length,
      expiringSoon: contracts.filter((r: any) => {
        if (!r.end_date) return false;
        const d = new Date(r.end_date);
        d.setHours(0, 0, 0, 0);
        return d >= today && d <= in60Days && r.status === "active";
      }).length,
      insurance: contracts.filter((r: any) => r.contract_type === "insurance").length,
      leasing: contracts.filter((r: any) => r.contract_type === "leasing").length,
      monthlyCost: contracts.reduce((sum: number, r: any) => sum + Number(r.monthly_cost || 0), 0),
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      vehicles,
      contracts,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/fordon/avtal error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera försäkring och leasing.",
    });
  }
}
