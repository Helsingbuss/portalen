import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type ResultRow = Record<string, any>;

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

function statusBadge(status: string) {
  if (status === "minus") {
    return "bg-red-100 text-red-700";
  }

  if (status === "low") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function statusLabel(status: string) {
  if (status === "minus") return "Minus";
  if (status === "low") return "Lågt";
  return "Bra";
}

export default function ResultatUppdragPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<any>({
    revenueExVat: 0,
    costExVat: 0,
    resultExVat: 0,
    marginPercent: 0,
    assignments: 0,
    minusCount: 0,
    lowCount: 0,
    goodCount: 0,
  });

  const [q, setQ] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRows() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch("/api/admin/ekonomi/resultat-uppdrag?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta resultat per uppdrag.");
      }

      setRows(json.rows || []);
      setSummary(json.summary || {});
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta resultat per uppdrag.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
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
                  Resultat per uppdrag
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Se intäkt från kundfaktura, kostnad från leverantörs-/samarbetsfakturor och resultat per körning eller uppdrag.
                </p>
              </div>

              <a
                href="/admin/ekonomi/leverantorsreskontra"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
              >
                Till leverantörsreskontra
              </a>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Leverantörsreskontra saknas eller är inte färdig. Kör SQL-koden för leverantörsfakturor först.
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Intäkt exkl. moms" value={fmtMoney(summary.revenueExVat)} />
              <SummaryCard label="Kostnad exkl. moms" value={fmtMoney(summary.costExVat)} />
              <SummaryCard label="Resultat exkl. moms" value={fmtMoney(summary.resultExVat)} highlight={summary.resultExVat >= 0} />
              <SummaryCard label="Marginal" value={(summary.marginPercent || 0) + " %"} />
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <MiniCard label="Bra uppdrag" value={summary.goodCount || 0} tone="good" />
              <MiniCard label="Lågt resultat" value={summary.lowCount || 0} tone="low" />
              <MiniCard label="Minus" value={summary.minusCount || 0} tone="minus" />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Sök kund, fakturanummer, orderreferens eller leverantör..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadRows}
                    className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Sök
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[1380px] w-full border-collapse text-left text-sm">
                  <thead className="bg-white text-slate-900">
                    <tr className="border-b border-slate-200">
                      <Th>Faktura</Th>
                      <Th>Kund</Th>
                      <Th>Datum</Th>
                      <Th>Order</Th>
                      <Th className="text-right">Intäkt exkl.</Th>
                      <Th className="text-right">Kostnad exkl.</Th>
                      <Th className="text-right">Resultat</Th>
                      <Th className="text-right">Marginal</Th>
                      <Th>Leverantörer</Th>
                      <Th className="text-right">Obetalda kostn.</Th>
                      <Th>Status</Th>
                      <Th>Öppna</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                          Laddar resultat...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                          Inga uppdrag hittades.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.customerInvoiceId} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">Faktura {row.invoiceNumber}</div>
                            <div className="mt-1 text-xs text-slate-500">OCR {row.ocrNumber || "—"}</div>
                          </Td>

                          <Td>
                            <div className="font-semibold">{row.customerName}</div>
                            <div className="mt-1 text-xs text-slate-500">{row.category || ""}</div>
                          </Td>

                          <Td>{fmtDate(row.invoiceDate)}</Td>
                          <Td>{row.orderReference || "—"}</Td>

                          <Td className="text-right font-semibold">{fmtMoney(row.revenueExVat)}</Td>
                          <Td className="text-right font-semibold">{fmtMoney(row.costExVat)}</Td>

                          <Td className={"text-right font-black " + (row.resultExVat < 0 ? "text-red-700" : "text-emerald-700")}>
                            {fmtMoney(row.resultExVat)}
                          </Td>

                          <Td className="text-right font-semibold">{row.marginPercent} %</Td>

                          <Td>
                            <div className="font-semibold">{row.supplierCount} st</div>
                            {row.linkedSuppliers?.slice(0, 2).map((supplier: any) => (
                              <div key={supplier.id} className="mt-1 text-xs text-slate-500">
                                {supplier.supplierName} · {fmtMoney(supplier.subtotalExVat)} exkl.
                              </div>
                            ))}
                          </Td>

                          <Td className="text-right font-semibold">{fmtMoney(row.supplierUnpaidAmount)}</Td>

                          <Td>
                            <span className={"rounded-full px-3 py-1 text-xs font-semibold " + statusBadge(row.resultStatus)}>
                              {statusLabel(row.resultStatus)}
                            </span>
                          </Td>

                          <Td>
                            <a
                              href={"/admin/ekonomi/fakturor/" + encodeURIComponent(row.customerInvoiceId)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                            >
                              Öppna
                            </a>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-5 py-4 text-right text-sm text-slate-600">
                {rows.length} uppdrag visas
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + (highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}>
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-[#194C66]">{value}</div>
    </div>
  );
}

function MiniCard({ label, value, tone }: { label: string; value: ReactNode; tone: "good" | "low" | "minus" }) {
  const classes =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "low"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + classes}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
