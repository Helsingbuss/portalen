import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function LoggarHandelserPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const [newLevel, setNewLevel] = useState("info");
  const [newModule, setNewModule] = useState("System");
  const [newAction, setNewAction] = useState("Manuell notering");
  const [newMessage, setNewMessage] = useState("");

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesLevel = levelFilter === "all" || log.level === levelFilter;

      const searchable = [
        log.level,
        log.module,
        log.action,
        log.message,
        log.actor_email,
        log.actor_name,
        log.created_at,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || searchable.includes(q);

      return matchesLevel && matchesSearch;
    });
  }, [logs, search, levelFilter]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/loggar-handelser");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta loggar och händelser.");
      }

      setLogs(json.logs || []);
      setSummary(json.summary || {});
      setWarnings(json.warnings || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta loggar och händelser.");
    } finally {
      setLoading(false);
    }
  }

  async function createLog() {
    try {
      setSaving(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/loggar-handelser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          level: newLevel,
          module: newModule,
          action: newAction,
          message: newMessage,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara loggen.");
      }

      setSaved("Loggen är sparad.");
      setNewMessage("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara loggen.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
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
                  System / inställningar · Kontroll
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Loggar & händelser
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Följ viktiga händelser i portalen, spara interna noteringar och få bättre kontroll över systemet.
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
                <strong>Info:</strong> Kör SQL-koden för att kunna spara och visa loggar.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Totalt" value={summary.total || 0} />
              <SummaryCard label="Info" value={summary.info || 0} />
              <SummaryCard label="Lyckade" value={summary.success || 0} tone="green" />
              <SummaryCard label="Varningar" value={summary.warning || 0} tone="amber" />
              <SummaryCard label="Fel" value={summary.error || 0} tone="red" />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Lägg till manuell händelse</h2>

              <div className="mt-5 grid gap-4 xl:grid-cols-4">
                <SelectField
                  label="Nivå"
                  value={newLevel}
                  onChange={setNewLevel}
                  options={[
                    ["info", "Info"],
                    ["success", "Lyckad"],
                    ["warning", "Varning"],
                    ["error", "Fel"],
                  ]}
                />

                <Field
                  label="Modul"
                  value={newModule}
                  onChange={setNewModule}
                />

                <Field
                  label="Händelse"
                  value={newAction}
                  onChange={setNewAction}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={createLog}
                    disabled={saving || !newMessage.trim()}
                    className="w-full rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara logg"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Meddelande
                </label>

                <textarea
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  placeholder="Exempel: Ändrade behörighet för användare eller kontrollerade en faktura."
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 xl:grid-cols-[1fr_240px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  placeholder="Sök i loggar..."
                />

                <select
                  value={levelFilter}
                  onChange={(event) => setLevelFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                >
                  <option value="all">Alla nivåer</option>
                  <option value="info">Info</option>
                  <option value="success">Lyckade</option>
                  <option value="warning">Varningar</option>
                  <option value="error">Fel</option>
                </select>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold text-[#194C66]">Händelser</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Visar de senaste 500 loggarna.
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Laddar loggar...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Inga loggar hittades.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1000px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Tid</Th>
                        <Th>Nivå</Th>
                        <Th>Modul</Th>
                        <Th>Händelse</Th>
                        <Th>Meddelande</Th>
                        <Th>Användare</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="align-top transition hover:bg-slate-50">
                          <Td>{formatDate(log.created_at)}</Td>
                          <Td>
                            <LevelBadge level={log.level} />
                          </Td>
                          <Td className="font-semibold text-[#194C66]">{log.module || "System"}</Td>
                          <Td>{log.action || "—"}</Td>
                          <Td>{log.message || "—"}</Td>
                          <Td>{log.actor_name || log.actor_email || "—"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

function LevelBadge({ level }: { level: string }) {
  const cls =
    level === "success"
      ? "bg-emerald-100 text-emerald-700"
      : level === "warning"
        ? "bg-amber-100 text-amber-700"
        : level === "error"
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-700";

  const label =
    level === "success"
      ? "Lyckad"
      : level === "warning"
        ? "Varning"
        : level === "error"
          ? "Fel"
          : "Info";

  return <span className={"rounded-full px-3 py-1 text-xs font-bold " + cls}>{label}</span>;
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "amber" | "red";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      >
        {options.map(([key, optionLabel]) => (
          <option key={key} value={key}>{optionLabel}</option>
        ))}
      </select>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
