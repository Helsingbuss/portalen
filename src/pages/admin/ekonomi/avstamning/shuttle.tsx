import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const AREA = "shuttle";
const LABEL = "Shuttle";

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function currentYear() {
  return new Date().getFullYear();
}

export default function AreaAvstamningPage() {
  const [period, setPeriod] = useState("this_year");
  const [start, setStart] = useState(currentYear() + "-01-01");
  const [end, setEnd] = useState(currentYear() + "-12-31");

  const [summary, setSummary] = useState<any>({});
  const [rows, setRows] = useState<any[]>([]);
  const [range, setRange] = useState<any>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("period", period);

    if (period === "custom") {
      params.set("start", start);
      params.set("end", end);
    }

    return params.toString();
  }, [period, start, end]);

  const csvUrl = "/api/admin/ekonomi/avstamning/" + AREA + "?format=csv&" + queryString;

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/avstamning/" + AREA + "?" + queryString);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta avstämning.");
      }

      setSummary(json.summary || {});
      setRows(json.rows || []);
      setRange(json.range || {});
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta avstämning.");
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
                  Ekonomi · Avstämning
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {LABEL}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Stäm av intäkter, kostnader, resultat, moms och obetalda poster för {LABEL}.
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

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Period</h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_180px_180px_auto] lg:items-end">
                <SelectField
                  label="Välj period"
                  value={period}
                  onChange={setPeriod}
                  options={[
                    ["this_year", "Detta år"],
                    ["custom", "Eget intervall"],
                    ["all", "Alla datum"],
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
                  Visa period
                </button>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                Visar period: {range.start || "Alla datum"} till {range.end || "Alla datum"}.
              </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Intäkter exkl moms" value={fmtMoney(summary.revenue)} tone="green" />
              <SummaryCard label="Kostnader exkl moms" value={fmtMoney(summary.costs)} tone="red" />
              <SummaryCard label="Resultat exkl moms" value={fmtMoney(summary.result)} tone={Number(summary.result || 0) >= 0 ? "green" : "red"} />
              <SummaryCard label="Marginal" value={(summary.marginPercent || 0) + " %"} />
              <SummaryCard label="Utgående moms" value={fmtMoney(summary.outgoingVat)} />
              <SummaryCard label="Ingående moms" value={fmtMoney(summary.incomingVat)} />
              <SummaryCard label="Kunder obetalt" value={fmtMoney(summary.unpaidCustomer)} tone={Number(summary.unpaidCustomer || 0) > 0 ? "amber" : "green"} />
              <SummaryCard label="Leverantörer obetalt" value={fmtMoney(summary.unpaidSupplier)} tone={Number(summary.unpaidSupplier || 0) > 0 ? "red" : "green"} />
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Tips:</strong> För att siffrorna ska bli helt rätt bör fakturor och transaktioner innehålla ord som {LABEL}, Sundra, Shuttle, flygbuss eller beställningstrafik i kategori, anteckning, referens eller beskrivning.
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold text-[#194C66]">Underlag</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Här visas matchade rader för vald avstämning.
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Laddar avstämning...
                </div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Inga rader hittades för vald period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1250px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Datum</Th>
                        <Th>Typ</Th>
                        <Th>Nummer</Th>
                        <Th>Namn</Th>
                        <Th>Beskrivning</Th>
                        <Th className="text-right">Netto</Th>
                        <Th className="text-right">Moms</Th>
                        <Th className="text-right">Brutto</Th>
                        <Th className="text-right">Obetalt</Th>
                        <Th>Status</Th>
                        <Th>Öppna</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, index) => (
                        <tr key={row.id || index} className="align-top transition hover:bg-slate-50">
                          <Td>{row.date || "—"}</Td>
                          <Td>
                            <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (row.direction === "Intäkt" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                              {row.type}
                            </span>
                          </Td>
                          <Td>{row.number || "—"}</Td>
                          <Td className="font-bold text-[#194C66]">{row.name || "—"}</Td>
                          <Td>{row.description || "—"}</Td>
                          <Td className="text-right font-bold">{fmtMoney(row.net_amount)}</Td>
                          <Td className="text-right">{fmtMoney(row.vat_amount)}</Td>
                          <Td className="text-right font-black">{fmtMoney(row.gross_amount)}</Td>
                          <Td className="text-right">{fmtMoney(row.unpaid_amount)}</Td>
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
      <div className="mt-2 text-xl font-black">{value}</div>
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
