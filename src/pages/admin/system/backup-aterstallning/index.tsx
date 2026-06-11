import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function BackupAterstallningPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [backupTables, setBackupTables] = useState<string[]>([]);
  const [restorableTables, setRestorableTables] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedRestoreTables, setSelectedRestoreTables] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBackupTables, setSelectedBackupTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const selectedBackup = useMemo(() => {
    return backups.find((backup) => backup.id === selectedId) || backups[0] || null;
  }, [backups, selectedId]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/backup-aterstallning");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta backup.");
      }

      setBackups(json.backups || []);
      setBackupTables(json.backupTables || []);
      setRestorableTables(json.restorableTables || []);
      setSummary(json.summary || {});
      setWarnings(json.warnings || []);

      if ((json.backupTables || []).length > 0 && selectedBackupTables.length === 0) {
        setSelectedBackupTables(json.backupTables || []);
      }

      if (!selectedId && json.backups?.[0]) {
        setSelectedId(json.backups[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta backup.");
    } finally {
      setLoading(false);
    }
  }

  function toggleBackupTable(table: string) {
    setSelectedBackupTables((current) => {
      if (current.includes(table)) {
        return current.filter((item) => item !== table);
      }

      return [...current, table];
    });
  }

  function toggleRestoreTable(table: string) {
    setSelectedRestoreTables((current) => {
      if (current.includes(table)) {
        return current.filter((item) => item !== table);
      }

      return [...current, table];
    });
  }

  async function createBackup() {
    try {
      setCreating(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/backup-aterstallning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          name,
          description,
          tables: selectedBackupTables,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa backup.");
      }

      setSaved("Backup är skapad.");
      setName("");
      setDescription("");
      await loadData();

      if (json.backup?.id) {
        setSelectedId(json.backup.id);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa backup.");
    } finally {
      setCreating(false);
    }
  }

  async function restoreBackup() {
    if (!selectedBackup) return;

    const ok = window.confirm(
      "Vill du återställa valda tabeller från backupen? Detta kan skriva över sparade systeminställningar."
    );

    if (!ok) return;

    try {
      setRestoring(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/backup-aterstallning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "restore",
          id: selectedBackup.id,
          tables: selectedRestoreTables,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte återställa backup.");
      }

      const successCount = (json.results || []).filter((item: any) => item.ok).length;

      setSaved("Återställning klar. " + successCount + " tabeller återställdes.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte återställa backup.");
    } finally {
      setRestoring(false);
    }
  }

  function copySnapshot() {
    if (!selectedBackup?.snapshot) return;

    navigator.clipboard
      .writeText(JSON.stringify(selectedBackup.snapshot, null, 2))
      .then(() => setSaved("Backup-data kopierad till urklipp."))
      .catch(() => setError("Kunde inte kopiera backup-data."));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (restorableTables.length > 0 && selectedRestoreTables.length === 0) {
      setSelectedRestoreTables(restorableTables);
    }
  }, [restorableTables, selectedRestoreTables.length]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  System / inställningar · Säkerhet
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Backup & återställning
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Skapa backup av viktiga systemtabeller och återställ säkra inställningar vid behov.
                </p>
              </div>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
              >
                Uppdatera
              </button>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {saved && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 shadow-sm">
                {saved}
              </section>
            )}

            {warnings.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                <strong>Info:</strong> Kör SQL-koden för att kunna skapa backup.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Backuper" value={summary.total || 0} />
              <SummaryCard label="Sparade rader" value={summary.rows || 0} tone="green" />
              <SummaryCard label="Senaste backup" value={formatDate(summary.latest)} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[430px_1fr]">
              <div className="space-y-6">
                <Card title="Skapa backup">
                  <div className="space-y-4">
                    <Field label="Namn" value={name} onChange={setName} placeholder="Exempel: Backup innan större ändring" />

                    <TextArea
                      label="Beskrivning"
                      value={description}
                      onChange={setDescription}
                      rows={3}
                      placeholder="Valfri notering om varför backupen skapas."
                    />

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tabeller att ta med
                      </label>

                      <div className="mt-3 grid gap-2">
                        {backupTables.map((table) => (
                          <button
                            key={table}
                            type="button"
                            onClick={() => toggleBackupTable(table)}
                            className={
                              selectedBackupTables.includes(table)
                                ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-700"
                                : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            }
                          >
                            {selectedBackupTables.includes(table) ? "✓ " : ""}
                            {table}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={createBackup}
                      disabled={creating || selectedBackupTables.length === 0}
                      className="w-full rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
                    >
                      {creating ? "Skapar backup..." : "Skapa backup"}
                    </button>
                  </div>
                </Card>

                <Card title="Återställning">
                  <div className="space-y-4">
                    <p className="text-sm leading-6 text-slate-600">
                      Version 1 återställer endast säkra systemtabeller, till exempel företagsinställningar, mallar, dokumentation och API-postlistan.
                    </p>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tabeller att återställa
                      </label>

                      <div className="mt-3 grid gap-2">
                        {restorableTables.map((table) => (
                          <button
                            key={table}
                            type="button"
                            onClick={() => toggleRestoreTable(table)}
                            className={
                              selectedRestoreTables.includes(table)
                                ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-700"
                                : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            }
                          >
                            {selectedRestoreTables.includes(table) ? "✓ " : ""}
                            {table}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={restoreBackup}
                      disabled={restoring || !selectedBackup || selectedRestoreTables.length === 0}
                      className="w-full rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:opacity-60"
                    >
                      {restoring ? "Återställer..." : "Återställ valda tabeller"}
                    </button>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card title="Sparade backuper">
                  {loading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      Laddar backuper...
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      Inga backuper skapade ännu.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {backups.map((backup) => (
                        <button
                          key={backup.id}
                          type="button"
                          onClick={() => setSelectedId(backup.id)}
                          className={
                            selectedBackup?.id === backup.id
                              ? "w-full rounded-2xl border border-[#194C66] bg-[#194C66] p-4 text-left text-white"
                              : "w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-700 transition hover:bg-slate-100"
                          }
                        >
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="text-lg font-black">{backup.name}</div>
                              <div className={selectedBackup?.id === backup.id ? "mt-1 text-xs text-white/80" : "mt-1 text-xs text-slate-500"}>
                                {formatDate(backup.created_at)} · {backup.table_count} tabeller · {backup.row_count} rader
                              </div>
                            </div>

                            <span className={selectedBackup?.id === backup.id ? "rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white" : "rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600"}>
                              {backup.status}
                            </span>
                          </div>

                          {backup.description && (
                            <div className={selectedBackup?.id === backup.id ? "mt-3 text-sm leading-6 text-white/85" : "mt-3 text-sm leading-6 text-slate-600"}>
                              {backup.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Detaljer">
                  {!selectedBackup ? (
                    <div className="text-sm text-slate-500">Välj en backup.</div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <div className="text-2xl font-black text-[#194C66]">{selectedBackup.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{formatDate(selectedBackup.created_at)}</div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <MiniStat label="Tabeller" value={selectedBackup.table_count || 0} />
                        <MiniStat label="Rader" value={selectedBackup.row_count || 0} />
                        <MiniStat label="Status" value={selectedBackup.status || "—"} />
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tabeller i backup
                        </div>

                        <div className="mt-3 space-y-2">
                          {Object.entries(selectedBackup.snapshot?.tables || {}).map(([table, info]: any) => (
                            <div key={table} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                              <div>
                                <div className="font-bold text-[#194C66]">{table}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {info.ok ? "OK" : info.error || "Varning"}
                                </div>
                              </div>

                              <div className="font-black text-slate-700">{info.row_count || 0}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={copySnapshot}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                      >
                        Kopiera backup-data som JSON
                      </button>
                    </div>
                  )}
                </Card>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("sv-SE");
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 break-words text-xl font-black">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 break-words text-lg font-black text-[#194C66]">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}
