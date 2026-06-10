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

function cleanInt(value: any, fallback = 0) {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(number) ? number : fallback;
}

function cleanBool(value: any, fallback = true) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

function buildPayload(body: any) {
  return {
    customer_type: cleanText(body.customer_type) || "company",
    customer_name: cleanText(body.customer_name),
    org_number: cleanText(body.org_number),
    contact_name: cleanText(body.contact_name),
    email: cleanText(body.email),
    phone: cleanText(body.phone),
    address: cleanText(body.address),
    zip: cleanText(body.zip),
    city: cleanText(body.city),
    country: cleanText(body.country) || "Sverige",
    invoice_reference: cleanText(body.invoice_reference),
    payment_terms_days: cleanInt(body.payment_terms_days, 10),
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
        .from("finance_customers")
        .select("*")
        .order("customer_name", { ascending: true })
        .limit(500);

      if (!showArchived) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      let customers = data || [];

      if (q) {
        customers = customers.filter((customer: any) => {
          const haystack = [
            customer.customer_name,
            customer.org_number,
            customer.contact_name,
            customer.email,
            customer.phone,
            customer.city,
            customer.invoice_reference,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(q);
        });
      }

      return res.status(200).json({
        ok: true,
        customers,
      });
    }

    if (req.method === "POST") {
      const payload = buildPayload(req.body || {});

      if (!payload.customer_name) {
        return res.status(400).json({
          ok: false,
          error: "Kundnamn krävs.",
        });
      }

      const { data, error } = await supabase
        .from("finance_customers")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        customer: data,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const id = cleanText(body.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Kund-ID saknas.",
        });
      }

      const payload = buildPayload(body);

      if (!payload.customer_name) {
        return res.status(400).json({
          ok: false,
          error: "Kundnamn krävs.",
        });
      }

      const { data, error } = await supabase
        .from("finance_customers")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        customer: data,
      });
    }

    if (req.method === "DELETE") {
      const id = cleanText(req.body?.id || req.query.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Kund-ID saknas.",
        });
      }

      const { data, error } = await supabase
        .from("finance_customers")
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
        customer: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/kunder error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera kundregistret.",
    });
  }
}
