import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type PayrollRun = {
  id: string;
  title?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  payout_date?: string | null;
  status?: string | null;
  payroll_underlag_synced_at?: string | null;
};

type Summary = {
  employees?: number;
  absences?: number;
  obAllowances?: number;
  perDiems?: number;
  bonuses?: number;
  total_gross?: number;
  total_preliminary_tax?: number;
  total_net_pay?: number;
  total_payout_amount?: number;
  total_cost?: number;
};

function fmtMoney(value?: number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("sv-SE");
  } catch {
    return value;
  }
}

export default function LonUnderlagPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [runId, setRunId] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedRun = runs.find((run) => run.id === runId) || null;

  async function loadRuns() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/bokforing");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönekörningar.");
      }

      const nextRuns = json.runs || [];
      setRuns(nextRuns);

      if (!runId && nextRuns[0]?.id) {
        setRunId(nextRuns[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta lönekörningar.");
    } finally {
      setLoading(false);
    }
  }

  async function syncUnderlag() {
    try {
      setSyncing(true);
      setError("");
      setMessage("");
      setSummary(null);

      if (!runId) {
        throw new Error("Välj en lönekörning först.");
      }

      const res = await fetch("/api/admin/lon/loneunderlag/" + encodeURIComponent(runId) + "/sync", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte koppla löneunderlag.");
      }

      setSummary(json.summary || null);
      setMessage("Löneunderlaget kopplades till lönekörningen och raderna räknades om.");
      await loadRuns();
    } catch (err: any) {
      setError(err?.message || "Kunde inte koppla löneunderlag.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadRuns();
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
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Löneunderlag
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Koppla godkänd frånvaro, OB/tillägg, traktamente och bonus/provision till en lönekörning.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadRuns}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>

                <button
                  type="button"
                  onClick={syncUnderlag}
                  disabled={syncing || !runId}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {syncing ? "Kopplar..." : "Koppla underlag"}
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Viktigt:</strong> bara poster med status <strong>Godkänd</strong> och <strong>Påverkar lön = Ja</strong> kopplas in. Kontrollera alltid lönebeskedet efter kopplingen.
            </section>

            {(message || error) && (
              <section className={"rounded-2xl border p-5 text-sm font-semibold shadow-sm " + (error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                {error || message}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Välj lönekörning
              </label>

              <select
                value={runId}
                onChange={(event) => {
                  setRunId(event.target.value);
                  setSummary(null);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
              >
                <option value="">Välj lönekörning</option>
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {(run.title || "Lönekörning") + " · " + fmtDate(run.period_start) + " - " + fmtDate(run.period_end)}
                  </option>
                ))}
              </select>

              {selectedRun && (
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  <strong className="text-[#194C66]">{selectedRun.title || "Lönekörning"}</strong>
                  <div>Period: {fmtDate(selectedRun.period_start)} – {fmtDate(selectedRun.period_end)}</div>
                  <div>Utbetalning: {fmtDate(selectedRun.payout_date)}</div>
                  <div>Senast kopplad: {fmtDateTime(selectedRun.payroll_underlag_synced_at)}</div>
                </div>
              )}
            </section>

            {summary && (
              <div className="grid gap-4 md:grid-cols-6">
                <SummaryCard label="Personal" value={summary.employees || 0} />
                <SummaryCard label="Frånvaro" value={summary.absences || 0} tone="red" />
                <SummaryCard label="OB/tillägg" value={summary.obAllowances || 0} tone="blue" />
                <SummaryCard label="Traktamente" value={summary.perDiems || 0} tone="amber" />
                <SummaryCard label="Bonus" value={summary.bonuses || 0} tone="green" />
                <SummaryCard label="Netto" valueText={fmtMoney(summary.total_net_pay || summary.total_payout_amount || 0)} tone="green" />
              </div>
            )}

            {summary && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-[#194C66]">
                  Uppdaterade totalsummor
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <InfoBox label="Brutto" value={fmtMoney(summary.total_gross || 0)} />
                  <InfoBox label="Skatt" value={fmtMoney(summary.total_preliminary_tax || 0)} />
                  <InfoBox label="Nettolön" value={fmtMoney(summary.total_net_pay || summary.total_payout_amount || 0)} />
                  <InfoBox label="Total kostnad" value={fmtMoney(summary.total_cost || 0)} />
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <a
                    href={"/admin/lon/lonekoring/" + encodeURIComponent(runId)}
                    className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f3548]"
                  >
                    Öppna lönekörning
                  </a>

                  <a
                    href="/admin/lon/lonebesked"
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Gå till lönebesked
                  </a>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  valueText,
  tone,
}: {
  label: string;
  value?: number;
  valueText?: string;
  tone?: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50"
        : tone === "red"
          ? "text-red-700 bg-red-50"
          : tone === "blue"
            ? "text-blue-700 bg-blue-50"
            : tone === "slate"
              ? "text-slate-700 bg-slate-50"
              : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-bold">{valueText || value || 0}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-[#194C66]">{value}</div>
    </div>
  );
}
