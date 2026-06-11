import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

function masked(value: string) {
  if (!value) return "";

  if (value.length <= 8) return "********";

  return value.slice(0, 4) + "..." + value.slice(-4);
}

function envStatus(keys: string[], label: string, description: string) {
  const found = keys
    .map((key) => ({
      key,
      exists: Boolean(process.env[key]),
      preview: masked(String(process.env[key] || "")),
    }));

  const ok = found.some((item) => item.exists);

  return {
    label,
    description,
    ok,
    status: ok ? "ok" : "missing",
    keys: found,
  };
}

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function checkTable(supabase: any, table: string) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      return {
        table,
        ok: false,
        count: 0,
        message: error.message || "Kunde inte läsa tabellen.",
      };
    }

    return {
      table,
      ok: true,
      count: count || 0,
      message: "Tabellen svarar.",
    };
  } catch (error: any) {
    return {
      table,
      ok: false,
      count: 0,
      message: error?.message || "Kunde inte kontrollera tabellen.",
    };
  }
}

async function checkSupabaseAuth(supabase: any) {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      return {
        ok: false,
        label: "Supabase Auth",
        message: error.message || "Kunde inte läsa användare.",
      };
    }

    return {
      ok: true,
      label: "Supabase Auth",
      message: "Auth svarar. " + String(data?.users?.length || 0) + " användare testläst.",
    };
  } catch (error: any) {
    return {
      ok: false,
      label: "Supabase Auth",
      message: error?.message || "Kunde inte kontrollera Supabase Auth.",
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Metoden stöds inte.",
      });
    }

    const envChecks = [
      envStatus(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"], "Supabase URL", "Koppling till Supabase-projektet."),
      envStatus(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"], "Supabase Service Role", "Servernyckel som används av API:er."),
      envStatus(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"], "Supabase Anon Key", "Publik nyckel för frontend vid behov."),
      envStatus(["RESEND_API_KEY"], "Resend", "E-postutskick från portalen."),
      envStatus(["ELKS_USERNAME", "ELKS_PASSWORD", "ELKS_API_KEY", "FORTYSIX_ELKS_USERNAME", "FORTYSIX_ELKS_PASSWORD"], "46elks / SMS", "SMS-utskick och kundnotiser."),
      envStatus(["SUMUP_API_KEY", "SUMUP_CLIENT_ID", "SUMUP_CLIENT_SECRET"], "SumUp", "Betalningslänkar och betalstatus."),
      envStatus(["NEXT_PUBLIC_APP_URL", "APP_URL", "SITE_URL"], "App URL", "Används för länkar i mejl, biljetter och PDF:er."),
    ];

    const supabase = getSupabase();

    let database = {
      ok: false,
      message: "Supabase URL eller service role key saknas.",
    };

    let auth = {
      ok: false,
      label: "Supabase Auth",
      message: "Supabase kunde inte kontrolleras.",
    };

    let tables: any[] = [];

    if (supabase) {
      const tableNames = [
        "system_company_settings",
        "system_message_templates",
        "system_event_logs",
        "app_user_roles",
        "finance_invoices",
        "supplier_invoices",
        "finance_transactions",
        "customer_register",
        "supplier_register",
      ];

      tables = await Promise.all(tableNames.map((table) => checkTable(supabase, table)));
      auth = await checkSupabaseAuth(supabase);

      const okTables = tables.filter((table) => table.ok).length;

      database = {
        ok: okTables > 0,
        message: okTables + " av " + tables.length + " kontrollerade tabeller svarar.",
      };
    }

    const integrations = [
      {
        key: "supabase",
        name: "Supabase",
        status: supabase && database.ok ? "ok" : "warning",
        description: database.message,
      },
      {
        key: "auth",
        name: "Supabase Auth",
        status: auth.ok ? "ok" : "warning",
        description: auth.message,
      },
      {
        key: "resend",
        name: "Resend / e-post",
        status: envChecks.find((item) => item.label === "Resend")?.ok ? "ok" : "missing",
        description: envChecks.find((item) => item.label === "Resend")?.ok
          ? "API-nyckel finns."
          : "RESEND_API_KEY saknas.",
      },
      {
        key: "sms",
        name: "46elks / SMS",
        status: envChecks.find((item) => item.label === "46elks / SMS")?.ok ? "ok" : "missing",
        description: envChecks.find((item) => item.label === "46elks / SMS")?.ok
          ? "SMS-inställningar verkar finnas."
          : "SMS-nycklar saknas.",
      },
      {
        key: "sumup",
        name: "SumUp / betalning",
        status: envChecks.find((item) => item.label === "SumUp")?.ok ? "ok" : "missing",
        description: envChecks.find((item) => item.label === "SumUp")?.ok
          ? "SumUp-inställningar verkar finnas."
          : "SumUp API-nycklar saknas.",
      },
    ];

    const totalChecks =
      envChecks.length + integrations.length + tables.length + 1;

    const okChecks =
      envChecks.filter((item) => item.ok).length +
      integrations.filter((item) => item.status === "ok").length +
      tables.filter((item) => item.ok).length +
      (database.ok ? 1 : 0);

    const warningChecks =
      integrations.filter((item) => item.status === "warning").length +
      tables.filter((item) => !item.ok).length;

    const missingChecks =
      envChecks.filter((item) => !item.ok).length +
      integrations.filter((item) => item.status === "missing").length;

    return res.status(200).json({
      ok: true,
      checkedAt: new Date().toISOString(),
      summary: {
        totalChecks,
        okChecks,
        warningChecks,
        missingChecks,
      },
      database,
      auth,
      envChecks,
      integrations,
      tables,
    });
  } catch (error: any) {
    console.error("/api/admin/system/systemstatus error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte kontrollera systemstatus.",
    });
  }
}
