import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

const historyTable = "system_import_export_jobs";

const exportTables = [
  "system_company_settings",
  "system_message_templates",
  "system_documentation",
  "system_api_keys",
  "system_webhooks",
  "system_event_logs",
  "app_user_roles",
  "system_backups",
];

const importableTables: Record<string, string> = {
  system_company_settings: "setting_key",
  system_message_templates: "key",
  system_documentation: "slug",
  system_api_keys: "name,provider",
  system_webhooks: "id",
};

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

function cleanString(value: any) {
  return String(value || "").trim();
}

function normalizeJob(row: any) {
  return {
    id: row.id,
    job_type: row.job_type || "",
    status: row.status || "",
    file_name: row.file_name || "",
    tables: Array.isArray(row.tables) ? row.tables : [],
    row_count: Number(row.row_count || 0),
    message: row.message || "",
    created_at: row.created_at || "",
  };
}

async function readTable(supabase: any, table: string) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .limit(5000);

    if (error) {
      return {
        ok: false,
        table,
        row_count: 0,
        rows: [],
        error: error.message || "Kunde inte läsa tabellen.",
      };
    }

    return {
      ok: true,
      table,
      row_count: (data || []).length,
      rows: data || [],
      error: "",
    };
  } catch (error: any) {
    return {
      ok: false,
      table,
      row_count: 0,
      rows: [],
      error: error?.message || "Kunde inte läsa tabellen.",
    };
  }
}

async function logJob(supabase: any, payload: any) {
  try {
    await supabase.from(historyTable).insert(payload);
  } catch {
    // Historik är valfri. Export/import ska inte krascha om loggtabellen saknas.
  }
}

function getPackageTables(input: any) {
  const tables = input?.tables || input?.snapshot?.tables || {};

  if (!tables || typeof tables !== "object") return {};

  return tables;
}

function extractRowsFromPackage(input: any, table: string) {
  const tables = getPackageTables(input);
  const tableData = tables[table];

  if (!tableData) return [];

  if (Array.isArray(tableData)) return tableData;

  if (Array.isArray(tableData.rows)) return tableData.rows;

  return [];
}

function cleanRowsForImport(table: string, rows: any[]) {
  const conflict = importableTables[table];

  return rows.map((row) => {
    const copy = { ...(row || {}) };

    if (conflict !== "id") {
      delete copy.id;
    }

    delete copy.source;

    return {
      ...copy,
      updated_at: new Date().toISOString(),
    };
  });
}

async function createExport(supabase: any, body: any) {
  const selectedTables =
    Array.isArray(body.tables) && body.tables.length > 0
      ? body.tables.filter((table: string) => exportTables.includes(table))
      : exportTables;

  const tables: Record<string, any> = {};

  for (const table of selectedTables) {
    tables[table] = await readTable(supabase, table);
  }

  const rowCount = Object.values(tables).reduce((sum: number, item: any) => {
    return sum + Number(item?.row_count || 0);
  }, 0);

  const fileName =
    "helsingbuss-export-" +
    new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") +
    ".json";

  const exportPackage = {
    version: 1,
    source: "Helsingbuss Portal",
    exported_at: new Date().toISOString(),
    file_name: fileName,
    tables,
  };

  await logJob(supabase, {
    job_type: "export",
    status: "created",
    file_name: fileName,
    tables: selectedTables,
    row_count: rowCount,
    message: "Export skapad.",
    created_at: new Date().toISOString(),
  });

  return {
    fileName,
    rowCount,
    tables: selectedTables,
    package: exportPackage,
  };
}

async function importPackage(supabase: any, body: any) {
  const packageData = body.packageData || body.importPackage || {};
  const dryRun = body.dryRun === true;

  const selectedTables =
    Array.isArray(body.tables) && body.tables.length > 0
      ? body.tables.filter((table: string) => Boolean(importableTables[table]))
      : Object.keys(importableTables);

  const results: any[] = [];

  for (const table of selectedTables) {
    const conflict = importableTables[table];
    const rows = extractRowsFromPackage(packageData, table);

    if (!rows.length) {
      results.push({
        table,
        ok: false,
        dryRun,
        row_count: 0,
        message: "Inga rader hittades i importfilen.",
      });
      continue;
    }

    if (dryRun) {
      results.push({
        table,
        ok: true,
        dryRun,
        row_count: rows.length,
        message: rows.length + " rader kan importeras.",
      });
      continue;
    }

    const cleanRows = cleanRowsForImport(table, rows);

    const { error } = await supabase
      .from(table)
      .upsert(cleanRows, {
        onConflict: conflict,
      });

    if (error) {
      results.push({
        table,
        ok: false,
        dryRun,
        row_count: rows.length,
        message: error.message || "Kunde inte importera tabellen.",
      });
    } else {
      results.push({
        table,
        ok: true,
        dryRun,
        row_count: rows.length,
        message: rows.length + " rader importerades.",
      });
    }
  }

  const rowCount = results.reduce((sum, item) => sum + Number(item.row_count || 0), 0);

  await logJob(supabase, {
    job_type: dryRun ? "import_test" : "import",
    status: results.every((item) => item.ok) ? "created" : "failed",
    file_name: cleanString(body.fileName),
    tables: selectedTables,
    row_count: rowCount,
    message: dryRun ? "Import testad." : "Import genomförd.",
    created_at: new Date().toISOString(),
  });

  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error: "Supabase env saknas.",
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from(historyTable)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      const warnings: string[] = [];

      if (error) {
        warnings.push("Tabellen system_import_export_jobs finns kanske inte ännu. Kör SQL-koden för historik.");
      }

      const jobs = error ? [] : (data || []).map(normalizeJob);

      return res.status(200).json({
        ok: true,
        exportTables,
        importableTables: Object.keys(importableTables),
        jobs,
        warnings,
        summary: {
          jobs: jobs.length,
          exports: jobs.filter((job) => job.job_type === "export").length,
          imports: jobs.filter((job) => job.job_type === "import").length,
          rows: jobs.reduce((sum, job) => sum + Number(job.row_count || 0), 0),
        },
      });
    }

    if (req.method === "POST") {
      const action = cleanString(req.body?.action);

      if (action === "export") {
        const result = await createExport(supabase, req.body || {});

        return res.status(200).json({
          ok: true,
          result,
        });
      }

      if (action === "import") {
        const results = await importPackage(supabase, req.body || {});

        return res.status(200).json({
          ok: true,
          results,
        });
      }

      return res.status(400).json({
        ok: false,
        error: "Okänd åtgärd.",
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Metoden stöds inte.",
    });
  } catch (error: any) {
    console.error("/api/admin/system/export-import error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera export/import.",
    });
  }
}
