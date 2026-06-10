import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type SupplierInvoice = Record<string, any>;

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
    case "received": return "Mottagen";
    case "approved": return "Godkänd";
    case "unpaid": return "Obetald";
    case "overdue": return "Förfallen";
    case "paid": return "Betald";
    case "archived": return "Arkiverad";
    default: return value || "Status";
  }
}

export default function LeverantorsreskontraPage() {
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 0,
    unpaid: 0,
    paid: 0,
    unpaidAmount: 0,
    paidAmount: 0,
    totalAmount: 0,
  });

  const [tab, setTab] = useState("unpaid");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");

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
      if (origin) params.set("origin", origin);

      const res = await fetch("/api/admin/ekonomi/leverantorsreskontra?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta leverantörsfakturor.");
      }

      setSupplierInvoices(json.supplierInvoices || []);
      setSummary(json.summary || {});
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta leverantörsfakturor.");
    } finally {
      setLoading(false);
    }
  }

  async function markInvoicePaid(invoice: SupplierInvoice) {
    const paidDate = window.prompt(
      "Ange betaldatum (YYYY-MM-DD)",
      new Date().toISOString().slice(0, 10)
    );

    if (!paidDate) return;

    const ok = window.confirm(
      "Vill du markera leverantörsfakturan från " +
        (invoice.supplier_name || "leverantören") +
        " som betald?"
    );

    if (!ok) return;

    try {
      setError("");
      setMessage("");

      const res = await fetch(
        "/api/admin/ekonomi/leverantorsreskontra/" +
          encodeURIComponent(invoice.id) +
          "/mark-paid",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paid_date: paidDate,
            payment_method: invoice.payment_method || "bank_transfer",
            paid_bank_account_id: invoice.paid_bank_account_id || "",
            payment_reference:
              invoice.payment_reference ||
              invoice.ocr_number ||
              invoice.supplier_invoice_number,
          }),
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte markera leverantörsfakturan som betald.");
      }

      setMessage("Leverantörsfakturan markerades som betald.");
      await loadInvoices();
    } catch (err: any) {
      setError(err?.message || "Kunde inte markera leverantörsfakturan som betald.");
    }
  }

async function deleteInvoice(invoice: SupplierInvoice) {
    const ok = window.confirm(
      "Vill du arkivera leverantörsfakturan från " + (invoice.supplier_name || "leverantören") + "?"
    );

    if (!ok) return;

    try {
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(invoice.id), {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte arkivera leverantörsfakturan.");
      }

      setMessage("Leverantörsfakturan arkiverades.");
      await loadInvoices();
    } catch (err: any) {
      setError(err?.message || "Kunde inte arkivera leverantörsfakturan.");
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
                  Leverantörsreskontra
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Hantera leverantörsfakturor, samarbetsfakturor och gamla inkomna fakturor. Betalda fakturor kan skapa kostnad automatiskt.
                </p>
              </div>

              <a
                href="/admin/ekonomi/leverantorsreskontra/ny?mode=historical-paid"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
              >
                Gammal betald
              </a>

              <a
                href="/admin/ekonomi/leverantorsreskontra/ny?mode=historical-unpaid"
                className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
              >
                Gammal obetald
              </a>

              <a
                href="/admin/ekonomi/leverantorsreskontra/ny"
                className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
              >
                Ny leverantörsfaktura
              </a>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellerna för leverantörsreskontra saknas. Kör SQL-koden först.
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
                <TabButton active={tab === "unpaid"} onClick={() => changeTab("unpaid")}>
                  Att betala <Badge>{summary.unpaid || 0}</Badge>
                </TabButton>

                <TabButton active={tab === "paid"} onClick={() => changeTab("paid")}>
                  Betalda <Badge>{summary.paid || 0}</Badge>
                </TabButton>

                <TabButton active={tab === "all"} onClick={() => changeTab("all")}>
                  Alla <Badge>{summary.total || 0}</Badge>
                </TabButton>
              </div>

              <div className="border-t border-slate-200 p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]">
                  <Field label="Sök" value={q} onChange={setQ} placeholder="Sök leverantör, fakturanummer, OCR..." />

                  <SelectField
                    label="Status"
                    value={status}
                    onChange={setStatus}
                    options={[
                      ["", "Alla statusar"],
                      ["received", "Mottagen"],
                      ["approved", "Godkänd"],
                      ["unpaid", "Obetald"],
                      ["overdue", "Förfallen"],
                      ["paid", "Betald"],
                    ]}
                  />

                  <SelectField
                    label="Fakturatyp"
                    value={origin}
                    onChange={setOrigin}
                    options={[
                      ["", "Alla typer"],
                      ["current", "Aktuell/ny"],
                      ["historical", "Gammal faktura"],
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

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <span className="text-slate-500">Att betala</span>
                    <div className="text-lg font-bold text-[#194C66]">{fmtMoney(summary.unpaidAmount)}</div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <span className="text-slate-500">Betalt</span>
                    <div className="text-lg font-bold text-[#194C66]">{fmtMoney(summary.paidAmount)}</div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <span className="text-slate-500">Totalt</span>
                    <div className="text-lg font-bold text-[#194C66]">{fmtMoney(summary.totalAmount)}</div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1320px] w-full border-collapse text-left text-sm">
                  <thead className="bg-white text-slate-900">
                    <tr className="border-b border-slate-200">
                      <Th>Leverantör</Th>
                      <Th>Typ</Th>
                      <Th>Fakt.nr</Th>
                      <Th>OCR</Th>
                      <Th>Kategori</Th>
                      <Th>Fakturadatum</Th>
                      <Th>Förfallodatum</Th>
                      <Th>Status</Th>
                      <Th>Koppling</Th>
                      <Th className="text-right">Obetalt</Th>
                      <Th className="text-right">Total</Th>
                      <Th>Åtgärd</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                          Laddar leverantörsfakturor...
                        </td>
                      </tr>
                    ) : supplierInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                          Inga leverantörsfakturor hittades.
                        </td>
                      </tr>
                    ) : (
                      supplierInvoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          onClick={() => {
                            window.location.href = "/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(invoice.id);
                          }}
                          className="cursor-pointer align-top transition hover:bg-slate-50"
                        >
                          <Td>
                            <div className="font-bold text-[#194C66]">{invoice.supplier_name}</div>
                            <div className="mt-1 text-xs text-slate-500">{invoice.supplier_org_number || ""}</div>
                          </Td>
                          <Td>{invoice.supplier_type === "partner" ? "Samarbetspartner" : "Leverantör"}</Td>
                          <Td className="font-semibold">{invoice.supplier_invoice_number}</Td>
                          <Td>{invoice.ocr_number || "—"}</Td>
                          <Td>{invoice.category || "—"}</Td>
                          <Td>{fmtDate(invoice.invoice_date)}</Td>
                          <Td>{fmtDate(invoice.due_date)}</Td>
                          <Td>{statusLabel(invoice.status)}</Td>
                          <Td>{invoice.linked_order_reference || "—"}</Td>
                          <Td className="text-right font-semibold">{fmtMoney(invoice.unpaid_amount)}</Td>
                          <Td className="text-right font-bold">{fmtMoney(invoice.total_amount)}</Td>
                          <Td>
                            {invoice.status !== "paid" && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  markInvoicePaid(invoice);
                                }}
                                className="mr-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Markera betald
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteInvoice(invoice);
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Arkivera
                            </button>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-5 py-4 text-right text-sm text-slate-600">
                {supplierInvoices.length} poster visas
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

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
