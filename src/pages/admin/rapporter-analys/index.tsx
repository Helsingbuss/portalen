import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function currentYear() {
  return new Date().getFullYear();
}

function yearOptions() {
  const year = currentYear();
  return [year - 2, year - 1, year, year + 1].map((item) => String(item));
}

export default function RapporterAnalysDashboardPage() {
  const [year, setYear] = useState(String(currentYear()));
  const [summary, setSummary] = useState<any>({});
  const [charts, setCharts] = useState<any>({});
  const [links, setLinks] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const maxMonthValue = useMemo(() => {
    const months = charts.months || [];
    return Math.max(
      1,
      ...months.map((row: any) =>
        Math.max(Number(row.revenue || 0), Number(row.costs || 0))
      )
    );
  }, [charts.months]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/rapporter-analys/oversikt?year=" + encodeURIComponent(year));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta rapportöversikt.");
      }

      setSummary(json.summary || {});
      setCharts(json.charts || {});
      setLinks(json.links || []);
      setWarnings(json.warnings || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta rapportöversikt.");
    } finally {
      setLoading(false);
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
                  Rapporter & analys
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Översikt
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Samlad dashboard för försäljning, ekonomi, kunder, produkter och verksamhetsområden.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] shadow-sm outline-none"
                >
                  {yearOptions().map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {warnings.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                <strong>Info:</strong> Några frivilliga datakällor kunde inte hämtas. Dashboarden fungerar ändå med tillgänglig ekonomidata.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Intäkter i år" value={fmtMoney(summary.revenueYear)} tone="green" />
              <SummaryCard label="Kostnader i år" value={fmtMoney(summary.costsYear)} tone="red" />
              <SummaryCard label="Resultat i år" value={fmtMoney(summary.resultYear)} tone={Number(summary.resultYear || 0) >= 0 ? "green" : "red"} />
              <SummaryCard label="Marginal" value={(summary.marginPercent || 0) + " %"} />
              <SummaryCard label="Intäkter denna månad" value={fmtMoney(summary.revenueMonth)} tone="green" />
              <SummaryCard label="Resultat denna månad" value={fmtMoney(summary.resultMonth)} tone={Number(summary.resultMonth || 0) >= 0 ? "green" : "red"} />
              <SummaryCard label="Sålda biljetter" value={summary.soldTicketQuantity || 0} />
              <SummaryCard label="Förfallna fakturor" value={summary.overdueCount || 0} tone={Number(summary.overdueCount || 0) > 0 ? "amber" : "green"} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#194C66]">Månad för månad</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Intäkter och kostnader baserat på ekonomidata.
                </p>

                {loading ? (
                  <div className="mt-6 text-sm text-slate-500">Laddar...</div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {(charts.months || []).map((row: any) => (
                      <div key={row.month}>
                        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span>{row.month}</span>
                          <span>{fmtMoney(row.result)}</span>
                        </div>

                        <div className="grid gap-1">
                          <Bar label="Intäkter" value={Number(row.revenue || 0)} max={maxMonthValue} tone="green" />
                          <Bar label="Kostnader" value={Number(row.costs || 0)} max={maxMonthValue} tone="red" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <TopList title="Bästa kunder" rows={charts.topCustomers || []} />
                <TopList title="Verksamhetsområden" rows={charts.topAreas || []} />
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <TopList title="Produkter / rader" rows={charts.topProducts || []} />

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#194C66]">Rapporter</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Snabblänkar till kommande rapporter.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {links.map(([href, label]) => (
                    <a
                      key={href}
                      href={href}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Nästa steg:</strong> Nu har vi en rapport-dashboard. Därefter bygger vi undersidorna en i taget: Sålda biljetter, Intäktsrapport, Agentrapport, Förarrapport och så vidare.
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "red" | "amber";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-700"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "green" | "red";
}) {
  const width = Math.max(2, Math.min(100, (value / max) * 100));
  const color = tone === "green" ? "bg-emerald-500" : "bg-red-400";

  return (
    <div className="grid grid-cols-[80px_1fr_110px] items-center gap-3 text-xs">
      <div className="font-semibold text-slate-500">{label}</div>

      <div className="h-2 rounded-full bg-slate-100">
        <div className={"h-2 rounded-full " + color} style={{ width: width + "%" }} />
      </div>

      <div className="text-right font-bold text-slate-600">{fmtMoney(value)}</div>
    </div>
  );
}

function TopList({
  title,
  rows,
}: {
  title: string;
  rows: any[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>

      {rows.length === 0 ? (
        <div className="mt-5 text-sm text-slate-500">Ingen data ännu.</div>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((row, index) => (
            <div key={row.label + index} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <div>
                <div className="font-bold text-[#194C66]">{row.label}</div>
                <div className="text-xs text-slate-500">Placering #{index + 1}</div>
              </div>

              <div className="text-right font-black text-[#00645d]">
                {fmtMoney(row.value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
