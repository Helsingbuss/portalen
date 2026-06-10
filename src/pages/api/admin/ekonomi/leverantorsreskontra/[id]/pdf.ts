import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { generateSupplierInvoicePdf } from "@/lib/supplierInvoicePdf";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Leverantörsfaktura-ID saknas.",
    });
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const supabase = getSupabase();

    const { data: invoice, error: invoiceError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError) throw invoiceError;

    const { data: lines, error: linesError } = await supabase
      .from("supplier_invoice_lines")
      .select("*")
      .eq("supplier_invoice_id", id)
      .order("line_order", { ascending: true });

    if (linesError) throw linesError;

    const pdfBytes = await generateSupplierInvoicePdf({
      invoice,
      lines: lines || [],
    });

    const number = String(invoice.supplier_invoice_number || id).replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = "Leverantorsfaktura-" + number + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="' + filename + '"');

    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error("/api/admin/ekonomi/leverantorsreskontra/[id]/pdf error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa intern PDF för leverantörsfakturan.",
    });
  }
}
