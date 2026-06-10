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

function statusLabel(value?: string | null) {
  switch (value) {
    case "paid": return "Betald";
    case "sent": return "Skickad";
    case "draft": return "Utkast";
    case "received": return "Mottagen";
    case "approved": return "Godkänd";
    case "unpaid": return "Obetald";
    case "overdue": return "Förfallen";
    default: return value || "Status";
  }
}

export default function EkonomiOversiktPage() {
  const [period, setPeriod] = useState("year");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOverview(nextPeriod = period) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("period", nextPeriod);

      if (nextPeriod === "custom") {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      }

      const res = await fetch("/api/admin/ekonomi/oversikt?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta ekonomisk översikt.");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta ekonomisk översikt.");
    } finally {
      setLoading(false);
    }
  }

  function changePeriod(value: string) {
    setPeriod(value);
    if (value !== "custom") {
      loadOverview(value);
    }
  }

  useEffect(() => {
    loadOverview();
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
                  Ekonomisk översikt
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Samlad bild av kundfakturor, leverantörsfakturor, moms, obetalda belopp och resultat.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="/admin/ekonomi/fakturor" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50">
                  Kundfakturor
                </a>

                <a href="/admin/ekonomi/leverantorsreskontra" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50">
                  Leverantörsreskontra
                </a>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[260px_180px_180px_auto] lg:items-end">
                <SelectField
                  label="Period"
                  value={period}
                  onChange={changePeriod}
                  options={[
                    ["year", "I år"],
                    ["month", "Denna månad"],
                    ["last30", "Senaste 30 dagarna"],
                    ["last90", "Senaste 90 dagarna"],
                    ["all", "Alla datum"],
                    ["custom", "Eget intervall"],
                  ]}
                />

                <Field label="Från" type="date" value={from} onChange={setFrom} disabled={period !== "custom"} />
                <Field label="Till" type="date" value={to} onChange={setTo} disabled={period !== "custom"} />

                <button
                  type="button"
                  onClick={() => loadOverview()}
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
                Leverantörsreskontra är inte färdig i databasen ännu. Kör SQL-koden för leverantörsfakturor om du inte redan gjort det.
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar ekonomisk översikt...
              </section>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-4">
                  <SummaryCard label="Intäkter exkl. moms" value={fmtMoney(summary.revenueExVat)} />
                  <SummaryCard label="Kostnader exkl. moms" value={fmtMoney(summary.costExVat)} />
                  <SummaryCard label="Resultat exkl. moms" value={fmtMoney(summary.resultExVat)} highlight={summary.resultExVat >= 0} negative={summary.resultExVat < 0} />
                  <SummaryCard label="Marginal" value={(summary.marginPercent || 0) + " %"} />
                </section>

                <section className="grid gap-4 md:grid-cols-4">
                  <InfoCard label="Kundfakturor obetalt" value={fmtMoney(summary.customerUnpaid)} tone="green" />
                  <InfoCard label="Leverantörer att betala" value={fmtMoney(summary.supplierUnpaid)} tone="amber" />
                  <InfoCard label="Netto kommande betalningar" value={fmtMoney(summary.netFutureCash)} tone={summary.netFutureCash >= 0 ? "green" : "red"} />
                  <InfoCard label="Moms att betala/få tillbaka" value={fmtMoney(summary.vatToPay)} tone={summary.vatToPay >= 0 ? "amber" : "green"} />
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <Panel title="Kundfakturor">
                    <Metric label="Antal" value={summary.customerCount || 0} />
                    <Metric label="Fakturerat exkl. moms" value={fmtMoney(summary.customerRevenueExVat)} />
                    <Metric label="Utgående moms" value={fmtMoney(summary.customerVat)} />
                    <Metric label="Betalt inkl. moms" value={fmtMoney(summary.customerPaid)} />
                    <Metric label="Obetalt inkl. moms" value={fmtMoney(summary.customerUnpaid)} />
                  </Panel>

                  <Panel title="Leverantörsfakturor">
                    <Metric label="Antal" value={summary.supplierCount || 0} />
                    <Metric label="Kostnad exkl. moms" value={fmtMoney(summary.supplierCostExVat)} />
                    <Metric label="Ingående moms" value={fmtMoney(summary.supplierVat)} />
                    <Metric label="Betalt inkl. moms" value={fmtMoney(summary.supplierPaid)} />
                    <Metric label="Att betala inkl. moms" value={fmtMoney(summary.supplierUnpaid)} />
                  </Panel>

                  <Panel title="Varningar">
                    <Metric label="Förfallna kundfakturor" value={summary.overdueCustomerCount || 0} danger={summary.overdueCustomerCount > 0} />
                    <Metric label="Förfallna leverantörsfakturor" value={summary.overdueSupplierCount || 0} danger={summary.overdueSupplierCount > 0} />
                    <Metric label="Övriga intäkter exkl. moms" value={fmtMoney(summary.otherIncomeExVat)} />
                    <Metric label="Övriga kostnader exkl. moms" value={fmtMoney(summary.otherExpenseExVat)} />
                  </Panel>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="text-lg font-bold text-[#194C66]">Senaste 12 månaderna</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Intäkter, kostnader och resultat exkl. moms per månad.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <Th>Månad</Th>
                          <Th className="text-right">Intäkt exkl.</Th>
                          <Th className="text-right">Kostnad exkl.</Th>
                          <Th className="text-right">Resultat</Th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {(data?.monthRows || []).map((row: any) => (
                          <tr key={row.key}>
                            <Td>{row.label}</Td>
                            <Td className="text-right font-semibold">{fmtMoney(row.revenueExVat)}</Td>
                            <Td className="text-right font-semibold">{fmtMoney(row.costExVat)}</Td>
                            <Td className={"text-right font-black " + (row.resultExVat < 0 ? "text-red-700" : "text-emerald-700")}>
                              {fmtMoney(row.resultExVat)}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <ListPanel title="Förfallna kundfakturor">
                    {(data?.overdueCustomerInvoices || []).length === 0 ? (
                      <EmptyText>Inga förfallna kundfakturor.</EmptyText>
                    ) : (
                      data.overdueCustomerInvoices.map((item: any) => (
                        <ListItem
                          key={item.id}
                          title={"Faktura " + item.invoice_number}
                          subtitle={item.customer_name + " · Förföll " + fmtDate(item.due_date)}
                          amount={fmtMoney(item.unpaid_amount || item.total_amount)}
                          href={"/admin/ekonomi/fakturor/" + item.id}
                          danger
                        />
                      ))
                    )}
                  </ListPanel>

                  <ListPanel title="Leverantörsfakturor att betala">
                    {(data?.upcomingSupplierInvoices || []).length === 0 ? (
                      <EmptyText>Inga leverantörsfakturor att betala.</EmptyText>
                    ) : (
                      data.upcomingSupplierInvoices.map((item: any) => (
                        <ListItem
                          key={item.id}
                          title={item.supplier_name}
                          subtitle={"Fakt.nr " + item.supplier_invoice_number + " · Förfall " + fmtDate(item.due_date)}
                          amount={fmtMoney(item.unpaid_amount || item.total_amount)}
                          href={"/admin/ekonomi/leverantorsreskontra/" + item.id}
                          danger={item.due_date && item.due_date < new Date().toISOString().slice(0, 10)}
                        />
                      ))
                    )}
                  </ListPanel>
                </section>

                <ListPanel title="Senaste aktivitet">
                  {(data?.recentItems || []).length === 0 ? (
                    <EmptyText>Ingen aktivitet ännu.</EmptyText>
                  ) : (
                    data.recentItems.map((item: any, index: number) => (
                      <ListItem
                        key={index}
                        title={item.title}
                        subtitle={(item.name || "") + " · " + fmtDate(item.date) + " · " + statusLabel(item.status)}
                        amount={fmtMoney(item.amount)}
                        href={item.href}
                      />
                    ))
                  )}
                </ListPanel>
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
  negative,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + (negative ? "border-red-200 bg-red-50" : highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}>
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className={"mt-2 text-2xl font-black " + (negative ? "text-red-700" : "text-[#194C66]")}>{value}</div>
    </div>
  );
}

function InfoCard({ label, value, tone }: { label: string; value: ReactNode; tone: "green" | "amber" | "red" }) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Metric({ label, value, danger }: { label: string; value: ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className={"font-bold " + (danger ? "text-red-700" : "text-[#194C66]")}>{value}</span>
    </div>
  );
}

function ListPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function ListItem({
  title,
  subtitle,
  amount,
  href,
  danger,
}: {
  title: string;
  subtitle: string;
  amount: string;
  href: string;
  danger?: boolean;
}) {
  return (
    <a href={href} className="flex items-center justify-between gap-4 p-5 transition hover:bg-slate-50">
      <div>
        <div className="font-bold text-[#194C66]">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      </div>
      <div className={"text-right font-black " + (danger ? "text-red-700" : "text-slate-900")}>{amount}</div>
    </a>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <div className="p-5 text-sm text-slate-500">{children}</div>;
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
