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

function percent(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
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

function resultStatus(resultExVat: number, marginPercent: number) {
  if (resultExVat < 0) return "minus";
  if (marginPercent < 10) return "low";
  return "good";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const q = String(req.query.q || "").trim().toLowerCase();

    const { data: customerInvoices, error: customerError } = await supabase
      .from("finance_invoices")
      .select("*")
      .neq("status", "archived")
      .order("invoice_date", { ascending: false })
      .limit(500);

    if (customerError) throw customerError;

    const { data: supplierInvoices, error: supplierError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .neq("status", "archived")
      .limit(1000);

    if (supplierError) {
      if (isMissingTableError(supplierError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          rows: [],
          summary: {
            revenueExVat: 0,
            costExVat: 0,
            resultExVat: 0,
            marginPercent: 0,
            assignments: 0,
            minusCount: 0,
            lowCount: 0,
            goodCount: 0,
          },
        });
      }

      throw supplierError;
    }

    const suppliers = supplierInvoices || [];

    let rows = (customerInvoices || []).map((invoice: any) => {
      const linkedSuppliers = suppliers.filter((supplier: any) => {
        if (supplier.linked_customer_invoice_id && supplier.linked_customer_invoice_id === invoice.id) {
          return true;
        }

        if (
          supplier.linked_order_reference &&
          invoice.order_reference &&
          String(supplier.linked_order_reference).trim().toLowerCase() === String(invoice.order_reference).trim().toLowerCase()
        ) {
          return true;
        }

        return false;
      });

      const revenueExVat = money(invoice.subtotal_excl_vat);
      const revenueVat = money(invoice.vat_amount);
      const revenueInclVat = money(invoice.total_amount);

      const costExVat = linkedSuppliers.reduce((sum: number, supplier: any) => sum + money(supplier.subtotal_excl_vat), 0);
      const costVat = linkedSuppliers.reduce((sum: number, supplier: any) => sum + money(supplier.vat_amount), 0);
      const costInclVat = linkedSuppliers.reduce((sum: number, supplier: any) => sum + money(supplier.total_amount), 0);

      const supplierPaidAmount = linkedSuppliers
        .filter((supplier: any) => supplier.status === "paid")
        .reduce((sum: number, supplier: any) => sum + money(supplier.total_amount), 0);

      const supplierUnpaidAmount = linkedSuppliers
        .filter((supplier: any) => supplier.status !== "paid")
        .reduce((sum: number, supplier: any) => sum + money(supplier.unpaid_amount || supplier.total_amount), 0);

      const resultExVat = revenueExVat - costExVat;
      const marginPercent = revenueExVat > 0 ? (resultExVat / revenueExVat) * 100 : 0;

      return {
        customerInvoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        ocrNumber: invoice.ocr_number,
        customerName: invoice.customer_name,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        orderReference: invoice.order_reference,
        category: invoice.category,

        revenueExVat,
        revenueVat,
        revenueInclVat,

        costExVat,
        costVat,
        costInclVat,

        resultExVat,
        marginPercent: percent(marginPercent),
        resultStatus: resultStatus(resultExVat, marginPercent),

        supplierCount: linkedSuppliers.length,
        supplierPaidAmount,
        supplierUnpaidAmount,

        linkedSuppliers: linkedSuppliers.map((supplier: any) => ({
          id: supplier.id,
          supplierName: supplier.supplier_name,
          supplierInvoiceNumber: supplier.supplier_invoice_number,
          status: supplier.status,
          totalAmount: supplier.total_amount,
          subtotalExVat: supplier.subtotal_excl_vat,
          dueDate: supplier.due_date,
        })),
      };
    });

    if (q) {
      rows = rows.filter((row: any) => {
        const haystack = [
          row.invoiceNumber,
          row.ocrNumber,
          row.customerName,
          row.orderReference,
          row.category,
          row.status,
          ...row.linkedSuppliers.map((supplier: any) => supplier.supplierName),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const revenueExVat = rows.reduce((sum: number, row: any) => sum + row.revenueExVat, 0);
    const costExVat = rows.reduce((sum: number, row: any) => sum + row.costExVat, 0);
    const resultExVat = revenueExVat - costExVat;
    const marginPercent = revenueExVat > 0 ? (resultExVat / revenueExVat) * 100 : 0;

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      rows,
      summary: {
        revenueExVat: Number(revenueExVat.toFixed(2)),
        costExVat: Number(costExVat.toFixed(2)),
        resultExVat: Number(resultExVat.toFixed(2)),
        marginPercent: percent(marginPercent),
        assignments: rows.length,
        minusCount: rows.filter((row: any) => row.resultStatus === "minus").length,
        lowCount: rows.filter((row: any) => row.resultStatus === "low").length,
        goodCount: rows.filter((row: any) => row.resultStatus === "good").length,
      },
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/resultat-uppdrag error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta resultat per uppdrag.",
    });
  }
}
