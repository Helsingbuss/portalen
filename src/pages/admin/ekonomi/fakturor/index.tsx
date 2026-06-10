import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Invoice = Record<string, any>;

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
    case "draft": return "Utkast";
    case "sent": return "Skickad";
    case "unpaid": return "Obetald";
    case "overdue": return "Förfallen";
    case "paid": return "Betald";
    case "credited": return "Krediterad";
    default: return value || "Status";
  }
}

function typeLabel(value?: string | null) {
  switch (value) {
    case "credit": return "Kreditfaktura";
    default: return "Debetfaktura";
  }
}

export default function EkonomiFakturorPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 0,
    drafts: 0,
    unpaid: 0,
    paid: 0,
    unpaidAmount: 0,
    totalAmount: 0,
  });

  const [tab, setTab] = useState("unpaid");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadInvoices(nextTab = tab) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("tab", nextTab);

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);

      const res = await fetch("/api/admin/ekonomi/fakturor?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta fakturor.");
      }

      let rows = json.invoices || [];

      if (category) {
        rows = rows.filter((row: any) => row.category === category);
      }

      setInvoices(rows);
      setSummary(json.summary || {});
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta fakturor.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteInvoice(invoice: Invoice) {
    const invoiceNumber = invoice.invoice_number || "fakturan";

    const ok = window.confirm(
      "Vill du ta bort " + invoiceNumber + "?\n\nFakturan arkiveras och försvinner från listan, men raderas inte permanent."
    );

    if (!ok) return;

    try {
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(invoice.id), {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte ta bort fakturan.");
      }

      setMessage("Fakturan togs bort/arkiverades.");
      await loadInvoices();
    } catch (err: any) {
      setError(err?.message || "Kunde inte ta bort fakturan.");
    }
  }

  function changeTab(nextTab: string) {
    setTab(nextTab);
    loadInvoices(nextTab);
  }

  useEffect(() => {
    loadInvoices();
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
                  Kundfakturor
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Skapa och hantera kundfakturor direkt i portalen. Artiklar, moms och bankuppgifter hämtas från Ekonomi.
                </p>
              </div>

              <a
                href="/admin/ekonomi/fakturor/gammal-betald"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
              >
                Lägg in gammal betald
              </a>

              <a
                href="/admin/ekonomi/fakturor/fran-offert"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
              >
                Skapa från offert
              </a>

              <a
                href="/admin/ekonomi/fakturor/ny"
                className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
              >
                Ny kundfaktura
              </a>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Fakturatabellerna saknas. Kör SQL-koden för Ekonomi → Fakturor först.
              </section>
            )}

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 shadow-sm">
                {message}
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid md:grid-cols-3">
                <TabButton active={tab === "draft"} onClick={() => changeTab("draft")}>
                  Utkast <Badge>{summary.drafts || 0}</Badge>
                </TabButton>

                <TabButton active={tab === "unpaid"} onClick={() => changeTab("unpaid")}>
                  Obetalda kundfakturor <Badge>{summary.unpaid || 0}</Badge>
                </TabButton>

                <TabButton active={tab === "all"} onClick={() => changeTab("all")}>
                  Alla kundfakturor <Badge>{summary.total || 0}</Badge>
                </TabButton>
              </div>

              <div className="border-t border-slate-200 p-5">
                <div className="grid gap-4 lg:grid-cols-[360px_1fr_1fr_auto]">
                  <Field label="Sök" value={q} onChange={setQ} placeholder="Sök faktura, kund, orderreferens..." />

                  <SelectField
                    label="Kategori"
                    value={category}
                    onChange={setCategory}
                    options={[
                      ["", "Alla fakturor"],
                      ["Normal", "Normal"],
                      ["Bussresa", "Bussresa"],
                      ["Sundra", "Sundra"],
                      ["Flygbuss", "Flygbuss"],
                    ]}
                  />

                  <SelectField
                    label="Status"
                    value={status}
                    onChange={setStatus}
                    options={[
                      ["", "Alla fakturor"],
                      ["draft", "Utkast"],
                      ["sent", "Skickad"],
                      ["unpaid", "Obetald"],
                      ["overdue", "Förfallen"],
                      ["paid", "Betald"],
                      ["credited", "Krediterad"],
                    ]}
                  />

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => loadInvoices()}
                      className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                    >
                      Filtrera
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-right text-sm font-semibold text-slate-700">
                  Totalt obetalt: {fmtMoney(summary.unpaidAmount)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1380px] w-full border-collapse text-left text-sm">
                  <thead className="bg-white text-slate-900">
                    <tr className="border-b border-slate-200">
                      <Th>Ver.nr</Th>
                      <Th>Fakt.nr</Th>
                      <Th>Kundnr</Th>
                      <Th>Kundnamn</Th>
                      <Th>Er orderreferens</Th>
                      <Th>Typ</Th>
                      <Th>Kategori</Th>
                      <Th>Fakturadatum</Th>
                      <Th>Förfallodatum</Th>
                      <Th>Status</Th>
                      <Th>Förhandsgranskad</Th>
                      <Th>Obetalt belopp</Th>
                      <Th>Åtgärd</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                          Laddar fakturor...
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                          Inga fakturor hittades.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          onClick={() => {
                            window.location.href = "/admin/ekonomi/fakturor/" + encodeURIComponent(invoice.id);
                          }}
                          className="cursor-pointer align-top transition hover:bg-slate-50"
                        >
                          <Td>
                            <span className="font-semibold text-blue-700 underline">
                              {invoice.voucher_number || "A"}
                            </span>
                          </Td>
                          <Td>
                            <span className="font-semibold text-blue-700 underline">
                              {invoice.invoice_number || "—"}
                            </span>
                          </Td>
                          <Td>{invoice.customer_number || "—"}</Td>
                          <Td>
                            <div className="font-semibold text-slate-900">{invoice.customer_name}</div>
                          </Td>
                          <Td>{invoice.order_reference || "—"}</Td>
                          <Td>{typeLabel(invoice.invoice_type)}</Td>
                          <Td>{invoice.category || "Normal"}</Td>
                          <Td>{fmtDate(invoice.invoice_date)}</Td>
                          <Td>{fmtDate(invoice.due_date)}</Td>
                          <Td>{statusLabel(invoice.status)}</Td>
                          <Td>
                            {invoice.approved_for_sending_at ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Godkänd</span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Ej godkänd</span>
                            )}
                          </Td>
                          <Td className="text-right font-bold">{fmtMoney(invoice.unpaid_amount)}</Td>
                          <Td>
                            <button
                              type="button"
                              title="Ta bort faktura"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteInvoice(invoice);
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Ta bort
                            </button>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-5 py-4 text-right text-sm text-slate-600">
                {invoices.length} poster visas
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "border-b border-slate-200 px-5 py-4 text-sm font-semibold transition " +
        (active ? "bg-[#d8b4fe] text-slate-900" : "bg-white text-slate-700 hover:bg-slate-50")
      }
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-[#194C66] shadow-sm">
      {children}
    </span>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
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

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
