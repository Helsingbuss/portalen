import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function MomsrapportPage() {
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport(nextPeriod = period) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("period", nextPeriod);

      if (nextPeriod === "custom") {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      }

      const res = await fetch("/api/admin/ekonomi/momsrapport?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta momsrapport.");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta momsrapport.");
    } finally {
      setLoading(false);
    }
  }

  function changePeriod(value: string) {
    setPeriod(value);

    if (value !== "custom") {
      loadReport(value);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary || {};

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
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Momsrapport
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Se utgående moms från kundfakturor och ingående moms från leverantörsfakturor, uppdelat per momssats.
                </p>
              </div>

              <a
                href="/admin/ekonomi/oversikt"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
              >
                Ekonomisk översikt
              </a>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[260px_180px_180px_auto] lg:items-end">
                <SelectField
                  label="Period"
                  value={period}
                  onChange={changePeriod}
                  options={[
                    ["month", "Denna månad"],
                    ["year", "I år"],
                    ["last90", "Senaste 90 dagarna"],
                    ["all", "Alla datum"],
                    ["custom", "Eget intervall"],
                  ]}
                />

                <Field label="Från" type="date" value={from} onChange={setFrom} disabled={period !== "custom"} />
                <Field label="Till" type="date" value={to} onChange={setTo} disabled={period !== "custom"} />

                <button
                  type="button"
                  onClick={() => loadReport()}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                >
                  Uppdatera
                </button>
              </div>

              {data?.period?.label && (
                <p className="mt-4 text-sm text-slate-500">
                  Visar: <strong>{data.period.label}</strong>
                  {data.period.from ? " från " + data.period.from : ""}
                  {data.period.to ? " till " + data.period.to : ""}
                </p>
              )}
            </section>

            {data?.supplierNeedsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
                Leverantörsreskontra saknas eller är inte färdig. Momsrapporten visar då inte ingående moms från leverantörsfakturor.
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar momsrapport...
              </section>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-4">
                  <SummaryCard label="Utgående moms" value={fmtMoney(summary.outgoingVat)} />
                  <SummaryCard label="Ingående moms" value={fmtMoney(summary.incomingVat)} />
                  <SummaryCard
                    label={summary.vatToPay >= 0 ? "Moms att betala" : "Moms att få tillbaka"}
                    value={fmtMoney(Math.abs(summary.vatToPay || 0))}
                    highlight={summary.vatToPay < 0}
                    warning={summary.vatToPay >= 0}
                  />
                  <SummaryCard label="Periodens underlag" value={fmtMoney((summary.outgoingNet || 0) - (summary.incomingNet || 0))} />
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  <InfoCard label="Kundfakturor i perioden" value={summary.customerInvoiceCount || 0} />
                  <InfoCard label="Leverantörsfakturor i perioden" value={summary.supplierInvoiceCount || 0} />
                  <InfoCard label="Övriga transaktioner" value={summary.otherTransactionCount || 0} />
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="text-lg font-bold text-[#194C66]">Moms per momssats</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Utgående moms är moms på det du fakturerar. Ingående moms är moms på det du köper in.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <Th>Momssats</Th>
                          <Th className="text-right">Försäljning exkl.</Th>
                          <Th className="text-right">Utgående moms</Th>
                          <Th className="text-right">Inköp exkl.</Th>
                          <Th className="text-right">Ingående moms</Th>
                          <Th className="text-right">Netto moms</Th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {(data?.rows || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                              Ingen moms hittades för perioden.
                            </td>
                          </tr>
                        ) : (
                          data.rows.map((row: any) => (
                            <tr key={row.key}>
                              <Td className="font-bold text-[#194C66]">{row.label}</Td>
                              <Td className="text-right">{fmtMoney(row.outgoingNet)}</Td>
                              <Td className="text-right font-semibold">{fmtMoney(row.outgoingVat)}</Td>
                              <Td className="text-right">{fmtMoney(row.incomingNet)}</Td>
                              <Td className="text-right font-semibold">{fmtMoney(row.incomingVat)}</Td>
                              <Td className={"text-right font-black " + (row.vatToPay >= 0 ? "text-amber-700" : "text-emerald-700")}>
                                {fmtMoney(row.vatToPay)}
                              </Td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <Panel title="Källor i rapporten">
                    <Metric label="Kundfakturor netto" value={fmtMoney(data?.sourceSummary?.customerInvoices?.net)} />
                    <Metric label="Kundfakturor moms" value={fmtMoney(data?.sourceSummary?.customerInvoices?.vat)} />
                    <Metric label="Leverantörsfakturor netto" value={fmtMoney(data?.sourceSummary?.supplierInvoices?.net)} />
                    <Metric label="Leverantörsfakturor moms" value={fmtMoney(data?.sourceSummary?.supplierInvoices?.vat)} />
                  </Panel>

                  <Panel title="Tolkning">
                    <p className="text-sm leading-6 text-slate-600">
                      Om netto moms är positiv betyder det normalt att du har mer utgående moms än ingående moms.
                      Om netto moms är negativ betyder det normalt att du har mer ingående moms än utgående moms.
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Detta är en intern översikt. Kontrollera alltid siffrorna innan du använder dem för momsredovisning.
                    </p>
                  </Panel>
                </section>
              </>
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
  highlight,
  warning,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + (highlight ? "border-emerald-200 bg-emerald-50" : warning ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white")}>
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-[#194C66]">{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-black text-[#194C66]">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-sm first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-[#194C66]">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
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
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
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
