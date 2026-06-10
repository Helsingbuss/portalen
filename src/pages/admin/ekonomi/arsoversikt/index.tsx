import { useEffect, useMemo, useState } from "react";
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

function currentYear() {
  return new Date().getFullYear();
}

function yearOptions() {
  const year = currentYear();
  return [year - 3, year - 2, year - 1, year, year + 1].map((item) => String(item));
}

export default function ArsoversiktPage() {
  const [year, setYear] = useState(String(currentYear()));
  const [summary, setSummary] = useState<any>({});
  const [quarters, setQuarters] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const csvUrl = useMemo(() => {
    return "/api/admin/ekonomi/arsoversikt?format=csv&year=" + encodeURIComponent(year);
  }, [year]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/arsoversikt?year=" + encodeURIComponent(year));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta årsöversikt.");
      }

      setSummary(json.summary || {});
      setQuarters(json.quarters || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta årsöversikt.");
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
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Årsöversikt
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  En samlad årsrapport för resultat, moms, kassa, obetalda fakturor och kvartal.
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
              <h2 className="text-lg font-bold text-[#194C66]">Välj år</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-[220px_auto] md:items-end">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    År
                  </label>

                  <select
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  >
                    {yearOptions().map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12384c]"
                >
                  Visa år
                </button>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Intäkter exkl moms" value={fmtMoney(summary.revenueExVat)} tone="green" />
              <SummaryCard label="Kostnader exkl moms" value={fmtMoney(summary.costExVat)} tone="red" />
              <SummaryCard label="Resultat exkl moms" value={fmtMoney(summary.resultExVat)} tone={Number(summary.resultExVat || 0) >= 0 ? "green" : "red"} />
              <SummaryCard label="Marginal" value={(summary.marginPercent || 0) + " %"} tone={Number(summary.marginPercent || 0) >= 0 ? "green" : "red"} />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Utgående moms" value={fmtMoney(summary.outgoingVat)} />
              <SummaryCard label="Ingående moms" value={fmtMoney(summary.incomingVat)} />
              <SummaryCard label="Moms att betala/få tillbaka" value={fmtMoney(summary.vatToPay)} tone={Number(summary.vatToPay || 0) >= 0 ? "amber" : "green"} />
              <SummaryCard label="Kassa netto" value={fmtMoney(summary.cashNet)} tone={Number(summary.cashNet || 0) >= 0 ? "green" : "red"} />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Kundfakturor" value={summary.customerInvoiceCount || 0} sub={fmtMoney(summary.customerGross)} />
              <SummaryCard label="Leverantörsfakturor" value={summary.supplierInvoiceCount || 0} sub={fmtMoney(summary.supplierGross)} />
              <SummaryCard label="Kunder obetalt" value={fmtMoney(summary.customerUnpaid)} tone={Number(summary.customerUnpaid || 0) > 0 ? "amber" : "green"} />
              <SummaryCard label="Leverantörer obetalt" value={fmtMoney(summary.supplierUnpaid)} tone={Number(summary.supplierUnpaid || 0) > 0 ? "red" : "green"} />
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Notera:</strong> Årsöversikten är ett internt besluts- och kontrollunderlag. Den ersätter inte bokslut eller bokföringsprogram, men ger en tydlig bild inför avstämning med revisor/bokföring.
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold text-[#194C66]">Kvartalsöversikt</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Se hur året utvecklas kvartal för kvartal.
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Laddar årsöversikt...
                </div>
              ) : quarters.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Ingen data hittades för valt år.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1250px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Kvartal</Th>
                        <Th className="text-right">Intäkter</Th>
                        <Th className="text-right">Kostnader</Th>
                        <Th className="text-right">Resultat</Th>
                        <Th className="text-right">Utg. moms</Th>
                        <Th className="text-right">Ing. moms</Th>
                        <Th className="text-right">Moms netto</Th>
                        <Th className="text-right">Kassa in</Th>
                        <Th className="text-right">Kassa ut</Th>
                        <Th className="text-right">Kassa netto</Th>
                        <Th className="text-right">Kundfakturor</Th>
                        <Th className="text-right">Leverantörer</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {quarters.map((row) => (
                        <tr key={row.quarter} className="align-top transition hover:bg-slate-50">
                          <Td className="font-black text-[#194C66]">{row.quarter}</Td>
                          <Td className="text-right font-bold text-emerald-700">{fmtMoney(row.revenueExVat)}</Td>
                          <Td className="text-right font-bold text-red-700">{fmtMoney(row.costExVat)}</Td>
                          <Td className={"text-right font-black " + (Number(row.resultExVat || 0) >= 0 ? "text-emerald-700" : "text-red-700")}>
                            {fmtMoney(row.resultExVat)}
                          </Td>
                          <Td className="text-right">{fmtMoney(row.outgoingVat)}</Td>
                          <Td className="text-right">{fmtMoney(row.incomingVat)}</Td>
                          <Td className={"text-right font-bold " + (Number(row.vatToPay || 0) >= 0 ? "text-amber-700" : "text-emerald-700")}>
                            {fmtMoney(row.vatToPay)}
                          </Td>
                          <Td className="text-right">{fmtMoney(row.cashIn)}</Td>
                          <Td className="text-right">{fmtMoney(row.cashOut)}</Td>
                          <Td className={"text-right font-bold " + (Number(row.cashNet || 0) >= 0 ? "text-emerald-700" : "text-red-700")}>
                            {fmtMoney(row.cashNet)}
                          </Td>
                          <Td className="text-right">{row.customerInvoiceCount}</Td>
                          <Td className="text-right">{row.supplierInvoiceCount}</Td>
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
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
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
      {sub ? <div className="mt-1 text-xs font-semibold opacity-80">{sub}</div> : null}
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
