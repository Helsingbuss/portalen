import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const tableName = "system_company_settings";
const settingKey = "company";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

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

const defaultSettings = {
  setting_key: settingKey,
  company_name: "Helsingbuss",
  legal_name: "Helsingbuss AB",
  organization_number: "",
  vat_number: "",
  address: "",
  postal_code: "",
  city: "Helsingborg",
  country: "Sverige",
  phone: "",
  email: "",
  website: "",
  bankgiro: "",
  plusgiro: "",
  iban: "",
  bic: "",
  swish: "",
  invoice_terms_days: 10,
  invoice_footer: "Tack för att ni valt Helsingbuss.",
  booking_terms: "Betalning ska vara oss tillhanda enligt avtalade villkor.",
  primary_color: "#194C66",
  accent_color: "#00645d",
  logo_url: "",
  updated_at: "",
};

function cleanString(value: any) {
  return String(value || "").trim();
}

function cleanNumber(value: any, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return number;
}

function normalizeSettings(row: any) {
  return {
    ...defaultSettings,
    ...(row || {}),
    invoice_terms_days: cleanNumber(row?.invoice_terms_days, defaultSettings.invoice_terms_days),
  };
}

function cleanPayload(input: any) {
  return {
    setting_key: settingKey,
    company_name: cleanString(input.company_name) || "Helsingbuss",
    legal_name: cleanString(input.legal_name),
    organization_number: cleanString(input.organization_number),
    vat_number: cleanString(input.vat_number),
    address: cleanString(input.address),
    postal_code: cleanString(input.postal_code),
    city: cleanString(input.city),
    country: cleanString(input.country) || "Sverige",
    phone: cleanString(input.phone),
    email: cleanString(input.email),
    website: cleanString(input.website),
    bankgiro: cleanString(input.bankgiro),
    plusgiro: cleanString(input.plusgiro),
    iban: cleanString(input.iban),
    bic: cleanString(input.bic),
    swish: cleanString(input.swish),
    invoice_terms_days: cleanNumber(input.invoice_terms_days, 10),
    invoice_footer: cleanString(input.invoice_footer),
    booking_terms: cleanString(input.booking_terms),
    primary_color: cleanString(input.primary_color) || "#194C66",
    accent_color: cleanString(input.accent_color) || "#00645d",
    logo_url: cleanString(input.logo_url),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("setting_key", settingKey)
        .maybeSingle();

      if (error) {
        return res.status(200).json({
          ok: true,
          settings: defaultSettings,
          warnings: [
            "Tabellen system_company_settings finns kanske inte ännu. Kör SQL-koden för att kunna spara företagsinställningar."
          ],
        });
      }

      return res.status(200).json({
        ok: true,
        settings: normalizeSettings(data),
        warnings: [],
      });
    }

    if (req.method === "POST") {
      const payload = cleanPayload(req.body || {});

      const { data, error } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: "setting_key" })
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({
          ok: false,
          error: "Kunde inte spara företagsinställningar. Kör SQL-koden för system_company_settings om tabellen saknas. " + error.message,
        });
      }

      return res.status(200).json({
        ok: true,
        settings: normalizeSettings(data),
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Metoden stöds inte.",
    });
  } catch (error: any) {
    console.error("/api/admin/system/foretagsinstallningar error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera företagsinställningar.",
    });
  }
}
