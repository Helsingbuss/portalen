import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env saknas.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanBool(value: any, fallback = true) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

function buildPayload(body: any) {
  return {
    supplier_type: cleanText(body.supplier_type) || "supplier",
    supplier_name: cleanText(body.supplier_name),
    org_number: cleanText(body.org_number),
    contact_name: cleanText(body.contact_name),
    email: cleanText(body.email),
    phone: cleanText(body.phone),
    address: cleanText(body.address),
    zip: cleanText(body.zip),
    city: cleanText(body.city),
    country: cleanText(body.country) || "Sverige",
    bankgiro: cleanText(body.bankgiro),
    iban: cleanText(body.iban),
    bic: cleanText(body.bic),
    swish_number: cleanText(body.swish_number),
    default_cost_account: cleanText(body.default_cost_account) || "4010",
    default_vat_account: cleanText(body.default_vat_account) || "2641",
    notes: cleanText(body.notes),
    is_active: cleanBool(body.is_active, true),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const q = String(req.query.q || "").trim().toLowerCase();
      const showArchived = String(req.query.archived || "") === "true";

      let query: any = supabase
        .from("finance_suppliers")
        .select("*")
        .order("supplier_name", { ascending: true })
        .limit(500);

      if (!showArchived) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      let suppliers = data || [];

      if (q) {
        suppliers = suppliers.filter((supplier: any) => {
          const haystack = [
            supplier.supplier_name,
            supplier.org_number,
            supplier.contact_name,
            supplier.email,
            supplier.phone,
            supplier.city,
            supplier.bankgiro,
            supplier.swish_number,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(q);
        });
      }

      return res.status(200).json({
        ok: true,
        suppliers,
      });
    }

    if (req.method === "POST") {
      const payload = buildPayload(req.body || {});

      if (!payload.supplier_name) {
        return res.status(400).json({
          ok: false,
          error: "Leverantörsnamn krävs.",
        });
      }

      const { data, error } = await supabase
        .from("finance_suppliers")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        supplier: data,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const id = cleanText(body.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Leverantörs-ID saknas.",
        });
      }

      const payload = buildPayload(body);

      if (!payload.supplier_name) {
        return res.status(400).json({
          ok: false,
          error: "Leverantörsnamn krävs.",
        });
      }

      const { data, error } = await supabase
        .from("finance_suppliers")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        supplier: data,
      });
    }

    if (req.method === "DELETE") {
      const id = cleanText(req.body?.id || req.query.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Leverantörs-ID saknas.",
        });
      }

      const { data, error } = await supabase
        .from("finance_suppliers")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        supplier: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/leverantorer error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera leverantörsregistret.",
    });
  }
}
