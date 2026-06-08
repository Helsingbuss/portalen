import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Transaction = Record<string, any>;
type BankAccount = Record<string, any>;
type VatRate = Record<string, any>;

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  transaction_type: "income",
  transaction_date: today,
  title: "",
  description: "",
  category: "",
  customer_supplier_name: "",
  gross_amount: "0",
  vat_percent: "25",
  amount_includes_vat: true,
  payment_method: "bank_transfer",
  bank_account_id: "",
  reference: "",
  accounting_account: "",
  vat_account: "",
  status: "booked",
  notes: "",
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10";

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

function typeLabel(value?: string | null) {
  return value === "expense" ? "Utgift" : "Intäkt";
}

function typeClass(value?: string | null) {
  return value === "expense"
    ? "bg-red-100 text-red-700"
    : "bg-emerald-100 text-emerald-700";
}

function paymentLabel(value?: string | null) {
  switch (value) {
    case "bankgiro":
      return "Bankgiro";
    case "swish":
      return "Swish";
    case "card":
      return "Kort";
    case "cash":
      return "Kontant";
    case "bank_transfer":
      return "Banköverföring";
    default:
      return "Annat";
  }
}

function statusLabel(value?: string | null) {
  switch (value) {
    case "draft":
      return "Utkast";
    case "booked":
      return "Bokförd";
    case "paid":
      return "Betald";
    case "reconciled":
      return "Avstämd";
    default:
      return value || "Status";
  }
}

function accountName(accounts: BankAccount[], id?: string | null) {
  const account = accounts.find((row) => row.id === id);

  if (!account) return "—";

  return account.account_label || account.bank_name || "Bankkonto";
}

export default function EkonomiIntakterUtgifterPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 0,
    incomeGross: 0,
    expenseGross: 0,
    resultNet: 0,
    vatToPay: 0,
  });

  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sortedVatRates = useMemo(
    () =>
      [...vatRates]
        .filter((rate) => rate.is_active !== false)
        .sort((a, b) => Number(a.display_order || 100) - Number(b.display_order || 100)),
    [vatRates]
  );

  function updateField(key: string, value: any) {
    setForm((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
    setShowForm(false);
  }

  function editTransaction(row: Transaction) {
    setEditingId(row.id);
    setForm({
      ...emptyForm,
      ...row,
      gross_amount: String(row.gross_amount ?? "0"),
      vat_percent: String(row.vat_percent ?? "0"),
      amount_includes_vat: row.amount_includes_vat !== false,
    });
    setShowForm(true);
  }

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (bankAccountId) params.set("bank_account_id", bankAccountId);

      const res = await fetch("/api/admin/ekonomi/intakter-utgifter?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta intäkter och utgifter.");
      }

      setTransactions(json.transactions || []);
      setAccounts(json.accounts || []);
      setVatRates(json.vatRates || []);
      setSummary(json.summary || {});
      setNeedsSetup(Boolean(json.needsSetup));

      if (!form.bank_account_id && json.accounts?.[0]?.id) {
        setForm((prev: any) => ({
          ...prev,
          bank_account_id: json.accounts[0].id,
        }));
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta intäkter och utgifter.");
    } finally {
      setLoading(false);
    }
  }

  async function saveTransaction(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const url = editingId
        ? "/api/admin/ekonomi/intakter-utgifter/" + encodeURIComponent(editingId)
        : "/api/admin/ekonomi/intakter-utgifter";

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara transaktionen.");
      }

      setMessage(editingId ? "Transaktionen uppdaterades." : "Transaktionen skapades.");
      resetForm();
      await loadTransactions();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara transaktionen.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveTransaction(row: Transaction) {
    const ok = window.confirm("Vill du arkivera " + (row.title || "transaktionen") + "?");

    if (!ok) return;

    try {
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/intakter-utgifter/" + encodeURIComponent(row.id), {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte arkivera transaktionen.");
      }

      setMessage("Transaktionen arkiverades.");
      await loadTransactions();
    } catch (err: any) {
      setError(err?.message || "Kunde inte arkivera transaktionen.");
    }
  }

  useEffect(() => {
    loadTransactions();
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
                  Intäkter & utgifter
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Registrera inkomster, kostnader, moms, betalningssätt och bankkonto. Detta blir grunden för faktura, kvitto, moms och bokföring.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadTransactions}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingId("");
                    setForm(emptyForm);
                    setShowForm(true);
                  }}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  Ny post
                </button>
              </div>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellen <strong>finance_transactions</strong> saknas. Kör SQL-koden för Intäkter & utgifter först.
              </section>
            )}

            {(message || error) && (
              <section
                className={
                  "rounded-2xl border p-5 text-sm font-semibold shadow-sm " +
                  (error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700")
                }
              >
                {error || message}
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Intäkter" value={fmtMoney(summary.incomeGross)} tone="green" />
              <SummaryCard label="Utgifter" value={fmtMoney(summary.expenseGross)} tone="red" />
              <SummaryCard label="Resultat netto" value={fmtMoney(summary.resultNet)} tone="blue" />
              <SummaryCard label="Moms att betala" value={fmtMoney(summary.vatToPay)} tone="amber" />
              <SummaryCard label="Poster" value={summary.total || 0} tone="slate" />
            </div>

            {showForm && (
              <form onSubmit={saveTransaction} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    {editingId ? "Redigera post" : "Ny intäkt/utgift"}
                  </h2>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Stäng
                  </button>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                  <SelectField
                    label="Typ"
                    value={form.transaction_type}
                    onChange={(value) => updateField("transaction_type", value)}
                    options={[
                      ["income", "Intäkt"],
                      ["expense", "Utgift"],
                    ]}
                  />

                  <Field label="Datum" type="date" value={form.transaction_date} onChange={(value) => updateField("transaction_date", value)} />
                  <Field label="Titel" value={form.title} onChange={(value) => updateField("title", value)} />
                  <Field label="Kund / leverantör" value={form.customer_supplier_name} onChange={(value) => updateField("customer_supplier_name", value)} />
                  <Field label="Kategori" value={form.category} onChange={(value) => updateField("category", value)} />
                  <Field label="Belopp" value={form.gross_amount} onChange={(value) => updateField("gross_amount", value)} />

                  <SelectField
                    label="Moms"
                    value={String(form.vat_percent)}
                    onChange={(value) => updateField("vat_percent", value)}
                    options={[
                      ...sortedVatRates.map((rate) => [
                        String(rate.vat_percent),
                        (rate.label || "Moms") + " · " + String(rate.sales_account || "konto saknas"),
                      ] as [string, string]),
                      ["0", "0 % / momsfritt"],
                    ]}
                  />

                  <SelectField
                    label="Belopp innehåller moms"
                    value={form.amount_includes_vat ? "true" : "false"}
                    onChange={(value) => updateField("amount_includes_vat", value === "true")}
                    options={[
                      ["true", "Ja"],
                      ["false", "Nej"],
                    ]}
                  />

                  <SelectField
                    label="Betalningssätt"
                    value={form.payment_method}
                    onChange={(value) => updateField("payment_method", value)}
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
                    value={form.bank_account_id || ""}
                    onChange={(value) => updateField("bank_account_id", value)}
                    options={[
                      ["", "Välj konto"],
                      ...accounts.map((account) => [
                        account.id,
                        account.account_label || account.bank_name || "Bankkonto",
                      ] as [string, string]),
                    ]}
                  />

                  <Field label="Referens / OCR / fakturanr" value={form.reference} onChange={(value) => updateField("reference", value)} />
                  <Field label="Bokföringskonto" value={form.accounting_account} onChange={(value) => updateField("accounting_account", value)} />
                  <Field label="Momskonto" value={form.vat_account} onChange={(value) => updateField("vat_account", value)} />

                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(value) => updateField("status", value)}
                    options={[
                      ["draft", "Utkast"],
                      ["booked", "Bokförd"],
                      ["paid", "Betald"],
                      ["reconciled", "Avstämd"],
                    ]}
                  />
                </div>

                <Textarea label="Beskrivning" value={form.description} onChange={(value) => updateField("description", value)} />
                <Textarea label="Anteckning" value={form.notes} onChange={(value) => updateField("notes", value)} />

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Avbryt
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara post"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_160px_180px_220px_140px]">
                <Field label="Sök" value={q} onChange={setQ} placeholder="Sök titel, kund, kategori..." />

                <SelectField
                  label="Typ"
                  value={type}
                  onChange={setType}
                  options={[
                    ["", "Alla"],
                    ["income", "Intäkt"],
                    ["expense", "Utgift"],
                  ]}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["draft", "Utkast"],
                    ["booked", "Bokförd"],
                    ["paid", "Betald"],
                    ["reconciled", "Avstämd"],
                  ]}
                />

                <SelectField
                  label="Bankkonto"
                  value={bankAccountId}
                  onChange={setBankAccountId}
                  options={[
                    ["", "Alla"],
                    ...accounts.map((account) => [
                      account.id,
                      account.account_label || account.bank_name || "Bankkonto",
                    ] as [string, string]),
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadTransactions}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-[#194C66]">
                  Intäkter och utgifter
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Visar {transactions.length} poster.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1320px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Datum</Th>
                      <Th>Typ</Th>
                      <Th>Titel</Th>
                      <Th>Kund/leverantör</Th>
                      <Th>Kategori</Th>
                      <Th>Belopp</Th>
                      <Th>Moms</Th>
                      <Th>Netto</Th>
                      <Th>Betalning</Th>
                      <Th>Bankkonto</Th>
                      <Th>Status</Th>
                      <Th>Åtgärd</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-8 text-center text-slate-500">
                          Laddar poster...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                          Inga poster hittades.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((row) => (
                        <tr key={row.id} className="align-top transition hover:bg-slate-50">
                          <Td>{fmtDate(row.transaction_date)}</Td>
                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + typeClass(row.transaction_type)}>
                              {typeLabel(row.transaction_type)}
                            </span>
                          </Td>
                          <Td>
                            <div className="font-bold text-[#194C66]">{row.title}</div>
                            <div className="mt-1 text-xs text-slate-500">{row.reference || "—"}</div>
                          </Td>
                          <Td>{row.customer_supplier_name || "—"}</Td>
                          <Td>{row.category || "—"}</Td>
                          <Td>
                            <strong>{fmtMoney(row.gross_amount)}</strong>
                          </Td>
                          <Td>{fmtMoney(row.vat_amount)} ({row.vat_percent || 0} %)</Td>
                          <Td>{fmtMoney(row.net_amount)}</Td>
                          <Td>{paymentLabel(row.payment_method)}</Td>
                          <Td>{accountName(accounts, row.bank_account_id)}</Td>
                          <Td>{statusLabel(row.status)}</Td>
                          <Td>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => editTransaction(row)}
                                className="rounded-lg bg-[#194C66] px-3 py-2 text-xs font-semibold text-white"
                              >
                                Redigera
                              </button>

                              <button
                                type="button"
                                onClick={() => archiveTransaction(row)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                              >
                                Arkivera
                              </button>
                            </div>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
  tone: "green" | "red" | "blue" | "amber" | "slate";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "red"
        ? "text-red-700 bg-red-50"
        : tone === "blue"
          ? "text-blue-700 bg-blue-50"
          : tone === "amber"
            ? "text-amber-700 bg-amber-50"
            : "text-slate-700 bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 truncate text-2xl font-bold">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={fieldClass}
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
        className={fieldClass}
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

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
