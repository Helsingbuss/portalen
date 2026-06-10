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

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AvprickningPage() {
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});

  const [paidDate, setPaidDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [bankAccountId, setBankAccountId] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/avprickning");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta avprickning.");
      }

      setCustomerInvoices(json.customerInvoices || []);
      setSupplierInvoices(json.supplierInvoices || []);
      setAccounts(json.accounts || []);
      setSummary(json.summary || {});

      if (!bankAccountId && json.accounts?.[0]?.id) {
        setBankAccountId(json.accounts[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta avprickning.");
    } finally {
      setLoading(false);
    }
  }

  async function reconcile(item: any) {
    const ok = window.confirm(
      "Vill du pricka av " +
        (item.type === "customer" ? "kundfakturan" : "leverantörsfakturan") +
        " som betald?\n\n" +
        item.name +
        "\nBelopp: " +
        fmtMoney(item.amount_due)
    );

    if (!ok) return;

    const paymentReference = window.prompt(
      "Betalningsreferens / OCR",
      item.ocr_number || item.invoice_number || ""
    );

    try {
      setActionLoading(item.type + "-" + item.id);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/avprickning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: item.type,
          id: item.id,
          paid_date: paidDate,
          payment_method: paymentMethod,
          bank_account_id: bankAccountId,
          payment_reference: paymentReference || item.ocr_number || item.invoice_number,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte pricka av betalningen.");
      }

      setMessage("Betalningen prickades av.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte pricka av betalningen.");
    } finally {
      setActionLoading("");
    }
  }

  useEffect(() => {
    loadData();
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
                  Manuell avprickning
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Bocka av kundfakturor som betalda och leverantörsfakturor som betalda när du ser betalningen på banken.
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

            <section className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Kundfakturor öppna" value={summary.customerCount || 0} sub={fmtMoney(summary.customerAmount)} tone="green" />
              <SummaryCard label="Leverantörer öppna" value={summary.supplierCount || 0} sub={fmtMoney(summary.supplierAmount)} tone="amber" />
              <SummaryCard label="Netto" value={fmtMoney((summary.customerAmount || 0) - (summary.supplierAmount || 0))} sub="Öppet totalt" tone={(summary.customerAmount || 0) - (summary.supplierAmount || 0) >= 0 ? "green" : "red"} />
              <SummaryCard label="Betaldatum" value={paidDate} sub="Valt datum" tone="neutral" />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Avprickningsinställningar</h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <Field label="Betaldatum" type="date" value={paidDate} onChange={setPaidDate} />

                <SelectField
                  label="Betalningssätt"
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={[
                    ["bank_transfer", "Banköverföring"],
                    ["bankgiro", "Bankgiro"],
                    ["swish", "Swish"],
                    ["card", "Kort"],
                    ["cash", "Kontant"],
                    ["other", "Annat"],
                  ]}
                />

                <SelectField
                  label="Bankkonto"
                  value={bankAccountId}
                  onChange={setBankAccountId}
                  options={[
                    ["", "Välj konto"],
                    ...accounts.map((account) => [
                      account.id,
                      account.account_label || account.bank_name || "Bankkonto",
                    ] as [string, string]),
                  ]}
                />
              </div>
            </section>

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar avprickning...
              </section>
            ) : (
              <section className="grid gap-4 lg:grid-cols-2">
                <InvoicePanel
                  title="Inbetalningar från kunder"
                  items={customerInvoices}
                  empty="Inga öppna kundfakturor att pricka av."
                  onReconcile={reconcile}
                  actionLoading={actionLoading}
                  tone="green"
                />

                <InvoicePanel
                  title="Utbetalningar till leverantörer"
                  items={supplierInvoices}
                  empty="Inga öppna leverantörsfakturor att pricka av."
                  onReconcile={reconcile}
                  actionLoading={actionLoading}
                  tone="amber"
                />
              </section>
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
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  tone: "green" | "amber" | "red" | "neutral";
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
      <div className="mt-2 text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-semibold">{sub}</div>
    </div>
  );
}

function InvoicePanel({
  title,
  items,
  empty,
  onReconcile,
  actionLoading,
  tone,
}: {
  title: string;
  items: any[];
  empty: string;
  onReconcile: (item: any) => void;
  actionLoading: string;
  tone: "green" | "amber";
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
            <div key={item.type + "-" + item.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <a href={item.href} className="font-bold text-[#194C66] hover:underline">
                    {item.name}
                  </a>

                  <div className="mt-1 text-sm text-slate-500">
                    Fakt.nr {item.invoice_number || "—"} · OCR {item.ocr_number || "—"}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    Fakturadatum {fmtDate(item.invoice_date)} · Förfall {fmtDate(item.due_date)}
                  </div>
                </div>

                <div className={"text-right text-xl font-black " + (tone === "green" ? "text-emerald-700" : "text-amber-700")}>
                  {fmtMoney(item.amount_due)}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionLoading === item.type + "-" + item.id}
                  onClick={() => onReconcile(item)}
                  className={"rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 " + (tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100")}
                >
                  Pricka av som betald
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
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
        {options.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}
