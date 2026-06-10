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

function fmtDateTime(value?: string | null) {
  if (!value) return "Ingen";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function dayText(days?: number | null) {
  if (days === null || days === undefined) return "Saknar datum";
  if (days < 0) return Math.abs(days) + " dagar sen";
  if (days === 0) return "Idag";
  if (days === 1) return "Imorgon";
  return "Om " + days + " dagar";
}

export default function BetalningspaminnelserPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/betalningspaminnelser");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta påminnelser.");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta påminnelser.");
    } finally {
      setLoading(false);
    }
  }

  async function markCustomerReminder(invoice: any) {
    const ok = window.confirm(
      "Vill du markera att en påminnelse har skickats till " + (invoice.name || "kunden") + "?"
    );

    if (!ok) return;

    const includeReminderFee = window.confirm(
      "Vill du ta med påminnelseavgift?\n\nTryck OK för ja, Avbryt för nej."
    );

    const includeLateInterest = window.confirm(
      "Vill du ta med dröjsmålsränta?\n\nTryck OK för ja, Avbryt för nej."
    );

    try {
      setActionLoading(invoice.id);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(invoice.id) + "/mark-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          include_reminder_fee: includeReminderFee,
          include_late_interest: includeLateInterest,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte markera påminnelsen.");
      }

      setMessage("Påminnelse markerades som skickad.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte markera påminnelsen.");
    } finally {
      setActionLoading("");
    }
  }

  async function markCustomerPaid(invoice: any) {
    const paidDate = window.prompt("Ange betaldatum (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));

    if (!paidDate) return;

    try {
      setActionLoading(invoice.id);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(invoice.id) + "/mark-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paid_date: paidDate,
          payment_method: "bank_transfer",
          payment_reference: invoice.ocr_number || invoice.invoice_number,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte markera kundfakturan som betald.");
      }

      setMessage("Kundfakturan markerades som betald.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte markera kundfakturan som betald.");
    } finally {
      setActionLoading("");
    }
  }

  async function markSupplierPaid(invoice: any) {
    const paidDate = window.prompt("Ange betaldatum (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));

    if (!paidDate) return;

    try {
      setActionLoading(invoice.id);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(invoice.id) + "/mark-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paid_date: paidDate,
          payment_method: "bank_transfer",
          payment_reference: invoice.ocr_number || invoice.invoice_number,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte markera leverantörsfakturan som betald.");
      }

      setMessage("Leverantörsfakturan markerades som betald.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte markera leverantörsfakturan som betald.");
    } finally {
      setActionLoading("");
    }
  }

  useEffect(() => {
    loadData();
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
                  Påminnelser & betalstatus
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Håll koll på sena kundfakturor, kommande inbetalningar och leverantörsfakturor som behöver betalas.
                </p>
              </div>

              <button
                type="button"
                onClick={loadData}
                className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
              >
                Uppdatera
              </button>
            </div>

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

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar påminnelser...
              </section>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-4">
                  <SummaryCard label="Förfallna kunder" value={fmtMoney(summary.customerOverdueAmount)} count={summary.customerOverdueCount} tone="red" />
                  <SummaryCard label="Kunder 7 dagar" value={fmtMoney(summary.customerDueSoonAmount)} count={summary.customerDueSoonCount} tone="green" />
                  <SummaryCard label="Förfallna leverantörer" value={fmtMoney(summary.supplierOverdueAmount)} count={summary.supplierOverdueCount} tone="red" />
                  <SummaryCard label="Leverantörer 7 dagar" value={fmtMoney(summary.supplierDueSoonAmount)} count={summary.supplierDueSoonCount} tone="amber" />
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <CustomerList
                    title="Förfallna kundfakturor"
                    items={data?.customerOverdue || []}
                    actionLoading={actionLoading}
                    onReminder={markCustomerReminder}
                    onPaid={markCustomerPaid}
                    empty="Inga förfallna kundfakturor."
                    danger
                  />

                  <SupplierList
                    title="Förfallna leverantörsfakturor"
                    items={data?.supplierOverdue || []}
                    actionLoading={actionLoading}
                    onPaid={markSupplierPaid}
                    empty="Inga förfallna leverantörsfakturor."
                    danger
                  />
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <CustomerList
                    title="Kundfakturor som snart förfaller"
                    items={data?.customerDueSoon || []}
                    actionLoading={actionLoading}
                    onReminder={markCustomerReminder}
                    onPaid={markCustomerPaid}
                    empty="Inga kundfakturor förfaller de kommande 7 dagarna."
                  />

                  <SupplierList
                    title="Leverantörsfakturor att betala snart"
                    items={data?.supplierDueSoon || []}
                    actionLoading={actionLoading}
                    onPaid={markSupplierPaid}
                    empty="Inga leverantörsfakturor förfaller de kommande 7 dagarna."
                  />
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <SimpleList
                    title="Kundfakturor 8–14 dagar"
                    items={data?.customerUpcoming || []}
                    empty="Inga kommande kundfakturor i perioden."
                  />

                  <SimpleList
                    title="Leverantörsfakturor 8–14 dagar"
                    items={data?.supplierUpcoming || []}
                    empty="Inga kommande leverantörsfakturor i perioden."
                    outgoing
                  />
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
  count,
  tone,
}: {
  label: string;
  value: ReactNode;
  count: number;
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
      <div className="mt-1 text-xs font-semibold">{count || 0} st</div>
    </div>
  );
}

function CustomerList({
  title,
  items,
  empty,
  actionLoading,
  onReminder,
  onPaid,
  danger,
}: {
  title: string;
  items: any[];
  empty: string;
  actionLoading: string;
  onReminder: (invoice: any) => void;
  onPaid: (invoice: any) => void;
  danger?: boolean;
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
            <div key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <a href={item.href} className="font-bold text-[#194C66] hover:underline">
                    Faktura {item.invoice_number} · {item.name}
                  </a>

                  <div className="mt-1 text-sm text-slate-500">
                    OCR {item.ocr_number || "—"} · Förfall {fmtDate(item.due_date)} · {dayText(item.days_until_due)}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Påminnelser: {item.reminder_count || 0} · Senast: {fmtDateTime(item.last_reminder_sent_at)}
                  </div>

                  {item.email && (
                    <div className="mt-1 text-xs text-slate-500">
                      E-post: {item.email}
                    </div>
                  )}
                </div>

                <div className={"text-right text-xl font-black " + (danger ? "text-red-700" : "text-emerald-700")}>
                  {fmtMoney(item.amount)}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionLoading === item.id}
                  onClick={() => onReminder(item)}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                >
                  Markera påminnelse skickad
                </button>

                <button
                  type="button"
                  disabled={actionLoading === item.id}
                  onClick={() => onPaid(item)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  Markera betald
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SupplierList({
  title,
  items,
  empty,
  actionLoading,
  onPaid,
  danger,
}: {
  title: string;
  items: any[];
  empty: string;
  actionLoading: string;
  onPaid: (invoice: any) => void;
  danger?: boolean;
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
            <div key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <a href={item.href} className="font-bold text-[#194C66] hover:underline">
                    {item.name} · Fakt.nr {item.invoice_number}
                  </a>

                  <div className="mt-1 text-sm text-slate-500">
                    OCR {item.ocr_number || "—"} · Förfall {fmtDate(item.due_date)} · {dayText(item.days_until_due)}
                  </div>
                </div>

                <div className={"text-right text-xl font-black " + (danger ? "text-red-700" : "text-amber-700")}>
                  {fmtMoney(item.amount)}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionLoading === item.id}
                  onClick={() => onPaid(item)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  Markera betald
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SimpleList({
  title,
  items,
  empty,
  outgoing,
}: {
  title: string;
  items: any[];
  empty: string;
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
            <a key={item.id} href={item.href} className="flex items-start justify-between gap-4 p-5 transition hover:bg-slate-50">
              <div>
                <div className="font-bold text-[#194C66]">{item.name}</div>
                <div className="mt-1 text-sm text-slate-500">
                  Fakt.nr {item.invoice_number || "—"} · Förfall {fmtDate(item.due_date)} · {dayText(item.days_until_due)}
                </div>
              </div>

              <div className={"text-right font-black " + (outgoing ? "text-amber-700" : "text-emerald-700")}>
                {fmtMoney(item.amount)}
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
