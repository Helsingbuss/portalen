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

export default function KundanalysPage() {
  const [period, setPeriod] = useState("this_year");
  const [customer, setCustomer] = useState("all");
  const [start, setStart] = useState(currentYear() + "-01-01");
  const [end, setEnd] = useState(currentYear() + "-12-31");

  const [summary, setSummary] = useState<any>({});
  const [customers, setCustomers] = useState<any[]>([]);
  const [areaChart, setAreaChart] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [range, setRange] = useState<any>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("customer", customer);

    if (period === "custom") {
      params.set("start", start);
      params.set("end", end);
    }

    return params.toString();
  }, [period, customer, start, end]);

  const csvUrl = "/api/admin/rapporter-analys/kundanalys?format=csv&" + queryString;

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/rapporter-analys/kundanalys?" + queryString);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta kundanalys.");
      }

      setSummary(json.summary || {});
      setCustomers(json.customers || []);
      setAreaChart(json.areaChart || []);
      setRows(json.rows || []);
      setRange(json.range || {});
      setWarnings(json.warnings || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta kundanalys.");
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
                  Rapporter & analys · Kunder
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Kundanalys
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Följ kundvärde, återkommande kunder, obetalda poster och kundernas fördelning mellan Sundra, Shuttle och Beställningstrafik.
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
                <strong>Info:</strong> Några möjliga kund-/bokningstabeller kunde inte hämtas. Rapporten använder de tabeller som finns.
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Filter</h2>

              <div className="mt-5 grid gap-4 xl:grid-cols-[190px_260px_180px_180px_auto] xl:items-end">
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
                  label="Kund"
                  value={customer}
                  onChange={setCustomer}
                  options={[
                    ["all", "Alla kunder"],
                    ...customers.map((item) => [String(item.customer_id), item.customer_name] as [string, string]),
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
                  Visa analys
                </button>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                Visar period: {range.start || "Alla datum"} till {range.end || "Alla datum"}.
              </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              <SummaryCard label="Kunder" value={summary.customerCount || 0} />
              <SummaryCard label="Återkommande" value={summary.returningCustomers || 0} tone="green" />
              <SummaryCard label="Nya/engångskunder" value={summary.newCustomers || 0} />
              <SummaryCard label="Rader" value={summary.rowCount || 0} />
              <SummaryCard label="Intäkt exkl moms" value={fmtMoney(summary.revenueNet)} tone="green" />
              <SummaryCard label="Snittvärde/kund" value={fmtMoney(summary.averageCustomerValue)} />
              <SummaryCard label="Obetalt" value={fmtMoney(summary.unpaid)} tone={Number(summary.unpaid || 0) > 0 ? "amber" : "green"} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="text-lg font-bold text-[#194C66]">Kunder</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Sorterat efter intäkt exkl. moms.
                  </p>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Laddar kundanalys...
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Ingen kunddata hittades.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1250px] w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <Th>Kund</Th>
                          <Th>E-post</Th>
                          <Th className="text-right">Rader</Th>
                          <Th className="text-right">Fakturor</Th>
                          <Th className="text-right">Bokningar</Th>
                          <Th className="text-right">Intäkt</Th>
                          <Th className="text-right">Betalt</Th>
                          <Th className="text-right">Obetalt</Th>
                          <Th className="text-right">Snittvärde</Th>
                          <Th>Senast</Th>
                          <Th className="text-right">Sundra</Th>
                          <Th className="text-right">Shuttle</Th>
                          <Th className="text-right">Beställning</Th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {customers.map((item) => (
                          <tr key={item.customer_id} className="align-top transition hover:bg-slate-50">
                            <Td className="font-bold text-[#194C66]">{item.customer_name}</Td>
                            <Td>{item.email || "—"}</Td>
                            <Td className="text-right">{item.rows}</Td>
                            <Td className="text-right">{item.invoices}</Td>
                            <Td className="text-right">{item.bookings}</Td>
                            <Td className="text-right font-black text-emerald-700">{fmtMoney(item.revenue_net)}</Td>
                            <Td className="text-right">{fmtMoney(item.paid_amount)}</Td>
                            <Td className="text-right">{fmtMoney(item.unpaid_amount)}</Td>
                            <Td className="text-right">{fmtMoney(item.average_value)}</Td>
                            <Td>{item.last_date || "—"}</Td>
                            <Td className="text-right">{item.sundra}</Td>
                            <Td className="text-right">{item.shuttle}</Td>
                            <Td className="text-right">{item.bestallningstrafik}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <TopList title="Kundvärde per område" rows={areaChart || []} />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold text-[#194C66]">Underlag</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Kundfakturor, bokningar och offerter som ligger till grund för analysen.
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Laddar underlag...
                </div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Inga rader hittades.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1450px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Datum</Th>
                        <Th>Källa</Th>
                        <Th>Kund</Th>
                        <Th>Område</Th>
                        <Th>Beskrivning</Th>
                        <Th>Nummer</Th>
                        <Th className="text-right">Netto</Th>
                        <Th className="text-right">Brutto</Th>
                        <Th className="text-right">Betalt</Th>
                        <Th className="text-right">Obetalt</Th>
                        <Th>Status</Th>
                        <Th>Öppna</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, index) => (
                        <tr key={row.id || index} className="align-top transition hover:bg-slate-50">
                          <Td>{row.date || "—"}</Td>
                          <Td>{row.source || "—"}</Td>
                          <Td className="font-bold text-[#194C66]">{row.customer_name || "Okänd kund"}</Td>
                          <Td>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {row.area || "—"}
                            </span>
                          </Td>
                          <Td>{row.description || "—"}</Td>
                          <Td>{row.number || "—"}</Td>
                          <Td className="text-right font-bold text-emerald-700">{fmtMoney(row.net_amount)}</Td>
                          <Td className="text-right">{fmtMoney(row.gross_amount)}</Td>
                          <Td className="text-right">{fmtMoney(row.paid_amount)}</Td>
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
      <div className="mt-2 text-2xl font-black">{value}</div>
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
            <div key={row.label + index} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-[#194C66]">{row.label}</div>
                  <div className="text-xs text-slate-500">{row.customers} kunder · {row.rows} rader</div>
                </div>

                <div className="text-right font-black text-[#00645d]">
                  {fmtMoney(row.revenue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
