import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Article = Record<string, any>;
type BankAccount = Record<string, any>;

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  invoice_number: "",
  ocr_number: "",
  customer_name: "",
  customer_number: "",
  customer_email: "",
  customer_address: "",
  customer_zip: "",
  customer_city: "",
  customer_country: "Sverige",
  invoice_date: today,
  due_date: today,
  paid_date: today,
  payment_method: "bank_transfer",
  bank_account_id: "",
  payment_reference: "",
  your_reference: "",
  our_reference: "Andreas Ekelöf",
  order_reference: "",
  category: "Normal",
  notes: "Historisk faktura. Redan betald.",
};

const emptyLine = {
  article_id: "",
  article_number: "",
  description: "Hyra av buss inkl. förare",
  extra_description: "",
  quantity: "1",
  unit: "st",
  unit_price_excl_vat: "0",
  discount_percent: "0",
  vat_percent: "6",
  vat_account: "2631",
  sales_account: "2631",
};

function n(value: any) {
  return Number(String(value || "0").replace(",", ".")) || 0;
}

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function lineTotal(line: any) {
  const quantity = n(line.quantity);
  const unitPrice = n(line.unit_price_excl_vat);
  const discount = n(line.discount_percent);
  const vatPercent = n(line.vat_percent);

  const beforeDiscount = quantity * unitPrice;
  const discountAmount = beforeDiscount * discount / 100;
  const excl = beforeDiscount - discountAmount;
  const vat = excl * vatPercent / 100;
  const incl = excl + vat;

  return { excl, vat, incl };
}

export default function GammalBetaldFakturaPage() {
  const [form, setForm] = useState<any>(emptyForm);
  const [lines, setLines] = useState<any[]>([{ ...emptyLine }]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const excl = lines.reduce((sum, line) => sum + lineTotal(line).excl, 0);
    const vat = lines.reduce((sum, line) => sum + lineTotal(line).vat, 0);
    const beforeRound = excl + vat;
    const incl = Math.round(beforeRound);
    const rounding = incl - beforeRound;

    return { excl, vat, beforeRound, rounding, incl };
  }, [lines]);

  function updateForm(key: string, value: any) {
    setForm((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateLine(index: number, key: string, value: any) {
    setLines((prev) =>
      prev.map((line, rowIndex) => {
        if (rowIndex !== index) return line;

        return {
          ...line,
          [key]: value,
        };
      })
    );
  }

  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function applyArticle(index: number, articleId: string) {
    const article = articles.find((item) => item.id === articleId);

    if (!article) {
      updateLine(index, "article_id", "");
      return;
    }

    setLines((prev) =>
      prev.map((line, rowIndex) => {
        if (rowIndex !== index) return line;

        return {
          ...line,
          article_id: article.id,
          article_number: article.article_number || "",
          description: article.article_name || "",
          unit: article.unit || "st",
          unit_price_excl_vat: String(article.price_excl_vat ?? "0"),
          vat_percent: String(article.vat_percent ?? "0"),
          vat_account: article.vat_account || "",
          sales_account: article.sales_account || "",
        };
      })
    );
  }

  async function loadMeta() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/fakturor?tab=all");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta grunddata.");
      }

      setArticles(json.articles || []);
      setAccounts(json.accounts || []);

      if (json.accounts?.[0]?.id) {
        setForm((prev: any) => ({
          ...prev,
          bank_account_id: prev.bank_account_id || json.accounts[0].id,
        }));
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta grunddata.");
    } finally {
      setLoading(false);
    }
  }

  async function saveHistoricalInvoice(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!form.invoice_number) {
        throw new Error("Fakturanummer saknas.");
      }

      if (!form.ocr_number) {
        throw new Error("OCR saknas.");
      }

      if (!form.customer_name) {
        throw new Error("Kundnamn saknas.");
      }

      const cleanLines = lines.filter((line) => String(line.description || "").trim());

      if (cleanLines.length === 0) {
        throw new Error("Minst en fakturarad behövs.");
      }

      const createRes = await fetch("/api/admin/ekonomi/fakturor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          status: "paid",
          paid_amount: totals.incl,
          lines: cleanLines,
        }),
      });

      const createJson = await createRes.json().catch(() => ({}));

      if (!createRes.ok || !createJson.ok) {
        throw new Error(createJson.error || "Kunde inte skapa historisk faktura.");
      }

      const invoiceId = createJson.invoice?.id;

      if (!invoiceId) {
        throw new Error("Fakturan skapades men ID saknas.");
      }

      const paidRes = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(invoiceId) + "/mark-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paid_date: form.paid_date,
          payment_method: form.payment_method,
          bank_account_id: form.bank_account_id,
          payment_reference: form.payment_reference || form.ocr_number,
        }),
      });

      const paidJson = await paidRes.json().catch(() => ({}));

      if (!paidRes.ok || !paidJson.ok) {
        throw new Error(paidJson.error || "Fakturan skapades men kunde inte markeras som betald.");
      }

      setMessage("Historisk betald faktura skapades.");
      window.location.href = "/admin/ekonomi/fakturor/" + encodeURIComponent(invoiceId);
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa historisk faktura.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveHistoricalInvoice} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Lägg in gammal betald faktura
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Använd detta för gamla fakturor som redan är betalda. Du kan lägga flera rader på samma faktura.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/ekonomi/fakturor"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Avbryt
                </Link>

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara som betald"}
                </button>
              </div>
            </div>

            {(message || error) && (
              <section className={"rounded-2xl border p-5 text-sm font-semibold shadow-sm " + (error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                {error || message}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Faktura</h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <Field label="Fakturanummer" value={form.invoice_number} onChange={(value) => updateForm("invoice_number", value)} />
                <Field label="OCR" value={form.ocr_number} onChange={(value) => updateForm("ocr_number", value)} />
                <Field label="Fakturadatum" type="date" value={form.invoice_date} onChange={(value) => updateForm("invoice_date", value)} />
                <Field label="Förfallodatum" type="date" value={form.due_date} onChange={(value) => updateForm("due_date", value)} />
                <Field label="Betaldatum" type="date" value={form.paid_date} onChange={(value) => updateForm("paid_date", value)} />
                <Field label="Kundnamn" value={form.customer_name} onChange={(value) => updateForm("customer_name", value)} />
                <Field label="Kundnr" value={form.customer_number} onChange={(value) => updateForm("customer_number", value)} />
                <Field label="Kundens e-post" value={form.customer_email} onChange={(value) => updateForm("customer_email", value)} />
                <Field label="Adress" value={form.customer_address} onChange={(value) => updateForm("customer_address", value)} />
                <Field label="Postnummer" value={form.customer_zip} onChange={(value) => updateForm("customer_zip", value)} />
                <Field label="Ort" value={form.customer_city} onChange={(value) => updateForm("customer_city", value)} />
                <Field label="Orderreferens" value={form.order_reference} onChange={(value) => updateForm("order_reference", value)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Betalning</h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <SelectField
                  label="Betalningssätt"
                  value={form.payment_method}
                  onChange={(value) => updateForm("payment_method", value)}
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
                  value={form.bank_account_id}
                  onChange={(value) => updateForm("bank_account_id", value)}
                  options={[
                    ["", "Välj konto"],
                    ...accounts.map((account) => [
                      account.id,
                      account.account_label || account.bank_name || "Bankkonto",
                    ] as [string, string]),
                  ]}
                />

                <Field label="Betalningsreferens" value={form.payment_reference} onChange={(value) => updateForm("payment_reference", value)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">Fakturarader</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Lägg till en eller flera rader från den gamla fakturan.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                >
                  Lägg till rad
                </button>
              </div>

              <div className="mt-5 space-y-5">
                {lines.map((line, index) => {
                  const rowTotal = lineTotal(line);

                  return (
                    <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-[#194C66]">Rad {index + 1}</h3>

                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Ta bort rad
                          </button>
                        )}
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-4">
                        <SelectField
                          label="Artikel"
                          value={line.article_id}
                          onChange={(value) => applyArticle(index, value)}
                          options={[
                            ["", "Välj artikel"],
                            ...articles.map((article) => [
                              article.id,
                              (article.article_number || "") + " " + article.article_name,
                            ] as [string, string]),
                          ]}
                        />

                        <Field label="Beskrivning" value={line.description} onChange={(value) => updateLine(index, "description", value)} />
                        <Field label="Antal" value={line.quantity} onChange={(value) => updateLine(index, "quantity", value)} />
                        <Field label="Enhet" value={line.unit} onChange={(value) => updateLine(index, "unit", value)} />
                        <Field label="Pris exkl. moms" value={line.unit_price_excl_vat} onChange={(value) => updateLine(index, "unit_price_excl_vat", value)} />
                        <Field label="Rabatt %" value={line.discount_percent} onChange={(value) => updateLine(index, "discount_percent", value)} />
                        <Field label="Moms %" value={line.vat_percent} onChange={(value) => updateLine(index, "vat_percent", value)} />
                        <Field label="Momskonto" value={line.vat_account} onChange={(value) => updateLine(index, "vat_account", value)} />
                      </div>

                      <Textarea label="Extra beskrivning" value={line.extra_description} onChange={(value) => updateLine(index, "extra_description", value)} />

                      <div className="mt-4 rounded-xl bg-white p-4 text-sm">
                        <strong>Radtotal:</strong> Exkl. moms {fmtMoney(rowTotal.excl)} · Moms {fmtMoney(rowTotal.vat)} · Totalt {fmtMoney(rowTotal.incl)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl bg-[#194C66] p-5 text-white">
                <div className="grid gap-3 text-sm md:grid-cols-4">
                  <div>
                    <div className="opacity-80">Exkl. moms</div>
                    <div className="text-xl font-bold">{fmtMoney(totals.excl)}</div>
                  </div>

                  <div>
                    <div className="opacity-80">Moms</div>
                    <div className="text-xl font-bold">{fmtMoney(totals.vat)}</div>
                  </div>

                  <div>
                    <div className="opacity-80">Avrundning</div>
                    <div className="text-xl font-bold">{fmtMoney(totals.rounding)}</div>
                  </div>

                  <div>
                    <div className="opacity-80">Att betala</div>
                    <div className="text-2xl font-black">{fmtMoney(totals.incl)}</div>
                  </div>
                </div>
              </div>
            </section>
          </form>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
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
