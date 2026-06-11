import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ExportImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [exportTables, setExportTables] = useState<string[]>([]);
  const [importableTables, setImportableTables] = useState<string[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedExportTables, setSelectedExportTables] = useState<string[]>([]);
  const [selectedImportTables, setSelectedImportTables] = useState<string[]>([]);
  const [importPackage, setImportPackage] = useState<any>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importResults, setImportResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testingImport, setTestingImport] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const importPreview = useMemo(() => {
    if (!importPackage?.tables) return [];

    return Object.entries(importPackage.tables).map(([table, value]: any) => {
      const rows = Array.isArray(value) ? value : Array.isArray(value?.rows) ? value.rows : [];

      return {
        table,
        row_count: rows.length,
        importable: importableTables.includes(table),
      };
    });
  }, [importPackage, importableTables]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/export-import");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta export/import.");
      }

      setExportTables(json.exportTables || []);
      setImportableTables(json.importableTables || []);
      setJobs(json.jobs || []);
      setSummary(json.summary || {});
      setWarnings(json.warnings || []);

      if ((json.exportTables || []).length > 0 && selectedExportTables.length === 0) {
        setSelectedExportTables(json.exportTables || []);
      }

      if ((json.importableTables || []).length > 0 && selectedImportTables.length === 0) {
        setSelectedImportTables(json.importableTables || []);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta export/import.");
    } finally {
      setLoading(false);
    }
  }

  function toggleExportTable(table: string) {
    setSelectedExportTables((current) => {
      if (current.includes(table)) return current.filter((item) => item !== table);
      return [...current, table];
    });
  }

  function toggleImportTable(table: string) {
    setSelectedImportTables((current) => {
      if (current.includes(table)) return current.filter((item) => item !== table);
      return [...current, table];
    });
  }

  function downloadJson(fileName: string, data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function createExport() {
    try {
      setExporting(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/export-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "export",
          tables: selectedExportTables,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa export.");
      }

      downloadJson(json.result.fileName, json.result.package);

      setSaved("Export skapad och nedladdad.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa export.");
    } finally {
      setExporting(false);
    }
  }

  function handleImportFile(file?: File | null) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Välj en JSON-fil.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));

        if (!parsed.tables || typeof parsed.tables !== "object") {
          throw new Error("Filen saknar tables.");
        }

        setImportPackage(parsed);
        setImportFileName(file.name);
        setImportResults([]);
        setSaved("Importfilen är inläst. Testa importen innan du genomför den.");
        setError("");

        const availableImportTables = Object.keys(parsed.tables).filter((table) => importableTables.includes(table));
        if (availableImportTables.length > 0) {
          setSelectedImportTables(availableImportTables);
        }
      } catch (err: any) {
        setError(err?.message || "Kunde inte läsa JSON-filen.");
      }
    };

    reader.onerror = () => {
      setError("Kunde inte läsa importfilen.");
    };

    reader.readAsText(file);
  }

  async function runImport(dryRun: boolean) {
    if (!importPackage) {
      setError("Välj en importfil först.");
      return;
    }

    try {
      if (dryRun) {
        setTestingImport(true);
      } else {
        const ok = window.confirm("Vill du importera valda tabeller? Detta kan skriva över sparade systeminställningar.");
        if (!ok) return;
        setImporting(true);
      }

      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/export-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "import",
          dryRun,
          fileName: importFileName,
          packageData: importPackage,
          tables: selectedImportTables,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte importera.");
      }

      setImportResults(json.results || []);
      setSaved(dryRun ? "Importtest klart." : "Import genomförd.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte importera.");
    } finally {
      setTestingImport(false);
      setImporting(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  System / inställningar · Data
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Export / import
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Exportera systemdata till JSON och importera säkra inställningstabeller tillbaka vid behov.
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
                <strong>Info:</strong> Kör SQL-koden för att kunna spara historik för export/import.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Jobb" value={summary.jobs || 0} />
              <SummaryCard label="Exporter" value={summary.exports || 0} tone="green" />
              <SummaryCard label="Importer" value={summary.imports || 0} tone="amber" />
              <SummaryCard label="Rader historik" value={summary.rows || 0} />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card title="Exportera data">
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Välj tabeller och skapa en JSON-fil som laddas ner till datorn.
                  </p>

                  <div className="grid gap-2">
                    {exportTables.map((table) => (
                      <button
                        key={table}
                        type="button"
                        onClick={() => toggleExportTable(table)}
                        className={
                          selectedExportTables.includes(table)
                            ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-700"
                            : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        }
                      >
                        {selectedExportTables.includes(table) ? "✓ " : ""}
                        {table}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={createExport}
                    disabled={exporting || selectedExportTables.length === 0}
                    className="w-full rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
                  >
                    {exporting ? "Skapar export..." : "Skapa och ladda ner export"}
                  </button>
                </div>
              </Card>

              <Card title="Importera data">
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => handleImportFile(event.target.files?.[0] || null)}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Välj JSON-fil från datorn
                  </button>

                  {importFileName && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <div className="font-bold text-[#194C66]">{importFileName}</div>
                      <div className="mt-1 text-slate-500">
                        {importPreview.length} tabeller hittades i filen.
                      </div>
                    </div>
                  )}

                  {importPreview.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tabeller att importera
                      </label>

                      <div className="mt-3 grid gap-2">
                        {importPreview.map((item) => (
                          <button
                            key={item.table}
                            type="button"
                            disabled={!item.importable}
                            onClick={() => toggleImportTable(item.table)}
                            className={
                              !item.importable
                                ? "rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-400"
                                : selectedImportTables.includes(item.table)
                                  ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-700"
                                  : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            }
                          >
                            {selectedImportTables.includes(item.table) ? "✓ " : ""}
                            {item.table} · {item.row_count} rader
                            {!item.importable ? " · endast export" : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => runImport(true)}
                      disabled={testingImport || !importPackage || selectedImportTables.length === 0}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      {testingImport ? "Testar..." : "Testa import"}
                    </button>

                    <button
                      type="button"
                      onClick={() => runImport(false)}
                      disabled={importing || !importPackage || selectedImportTables.length === 0}
                      className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:opacity-60"
                    >
                      {importing ? "Importerar..." : "Genomför import"}
                    </button>
                  </div>
                </div>
              </Card>
            </section>

            {importResults.length > 0 && (
              <Card title="Importresultat">
                <div className="space-y-2">
                  {importResults.map((result) => (
                    <div
                      key={result.table}
                      className={
                        result.ok
                          ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                          : "rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                      }
                    >
                      <div className="font-black">{result.table}</div>
                      <div className="mt-1">{result.message}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card title="Historik">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Laddar historik...
                </div>
              ) : jobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Ingen export/import-historik ännu.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Tid</Th>
                        <Th>Typ</Th>
                        <Th>Status</Th>
                        <Th>Fil</Th>
                        <Th>Tabeller</Th>
                        <Th>Rader</Th>
                        <Th>Meddelande</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {jobs.map((job) => (
                        <tr key={job.id} className="align-top transition hover:bg-slate-50">
                          <Td>{formatDate(job.created_at)}</Td>
                          <Td>{job.job_type}</Td>
                          <Td>{job.status}</Td>
                          <Td>{job.file_name || "—"}</Td>
                          <Td>{Array.isArray(job.tables) ? job.tables.length : 0} st</Td>
                          <Td>{job.row_count || 0}</Td>
                          <Td>{job.message || "—"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
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
  tone?: "green" | "amber";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 break-words text-xl font-black">{value}</div>
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

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
