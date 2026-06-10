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

function money(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function pct(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function resultStatus(resultExVat: number, marginPercent: number) {
  if (resultExVat < 0) return "minus";
  if (marginPercent < 10) return "low";
  return "good";
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Faktura-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("finance_invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError) throw invoiceError;

    let supplierInvoices: any[] = [];

    const { data: suppliersById, error: suppliersByIdError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .neq("status", "archived")
      .eq("linked_customer_invoice_id", id);

    if (suppliersByIdError) {
      if (isMissingTableError(suppliersByIdError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          invoice,
          supplierInvoices: [],
          result: null,
        });
      }

      throw suppliersByIdError;
    }

    supplierInvoices = suppliersById || [];

    const orderReference = String(invoice.order_reference || "").trim();

    if (orderReference) {
      const { data: suppliersByOrder, error: suppliersByOrderError } = await supabase
        .from("supplier_invoices")
        .select("*")
        .neq("status", "archived")
        .eq("linked_order_reference", orderReference);

      if (suppliersByOrderError) throw suppliersByOrderError;

      const existingIds = new Set(supplierInvoices.map((row) => row.id));

      for (const supplier of suppliersByOrder || []) {
        if (!existingIds.has(supplier.id)) {
          supplierInvoices.push(supplier);
        }
      }
    }

    const revenueExVat = money(invoice.subtotal_excl_vat);
    const revenueVat = money(invoice.vat_amount);
    const revenueInclVat = money(invoice.total_amount);

    const costExVat = supplierInvoices.reduce((sum, row) => sum + money(row.subtotal_excl_vat), 0);
    const costVat = supplierInvoices.reduce((sum, row) => sum + money(row.vat_amount), 0);
    const costInclVat = supplierInvoices.reduce((sum, row) => sum + money(row.total_amount), 0);

    const paidCosts = supplierInvoices
      .filter((row) => row.status === "paid")
      .reduce((sum, row) => sum + money(row.total_amount), 0);

    const unpaidCosts = supplierInvoices
      .filter((row) => row.status !== "paid")
      .reduce((sum, row) => sum + money(row.unpaid_amount || row.total_amount), 0);

    const resultExVat = revenueExVat - costExVat;
    const resultInclVat = revenueInclVat - costInclVat;
    const marginPercent = revenueExVat > 0 ? (resultExVat / revenueExVat) * 100 : 0;

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        order_reference: invoice.order_reference,
      },
      supplierInvoices: supplierInvoices.map((row) => ({
        id: row.id,
        supplier_name: row.supplier_name,
        supplier_invoice_number: row.supplier_invoice_number,
        status: row.status,
        subtotal_excl_vat: row.subtotal_excl_vat,
        vat_amount: row.vat_amount,
        total_amount: row.total_amount,
        unpaid_amount: row.unpaid_amount,
        due_date: row.due_date,
      })),
      result: {
        revenueExVat: Number(revenueExVat.toFixed(2)),
        revenueVat: Number(revenueVat.toFixed(2)),
        revenueInclVat: Number(revenueInclVat.toFixed(2)),

        costExVat: Number(costExVat.toFixed(2)),
        costVat: Number(costVat.toFixed(2)),
        costInclVat: Number(costInclVat.toFixed(2)),

        resultExVat: Number(resultExVat.toFixed(2)),
        resultInclVat: Number(resultInclVat.toFixed(2)),
        marginPercent: pct(marginPercent),
        status: resultStatus(resultExVat, marginPercent),

        supplierCount: supplierInvoices.length,
        paidCosts: Number(paidCosts.toFixed(2)),
        unpaidCosts: Number(unpaidCosts.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/[id]/resultat error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta resultat för fakturan.",
    });
  }
}
