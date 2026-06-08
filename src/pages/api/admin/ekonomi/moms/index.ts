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

function cleanNumber(value: any, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : fallback;
}

function cleanBoolean(value: any, fallback = true) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
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

function defaultSettings() {
  return {
    settings_key: "default",
    vat_period: "quarterly",
    standard_vat_percent: 25,
    tax_account: "",
    accounting_vat_input_account: "2641",
    accounting_vat_report_account: "2650",
    accounting_tax_account: "1630",
    notes: "",
  };
}

function defaultRates() {
  return [
    {
      rate_code: "vat_25",
      label: "Moms 25 %",
      vat_percent: 25,
      sales_account: "2611",
      description: "Standardmoms för varor och tjänster med 25 % moms.",
      is_default: true,
      is_active: true,
      display_order: 10,
    },
    {
      rate_code: "vat_12",
      label: "Moms 12 %",
      vat_percent: 12,
      sales_account: "2621",
      description: "Reducerad moms, till exempel vissa livsmedel, hotell och liknande delar.",
      is_default: false,
      is_active: true,
      display_order: 20,
    },
    {
      rate_code: "vat_6",
      label: "Moms 6 %",
      vat_percent: 6,
      sales_account: "2631",
      description: "Reducerad moms, till exempel persontransport inom Sverige.",
      is_default: false,
      is_active: true,
      display_order: 30,
    },
    {
      rate_code: "vat_0",
      label: "Moms 0 %",
      vat_percent: 0,
      sales_account: "",
      description: "Momsfritt, utland eller särskild momshantering.",
      is_default: false,
      is_active: true,
      display_order: 40,
    },
  ];
}

function buildSettings(body: any) {
  return {
    settings_key: "default",
    vat_period: cleanText(body.vat_period) || "quarterly",
    standard_vat_percent: cleanNumber(body.standard_vat_percent, 25),
    tax_account: cleanText(body.tax_account),
    accounting_vat_input_account: cleanText(body.accounting_vat_input_account) || "2641",
    accounting_vat_report_account: cleanText(body.accounting_vat_report_account) || "2650",
    accounting_tax_account: cleanText(body.accounting_tax_account) || "1630",
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

function buildRate(row: any) {
  return {
    rate_code: cleanText(row.rate_code),
    label: cleanText(row.label) || "Momssats",
    vat_percent: cleanNumber(row.vat_percent, 0),
    sales_account: cleanText(row.sales_account),
    description: cleanText(row.description),
    is_default: cleanBoolean(row.is_default, false),
    is_active: cleanBoolean(row.is_active, true),
    display_order: Number.parseInt(String(row.display_order ?? 100), 10) || 100,
    updated_at: new Date().toISOString(),
  };
}

async function loadSettings(supabase: any) {
  const { data, error } = await supabase
    .from("company_finance_settings")
    .select("*")
    .eq("settings_key", "default")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return {
        needsSetup: true,
        settings: null,
      };
    }

    throw error;
  }

  return {
    needsSetup: false,
    settings: data || null,
  };
}

async function loadRates(supabase: any) {
  const { data, error } = await supabase
    .from("company_vat_rates")
    .select("*")
    .order("display_order", { ascending: true })
    .order("vat_percent", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      return {
        needsSetup: true,
        rates: [],
      };
    }

    throw error;
  }

  return {
    needsSetup: false,
    rates: data || [],
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const [settingsResult, ratesResult] = await Promise.all([
        loadSettings(supabase),
        loadRates(supabase),
      ]);

      return res.status(200).json({
        ok: true,
        needsSetup: settingsResult.needsSetup || ratesResult.needsSetup,
        settings: settingsResult.settings,
        rates: ratesResult.rates,
        defaults: {
          settings: defaultSettings(),
          rates: defaultRates(),
        },
      });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = req.body || {};
      const settingsPayload = buildSettings(body.settings || {});
      const rates = Array.isArray(body.rates) ? body.rates : [];

      const { data: settings, error: settingsError } = await supabase
        .from("company_finance_settings")
        .upsert(settingsPayload, {
          onConflict: "settings_key",
        })
        .select("*")
        .single();

      if (settingsError) {
        if (isMissingTableError(settingsError)) {
          return res.status(200).json({
            ok: false,
            needsSetup: true,
            error: "Tabellen company_finance_settings saknas. Kör SQL-koden först.",
          });
        }

        throw settingsError;
      }

      const cleanRates = rates
        .map(buildRate)
        .filter((row: any) => row.rate_code);

      if (cleanRates.length > 0) {
        const defaultRows = cleanRates.filter((row: any) => row.is_default);

        if (defaultRows.length > 1) {
          cleanRates.forEach((row: any, index: number) => {
            row.is_default = index === cleanRates.findIndex((item: any) => item.is_default);
          });
        }

        const { error: ratesError } = await supabase
          .from("company_vat_rates")
          .upsert(cleanRates, {
            onConflict: "rate_code",
          });

        if (ratesError) {
          if (isMissingTableError(ratesError)) {
            return res.status(200).json({
              ok: false,
              needsSetup: true,
              error: "Tabellen company_vat_rates saknas. Kör SQL-koden först.",
            });
          }

          throw ratesError;
        }
      }

      const ratesResult = await loadRates(supabase);

      return res.status(200).json({
        ok: true,
        settings,
        rates: ratesResult.rates,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/moms error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera momsinställningar.",
    });
  }
}
