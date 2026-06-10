import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { loadCompanyBankAccounts } from "@/lib/companyFinance";

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

function n(value: any) {
  const num = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function amountDue(row: any) {
  return n(row.unpaid_amount || row.total_amount);
}

function vatPercent(row: any) {
  const subtotal = n(row.subtotal_excl_vat);
  const vat = n(row.vat_amount);

  if (subtotal <= 0 || vat <= 0) return 0;

  return Number(((vat / subtotal) * 100).toFixed(2));
}

async function upsertCustomerTransaction(supabase: any, invoice: any) {
  const payload = {
    transaction_type: "income",
    transaction_date: invoice.paid_date || today(),
    title: "Betald kundfaktura " + String(invoice.invoice_number || ""),
    description: "Automatiskt skapad från manuell avprickning.",
    category: invoice.category || "Kundfaktura",
    customer_supplier_name: invoice.customer_name,
    gross_amount: n(invoice.total_amount),
    net_amount: n(invoice.subtotal_excl_vat),
    vat_amount: n(invoice.vat_amount),
    vat_percent: vatPercent(invoice),
    amount_includes_vat: true,
    payment_method: invoice.payment_method || "bank_transfer",
    bank_account_id: invoice.paid_bank_account_id || null,
    reference: invoice.payment_reference || invoice.ocr_number || invoice.invoice_number,
    invoice_id: invoice.id,
    accounting_account: "3010",
    vat_account: n(invoice.vat_amount) > 0 ? "2631" : null,
    status: "reconciled",
    notes: "Avprickad manuellt.",
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("finance_transactions")
    .select("id")
    .eq("invoice_id", invoice.id)
    .eq("transaction_type", "income")
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("finance_transactions")
      .update(payload)
      .eq("id", existing.id);
  } else {
    await supabase
      .from("finance_transactions")
      .insert(payload);
  }
}

async function upsertSupplierTransaction(supabase: any, invoice: any) {
  const payload = {
    transaction_type: "expense",
    transaction_date: invoice.paid_date || today(),
    title: "Betald leverantörsfaktura " + String(invoice.supplier_invoice_number || ""),
    description: "Automatiskt skapad från manuell avprickning.",
    category: invoice.category || "Leverantörsfaktura",
    customer_supplier_name: invoice.supplier_name,
    gross_amount: n(invoice.total_amount),
    net_amount: n(invoice.subtotal_excl_vat),
    vat_amount: n(invoice.vat_amount),
    vat_percent: vatPercent(invoice),
    amount_includes_vat: true,
    payment_method: invoice.payment_method || "bank_transfer",
    bank_account_id: invoice.paid_bank_account_id || null,
    reference: invoice.payment_reference || invoice.ocr_number || invoice.supplier_invoice_number,
    supplier_invoice_id: invoice.id,
    invoice_id: invoice.linked_customer_invoice_id || null,
    accounting_account: invoice.default_cost_account || "4010",
    vat_account: n(invoice.vat_amount) > 0 ? "2641" : null,
    status: "reconciled",
    notes: "Avprickad manuellt.",
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("finance_transactions")
    .select("id")
    .eq("supplier_invoice_id", invoice.id)
    .eq("transaction_type", "expense")
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("finance_transactions")
      .update(payload)
      .eq("id", existing.id);
  } else {
    await supabase
      .from("finance_transactions")
      .insert(payload);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: customerRaw, error: customerError } = await supabase
        .from("finance_invoices")
        .select("*")
        .order("due_date", { ascending: true })
        .limit(1000);

      if (customerError) throw customerError;

      const { data: supplierRaw, error: supplierError } = await supabase
        .from("supplier_invoices")
        .select("*")
        .order("due_date", { ascending: true })
        .limit(1000);

      if (supplierError) throw supplierError;

      const customerInvoices = (customerRaw || [])
        .filter((row) => !isArchived(row.status))
        .filter((row) => !isPaid(row.status))
        .filter((row) => amountDue(row) > 0)
        .map((row) => ({
          id: row.id,
          type: "customer",
          invoice_number: row.invoice_number,
          ocr_number: row.ocr_number,
          name: row.customer_name,
          email: row.customer_email,
          invoice_date: row.invoice_date,
          due_date: row.due_date,
          status: row.status,
          amount_due: amountDue(row),
          total_amount: n(row.total_amount),
          href: "/admin/ekonomi/fakturor/" + row.id,
        }));

      const supplierInvoices = (supplierRaw || [])
        .filter((row) => !isArchived(row.status))
        .filter((row) => !isPaid(row.status))
        .filter((row) => amountDue(row) > 0)
        .map((row) => ({
          id: row.id,
          type: "supplier",
          invoice_number: row.supplier_invoice_number,
          ocr_number: row.ocr_number,
          name: row.supplier_name,
          email: row.supplier_email,
          invoice_date: row.invoice_date,
          due_date: row.due_date,
          status: row.status,
          amount_due: amountDue(row),
          total_amount: n(row.total_amount),
          href: "/admin/ekonomi/leverantorsreskontra/" + row.id,
        }));

      const accounts = await loadCompanyBankAccounts(supabase);

      return res.status(200).json({
        ok: true,
        customerInvoices,
        supplierInvoices,
        accounts: accounts || [],
        summary: {
          customerCount: customerInvoices.length,
          supplierCount: supplierInvoices.length,
          customerAmount: Number(customerInvoices.reduce((sum, row) => sum + row.amount_due, 0).toFixed(2)),
          supplierAmount: Number(supplierInvoices.reduce((sum, row) => sum + row.amount_due, 0).toFixed(2)),
        },
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const type = cleanText(body.type);
      const id = cleanText(body.id);

      if (!type || !id) {
        return res.status(400).json({
          ok: false,
          error: "Typ och ID krävs.",
        });
      }

      const paidDate = cleanText(body.paid_date) || today();
      const paymentMethod = cleanText(body.payment_method) || "bank_transfer";
      const bankAccountId = cleanText(body.bank_account_id);
      const paymentReference = cleanText(body.payment_reference);

      const now = new Date().toISOString();

      if (type === "customer") {
        const { data: current, error: currentError } = await supabase
          .from("finance_invoices")
          .select("*")
          .eq("id", id)
          .single();

        if (currentError) throw currentError;

        const { data: updated, error: updateError } = await supabase
          .from("finance_invoices")
          .update({
            status: "paid",
            paid_amount: n(current.total_amount),
            unpaid_amount: 0,
            paid_date: paidDate,
            paid_at: now,
            payment_method: paymentMethod,
            paid_bank_account_id: bankAccountId,
            payment_reference:
              paymentReference ||
              current.ocr_number ||
              current.invoice_number,
            updated_at: now,
          })
          .eq("id", id)
          .select("*")
          .single();

        if (updateError) throw updateError;

        try {
          await upsertCustomerTransaction(supabase, updated);
        } catch (error) {
          console.warn("Kunde inte skapa intäktstransaktion.", error);
        }

        return res.status(200).json({
          ok: true,
          invoice: updated,
        });
      }

      if (type === "supplier") {
        const { data: current, error: currentError } = await supabase
          .from("supplier_invoices")
          .select("*")
          .eq("id", id)
          .single();

        if (currentError) throw currentError;

        const { data: updated, error: updateError } = await supabase
          .from("supplier_invoices")
          .update({
            status: "paid",
            paid_amount: n(current.total_amount),
            unpaid_amount: 0,
            paid_date: paidDate,
            paid_at: now,
            payment_method: paymentMethod,
            paid_bank_account_id: bankAccountId,
            payment_reference:
              paymentReference ||
              current.ocr_number ||
              current.supplier_invoice_number,
            updated_at: now,
          })
          .eq("id", id)
          .select("*")
          .single();

        if (updateError) throw updateError;

        try {
          await upsertSupplierTransaction(supabase, updated);
        } catch (error) {
          console.warn("Kunde inte skapa kostnadstransaktion.", error);
        }

        return res.status(200).json({
          ok: true,
          invoice: updated,
        });
      }

      return res.status(400).json({
        ok: false,
        error: "Okänd avprickningstyp.",
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/avprickning error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera avprickning.",
    });
  }
}
