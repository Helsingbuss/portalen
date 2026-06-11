import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

const backupTable = "system_backups";

const backupTables = [
  "system_company_settings",
  "system_message_templates",
  "system_documentation",
  "system_api_keys",
  "system_webhooks",
  "app_user_roles",
];

const restorableTables: Record<string, string> = {
  system_company_settings: "setting_key",
  system_message_templates: "key",
  system_documentation: "slug",
  system_api_keys: "name,provider",
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

function normalizeBackup(row: any) {
  const snapshot = row.snapshot || {};
  const tables = snapshot.tables || {};

  return {
    id: row.id,
    name: row.name || "",
    description: row.description || "",
    status: row.status || "created",
    backup_type: row.backup_type || "manual",
    tables: Array.isArray(row.tables) ? row.tables : [],
    table_count: Object.keys(tables).length,
    row_count: Object.values(tables).reduce((sum: number, item: any) => {
      return sum + Number(item?.row_count || 0);
    }, 0),
    snapshot,
    created_at: row.created_at || "",
    restored_at: row.restored_at || "",
    restore_note: row.restore_note || "",
  };
}

async function readTable(supabase: any, table: string) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .limit(3000);

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

async function createBackup(supabase: any, body: any) {
  const name =
    cleanString(body.name) ||
    "Backup " + new Date().toLocaleString("sv-SE");

  const description = cleanString(body.description);

  const tablesToBackup = Array.isArray(body.tables) && body.tables.length > 0
    ? body.tables.filter((table: string) => backupTables.includes(table))
    : backupTables;

  const tableSnapshots: Record<string, any> = {};

  for (const table of tablesToBackup) {
    tableSnapshots[table] = await readTable(supabase, table);
  }

  const snapshot = {
    version: 1,
    created_at: new Date().toISOString(),
    tables: tableSnapshots,
  };

  const rowCount = Object.values(tableSnapshots).reduce((sum: number, item: any) => {
    return sum + Number(item?.row_count || 0);
  }, 0);

  const { data, error } = await supabase
    .from(backupTable)
    .insert({
      name,
      description,
      backup_type: "manual",
      status: "created",
      tables: tablesToBackup,
      row_count: rowCount,
      snapshot,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error("Kunde inte skapa backup. Kör SQL-koden för system_backups om tabellen saknas. " + error.message);
  }

  return normalizeBackup(data);
}

async function restoreBackup(supabase: any, body: any) {
  const id = cleanString(body.id);
  const selectedTables = Array.isArray(body.tables) ? body.tables : [];

  if (!id) {
    throw new Error("Backup-id saknas.");
  }

  if (selectedTables.length === 0) {
    throw new Error("Välj minst en tabell att återställa.");
  }

  const { data: backup, error } = await supabase
    .from(backupTable)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !backup) {
    throw new Error("Backup hittades inte.");
  }

  const snapshotTables = backup.snapshot?.tables || {};
  const results: any[] = [];

  for (const table of selectedTables) {
    if (!restorableTables[table]) {
      results.push({
        table,
        ok: false,
        message: "Tabellen är inte aktiverad för automatisk återställning i version 1.",
      });
      continue;
    }

    const rows = snapshotTables?.[table]?.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      results.push({
        table,
        ok: false,
        message: "Det finns inga rader att återställa för tabellen.",
      });
      continue;
    }

    const { error: restoreError } = await supabase
      .from(table)
      .upsert(rows, {
        onConflict: restorableTables[table],
      });

    if (restoreError) {
      results.push({
        table,
        ok: false,
        message: restoreError.message || "Kunde inte återställa tabellen.",
      });
    } else {
      results.push({
        table,
        ok: true,
        message: rows.length + " rader återställda.",
      });
    }
  }

  await supabase
    .from(backupTable)
    .update({
      restored_at: new Date().toISOString(),
      restore_note: "Återställning körd för: " + selectedTables.join(", "),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

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
        .from(backupTable)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        return res.status(200).json({
          ok: true,
          backups: [],
          backupTables,
          restorableTables: Object.keys(restorableTables),
          warnings: [
            "Tabellen system_backups finns kanske inte ännu. Kör SQL-koden för att kunna skapa backup."
          ],
          summary: {
            total: 0,
            rows: 0,
            latest: "",
          },
        });
      }

      const backups = (data || []).map(normalizeBackup);

      return res.status(200).json({
        ok: true,
        backups,
        backupTables,
        restorableTables: Object.keys(restorableTables),
        warnings: [],
        summary: {
          total: backups.length,
          rows: backups.reduce((sum, backup) => sum + Number(backup.row_count || 0), 0),
          latest: backups[0]?.created_at || "",
        },
      });
    }

    if (req.method === "POST") {
      const action = cleanString(req.body?.action || "create");

      if (action === "create") {
        const backup = await createBackup(supabase, req.body || {});

        return res.status(200).json({
          ok: true,
          backup,
        });
      }

      if (action === "restore") {
        const results = await restoreBackup(supabase, req.body || {});

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
    console.error("/api/admin/system/backup-aterstallning error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera backup och återställning.",
    });
  }
}
