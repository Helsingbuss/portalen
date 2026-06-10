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

function dueClass(dueDate?: string | null) {
  const today = new Date().toISOString().slice(0, 10);

  if (!dueDate) return "text-slate-500";
  if (dueDate < today) return "text-red-700";
  if (dueDate === today) return "text-amber-700";

  return "text-slate-700";
}

export default function BetalningskontrollPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/betalningskontroll");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta betalningskontroll.");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta betalningskontroll.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
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
                  Betalningskontroll
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Se vad som ska komma in, vad som ska betalas ut och vilka fakturor som är förfallna.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadDashboard}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  Uppdatera
                </button>

                <a
                  href="/admin/ekonomi/bank"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Bank & betalning
                </a>
              </div>
            </div>

            {data?.supplierNeedsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
                Leverantörsreskontra saknas eller är inte färdig. Utbetalningar till leverantörer visas därför inte fullt ut.
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar betalningskontroll...
              </section>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-4">
                  <SummaryCard
                    label="Att få in"
                    value={fmtMoney(summary.customerOpenAmount)}
                    tone="green"
                  />

                  <SummaryCard
                    label="Att betala ut"
                    value={fmtMoney(summary.supplierOpenAmount)}
                    tone="amber"
                  />

                  <SummaryCard
                    label="Netto öppet"
                    value={fmtMoney(summary.netOpenAmount)}
                    tone={summary.netOpenAmount >= 0 ? "green" : "red"}
                  />

                  <SummaryCard
                    label="Netto 30 dagar"
                    value={fmtMoney(summary.netNext30Amount)}
                    tone={summary.netNext30Amount >= 0 ? "green" : "red"}
                  />
                </section>

                <section className="grid gap-4 md:grid-cols-4">
                  <AlertCard
                    label="Förfallna kundfakturor"
                    value={fmtMoney(summary.customerOverdueAmount)}
                    count={summary.customerOverdueCount}
                    tone={summary.customerOverdueCount > 0 ? "red" : "green"}
                  />

                  <AlertCard
                    label="Förfallna leverantörsfakturor"
                    value={fmtMoney(summary.supplierOverdueAmount)}
                    count={summary.supplierOverdueCount}
                    tone={summary.supplierOverdueCount > 0 ? "red" : "green"}
                  />

                  <AlertCard
                    label="Kommande in 7 dagar"
                    value={fmtMoney(summary.customerNext7Amount)}
                    count={null}
                    tone="green"
                  />

                  <AlertCard
                    label="Ut 7 dagar"
                    value={fmtMoney(summary.supplierNext7Amount)}
                    count={null}
                    tone="amber"
                  />
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <BucketPanel
                    title="Inbetalningar från kunder"
                    buckets={data?.incomingBuckets}
                    positive
                  />

                  <BucketPanel
                    title="Utbetalningar till leverantörer"
                    buckets={data?.outgoingBuckets}
                  />
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <InvoiceList
                    title="Viktigast att följa upp – kundfakturor"
                    items={data?.importantIncoming || []}
                    empty="Inga öppna kundfakturor."
                    amountLabel="Att få in"
                  />

                  <InvoiceList
                    title="Viktigast att betala – leverantörsfakturor"
                    items={data?.importantOutgoing || []}
                    empty="Inga öppna leverantörsfakturor."
                    amountLabel="Att betala"
                    outgoing
                  />
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="text-lg font-bold text-[#194C66]">Bankkonton</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Konton som används för fakturor, löner, moms och betalningar.
                    </p>
                  </div>

                  {(data?.bankAccounts || []).length === 0 ? (
                    <div className="p-5 text-sm text-slate-500">
                      Inga bankkonton är inlagda ännu.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <Th>Konto</Th>
                            <Th>Bank</Th>
                            <Th>Typ</Th>
                            <Th>Kontonummer</Th>
                            <Th>Bankgiro</Th>
                            <Th>Swish</Th>
                            <Th>Användning</Th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {data.bankAccounts.map((account: any) => (
                            <tr key={account.id}>
                              <Td className="font-bold text-[#194C66]">{account.account_label || "Bankkonto"}</Td>
                              <Td>{account.bank_name || "—"}</Td>
                              <Td>{account.account_type || "—"}</Td>
                              <Td>{account.account_number_masked || "—"}</Td>
                              <Td>{account.bankgiro || "—"}</Td>
                              <Td>{account.swish_number || "—"}</Td>
                              <Td>
                                <div className="flex flex-wrap gap-2">
                                  {account.is_primary_invoice_account && <Tag>Faktura</Tag>}
                                  {account.is_primary_payroll_account && <Tag>Lön</Tag>}
                                  {!account.is_active && <Tag warning>Inaktiv</Tag>}
                                </div>
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
  tone,
}: {
  label: string;
  value: ReactNode;
  tone: "green" | "amber" | "red";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function AlertCard({
  label,
  value,
  count,
  tone,
}: {
  label: string;
  value: ReactNode;
  count: number | null;
  tone: "green" | "amber" | "red";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-white text-emerald-700"
      : tone === "red"
        ? "border-red-200 bg-white text-red-700"
        : "border-amber-200 bg-white text-amber-700";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
      {count !== null && (
        <div className="mt-1 text-xs font-semibold text-slate-500">{count} st</div>
      )}
    </div>
  );
}

function BucketPanel({
  title,
  buckets,
  positive,
}: {
  title: string;
  buckets: any;
  positive?: boolean;
}) {
  const rows = [
    ["overdue", "Förfallet"],
    ["today", "Idag"],
    ["next7", "Kommande 7 dagar"],
    ["next30", "Kommande 30 dagar"],
    ["later", "Senare"],
    ["no_due_date", "Saknar förfallodatum"],
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>

      <div className="mt-4 space-y-3">
        {rows.map(([key, label]) => {
          const item = buckets?.[key] || { count: 0, amount: 0 };

          return (
            <div key={key} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-b-0 last:pb-0">
              <div>
                <div className="font-semibold text-slate-700">{label}</div>
                <div className="mt-0.5 text-xs text-slate-500">{item.count} st</div>
              </div>

              <div className={"font-black " + (positive ? "text-emerald-700" : "text-amber-700")}>
                {fmtMoney(item.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InvoiceList({
  title,
  items,
  empty,
  amountLabel,
  outgoing,
}: {
  title: string;
  items: any[];
  empty: string;
  amountLabel: string;
  outgoing?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      </div>

      {items.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">{empty}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <a key={item.id} href={item.href} className="block p-5 transition hover:bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-bold text-[#194C66]">
                    {item.name || "—"}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    Fakt.nr {item.invoice_number || "—"} · OCR {item.ocr_number || "—"}
                  </div>

                  <div className={"mt-1 text-sm font-semibold " + dueClass(item.due_date)}>
                    Förfallodatum: {fmtDate(item.due_date)} · {item.status_label}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {amountLabel}
                  </div>
                  <div className={"mt-1 text-lg font-black " + (outgoing ? "text-amber-700" : "text-emerald-700")}>
                    {fmtMoney(item.amount)}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function Tag({ children, warning }: { children: ReactNode; warning?: boolean }) {
  return (
    <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (warning ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
      {children}
    </span>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
