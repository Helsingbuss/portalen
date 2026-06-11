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

export default function RapportPerVeckaPage() {
  const [period, setPeriod] = useState("this_year");
  const [area, setArea] = useState("all");
  const [start, setStart] = useState(currentYear() + "-01-01");
  const [end, setEnd] = useState(currentYear() + "-12-31");

  const [summary, setSummary] = useState<any>({});
  const [weeks, setWeeks] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [range, setRange] = useState<any>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("area", area);

    if (period === "custom") {
      params.set("start", start);
      params.set("end", end);
    }

    return params.toString();
  }, [period, area, start, end]);

  const csvUrl = "/api/admin/rapporter-analys/per-vecka?format=csv&" + queryString;

  const maxValue = useMemo(() => {
    return Math.max(
      1,
      ...weeks.map((week) => Math.max(Number(week.revenue || 0), Number(week.costs || 0)))
    );
  }, [weeks]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/rapporter-analys/per-vecka?" + queryString);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta rapport per vecka.");
      }

      setSummary(json.summary || {});
      setWeeks(json.weeks || []);
      setRows(json.rows || []);
      setRange(json.range || {});
      setWarnings(json.warnings || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta rapport per vecka.");
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
                  Rapporter & analys · Tidsrapport
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Per vecka
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Följ intäkter, kostnader, resultat och obetalda poster vecka för vecka.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Uppdatera
                </button>

                <a
                  href={csvUrl}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  Exportera CSV
                </a>
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {warnings.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                <strong>Info:</strong> Några datakällor kunde inte hämtas. Rapporten använder de tabeller som finns.
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Filter</h2>

              <div className="mt-5 grid gap-4 xl:grid-cols-[190px_230px_180px_180px_auto] xl:items-end">
                <SelectField
                  label="Period"
                  value={period}
                  onChange={setPeriod}
                  options={[
                    ["this_year", "Detta år"],
                    ["this_month", "Denna månad"],
                    ["custom", "Eget intervall"],
                    ["all", "Alla datum"],
                  ]}
                />

                <SelectField
                  label="Område"
                  value={area}
                  onChange={setArea}
                  options={[
                    ["all", "Alla områden"],
                    ["Sundra", "Sundra"],
                    ["Shuttle", "Shuttle"],
                    ["Beställningstrafik", "Beställningstrafik"],
                  ]}
                />

                <Field
                  label="Från"
                  type="date"
                  value={start}
                  onChange={setStart}
                  disabled={period !== "custom"}
                />

                <Field
                  label="Till"
                  type="date"
                  value={end}
                  onChange={setEnd}
                  disabled={period !== "custom"}
                />

                <button
                  type="button"
                  onClick={loadData}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12384c]"
                >
                  Visa rapport
                </button>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                Visar period: {range.start || "Alla datum"} till {range.end || "Alla datum"}.
              </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              <SummaryCard label="Veckor" value={summary.weekCount || 0} />
              <SummaryCard label="Rader" value={summary.rowCount || 0} />
              <SummaryCard label="Intäkter" value={fmtMoney(summary.revenue)} tone="green" />
              <SummaryCard label="Kostnader" value={fmtMoney(summary.costs)} tone="red" />
              <SummaryCard label="Resultat" value={fmtMoney(summary.result)} tone={Number(summary.result || 0) >= 0 ? "green" : "red"} />
              <SummaryCard label="Snitt/vecka" value={fmtMoney(summary.averageRevenuePerWeek)} />
              <SummaryCard label="Obetalt" value={fmtMoney(summary.unpaid)} tone={Number(summary.unpaid || 0) > 0 ? "amber" : "green"} />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Utveckling per vecka</h2>

              {loading ? (
                <div className="mt-6 text-sm text-slate-500">Laddar...</div>
              ) : weeks.length === 0 ? (
                <div className="mt-6 text-sm text-slate-500">Ingen veckodata hittades.</div>
              ) : (
                <div className="mt-6 space-y-4">
                  {weeks.map((week) => (
                    <div key={week.week}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-bold text-[#194C66]">{week.week}</span>
                        <span className={Number(week.result || 0) >= 0 ? "font-black text-emerald-700" : "font-black text-red-700"}>
                          {fmtMoney(week.result)}
                        </span>
                      </div>

                      <div className="grid gap-1">
                        <Bar label="Intäkter" value={Number(week.revenue || 0)} max={maxValue} tone="green" />
                        <Bar label="Kostnader" value={Number(week.costs || 0)} max={maxValue} tone="red" />
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {week.rows} rader · Sundra {week.sundra} · Shuttle {week.shuttle} · Beställning {week.bestallningstrafik}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold text-[#194C66]">Veckotabell</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Laddar veckor...
                </div>
              ) : weeks.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Inga veckor hittades.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Vecka</Th>
                        <Th className="text-right">Rader</Th>
                        <Th className="text-right">Intäkter</Th>
                        <Th className="text-right">Kostnader</Th>
                        <Th className="text-right">Resultat</Th>
                        <Th className="text-right">Betalt</Th>
                        <Th className="text-right">Obetalt</Th>
                        <Th className="text-right">Sundra</Th>
                        <Th className="text-right">Shuttle</Th>
                        <Th className="text-right">Beställning</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {weeks.map((week) => (
                        <tr key={week.week} className="transition hover:bg-slate-50">
                          <Td className="font-bold text-[#194C66]">{week.week}</Td>
                          <Td className="text-right">{week.rows}</Td>
                          <Td className="text-right font-bold text-emerald-700">{fmtMoney(week.revenue)}</Td>
                          <Td className="text-right font-bold text-red-700">{fmtMoney(week.costs)}</Td>
                          <Td className={Number(week.result || 0) >= 0 ? "text-right font-black text-emerald-700" : "text-right font-black text-red-700"}>
                            {fmtMoney(week.result)}
                          </Td>
                          <Td className="text-right">{fmtMoney(week.paid_amount)}</Td>
                          <Td className="text-right">{fmtMoney(week.unpaid_amount)}</Td>
                          <Td className="text-right">{week.sundra}</Td>
                          <Td className="text-right">{week.shuttle}</Td>
                          <Td className="text-right">{week.bestallningstrafik}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold text-[#194C66]">Underlag</h2>
              </div>

              {rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Inga rader hittades.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1500px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Datum</Th>
                        <Th>Vecka</Th>
                        <Th>Typ</Th>
                        <Th>Källa</Th>
                        <Th>Område</Th>
                        <Th>Namn</Th>
                        <Th>Beskrivning</Th>
                        <Th>Nummer</Th>
                        <Th className="text-right">Intäkt</Th>
                        <Th className="text-right">Kostnad</Th>
                        <Th className="text-right">Resultat</Th>
                        <Th>Status</Th>
                        <Th>Öppna</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, index) => (
                        <tr key={row.id || index} className="align-top transition hover:bg-slate-50">
                          <Td>{row.date || "—"}</Td>
                          <Td>{row.week || "—"}</Td>
                          <Td>{row.type || "—"}</Td>
                          <Td>{row.source || "—"}</Td>
                          <Td>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {row.area || "—"}
                            </span>
                          </Td>
                          <Td className="font-bold text-[#194C66]">{row.name || "—"}</Td>
                          <Td>{row.description || "—"}</Td>
                          <Td>{row.number || "—"}</Td>
                          <Td className="text-right font-bold text-emerald-700">{fmtMoney(row.revenue)}</Td>
                          <Td className="text-right font-bold text-red-700">{fmtMoney(row.costs)}</Td>
                          <Td className={Number(row.result || 0) >= 0 ? "text-right font-black text-emerald-700" : "text-right font-black text-red-700"}>
                            {fmtMoney(row.result)}
                          </Td>
                          <Td>{row.status || "—"}</Td>
                          <Td>
                            {row.href ? (
                              <a
                                href={row.href}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                              >
                                Öppna
                              </a>
                            ) : (
                              "—"
                            )}
                          </Td>
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10 disabled:bg-slate-100 disabled:text-slate-400"
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

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
