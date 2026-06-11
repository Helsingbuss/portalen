import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

const tableName = "system_api_keys";

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function masked(value: string) {
  if (!value) return "";

  if (value.length <= 8) return "********";

  return value.slice(0, 4) + "..." + value.slice(-4);
}

const envCatalog = [
  {
    name: "Supabase URL",
    provider: "Supabase",
    env_keys: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"],
    description: "Koppling till Supabase-projektet.",
    required: true,
  },
  {
    name: "Supabase Service Role",
    provider: "Supabase",
    env_keys: ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"],
    description: "Servernyckel som API:er använder för adminfunktioner.",
    required: true,
  },
  {
    name: "Supabase Anon Key",
    provider: "Supabase",
    env_keys: ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"],
    description: "Publik nyckel för frontend vid behov.",
    required: false,
  },
  {
    name: "Resend API Key",
    provider: "Resend",
    env_keys: ["RESEND_API_KEY"],
    description: "E-postutskick från portalen.",
    required: false,
  },
  {
    name: "46elks SMS",
    provider: "46elks",
    env_keys: ["ELKS_USERNAME", "ELKS_PASSWORD", "ELKS_API_KEY", "FORTYSIX_ELKS_USERNAME", "FORTYSIX_ELKS_PASSWORD"],
    description: "SMS-utskick och kundnotiser.",
    required: false,
  },
  {
    name: "SumUp",
    provider: "SumUp",
    env_keys: ["SUMUP_API_KEY", "SUMUP_CLIENT_ID", "SUMUP_CLIENT_SECRET"],
    description: "Betalningslänkar och betalstatus.",
    required: false,
  },
  {
    name: "App URL",
    provider: "Portal",
    env_keys: ["NEXT_PUBLIC_APP_URL", "APP_URL", "SITE_URL"],
    description: "Baslänk som används i mejl, biljetter och PDF:er.",
    required: false,
  },
];

function envCheck(item: any) {
  const keys = item.env_keys.map((key: string) => {
    const value = String(process.env[key] || "");

    return {
      key,
      exists: Boolean(value),
      preview: masked(value),
    };
  });

  const exists = keys.some((key: any) => key.exists);

  return {
    ...item,
    exists,
    status: exists ? "active" : item.required ? "missing" : "optional",
    keys,
  };
}

function cleanString(value: any) {
  return String(value || "").trim();
}

function cleanStatus(value: any) {
  const status = cleanString(value || "active").toLowerCase();
  const allowed = ["active", "inactive", "missing", "planned"];

  return allowed.includes(status) ? status : "active";
}

function normalizeRow(row: any) {
  return {
    id: row.id,
    name: row.name || "",
    provider: row.provider || "",
    key_type: row.key_type || "env",
    env_key_name: row.env_key_name || "",
    masked_value: row.masked_value || "",
    status: row.status || "active",
    is_required: row.is_required === true,
    note: row.note || "",
    last_checked_at: row.last_checked_at || "",
    updated_at: row.updated_at || "",
    created_at: row.created_at || "",
  };
}

function cleanPayload(input: any) {
  return {
    name: cleanString(input.name),
    provider: cleanString(input.provider) || "Övrigt",
    key_type: cleanString(input.key_type) || "env",
    env_key_name: cleanString(input.env_key_name),
    masked_value: cleanString(input.masked_value),
    status: cleanStatus(input.status),
    is_required: input.is_required === true,
    note: cleanString(input.note),
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function getSavedKeys(supabase: any) {
  if (!supabase) {
    return {
      rows: [],
      warning: "Supabase env saknas.",
    };
  }

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .order("provider", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return {
      rows: [],
      warning: "Tabellen system_api_keys finns kanske inte ännu. Kör SQL-koden för att kunna spara API-nyckelposter.",
    };
  }

  return {
    rows: (data || []).map(normalizeRow),
    warning: "",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const envChecks = envCatalog.map(envCheck);
      const saved = await getSavedKeys(supabase);

      const warnings = [];
      if (saved.warning) warnings.push(saved.warning);

      return res.status(200).json({
        ok: true,
        envChecks,
        apiKeys: saved.rows,
        warnings,
        summary: {
          envTotal: envChecks.length,
          envActive: envChecks.filter((item) => item.exists).length,
          envMissing: envChecks.filter((item) => item.status === "missing").length,
          savedKeys: saved.rows.length,
          activeSavedKeys: saved.rows.filter((item: any) => item.status === "active").length,
        },
      });
    }

    if (req.method === "POST") {
      if (!supabase) {
        return res.status(500).json({
          ok: false,
          error: "Supabase env saknas.",
        });
      }

      const payload = cleanPayload(req.body || {});

      if (!payload.name) {
        return res.status(400).json({
          ok: false,
          error: "Namn saknas.",
        });
      }

      const { data, error } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: "name,provider" })
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({
          ok: false,
          error: "Kunde inte spara API-nyckelposten. Kör SQL-koden för system_api_keys om tabellen saknas. " + error.message,
        });
      }

      return res.status(200).json({
        ok: true,
        apiKey: normalizeRow(data),
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Metoden stöds inte.",
    });
  } catch (error: any) {
    console.error("/api/admin/system/api-nycklar error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera API-nycklar.",
    });
  }
}
