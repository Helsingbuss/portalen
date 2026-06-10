import CustomerRegisterPicker from "@/components/ekonomi/CustomerRegisterPicker";
import InvoiceResultBox from "@/components/ekonomi/InvoiceResultBox";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Article = Record<string, any>;
type InvoiceLine = Record<string, any>;

const today = new Date().toISOString().slice(0, 10);

const emptyInvoice = {
  customer_name: "",
  customer_number: "",
  customer_email: "",
  customer_address: "",
  customer_zip: "",
  customer_city: "",
  customer_country: "Sverige",
  invoice_date: today,
  due_date: "",
  payment_terms_days: 10,
  your_reference: "",
  our_reference: "Andreas Ekelöf",
  order_reference: "",
  invoice_type: "debit",
  category: "Normal",
  status: "draft",
  currency: "SEK",
  payment_text: "",
  notes: "Vi ser gärna betalningen sker omgående",
  internal_notes: "",
  paid_amount: 0,
};

const emptyLine = {
  article_id: "",
  article_number: "",
  description: "",
  extra_description: "",
  quantity: "1",
  unit: "st",
  unit_price_excl_vat: "0",
  discount_percent: "0",
  vat_percent: "25",
  vat_account: "",
  sales_account: "",
};

function n(value: any) {
  return Number(String(value || "0").replace(",", ".")) || 0;
}

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
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

  return {
    excl,
    vat,
    incl,
  };
}

export default function EkonomiFakturaDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");
  const isNew = id === "ny";

  const [invoice, setInvoice] = useState<any>(emptyInvoice);
  const [lines, setLines] = useState<InvoiceLine[]>([{ ...emptyLine }]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [paymentText, setPaymentText] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + lineTotal(line).excl, 0);
    const vat = lines.reduce((sum, line) => sum + lineTotal(line).vat, 0);
    const totalBeforeRound = subtotal + vat;
    const total = Math.round(totalBeforeRound);
    const rounding = total - totalBeforeRound;

    return {
      subtotal,
      vat,
      total,
      rounding,
    };
  }, [lines]);

  function updateInvoice(key: string, value: any) {
    setInvoice((prev: any) => ({
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

  function applyArticle(index: number, articleId: string) {
    const article = articles.find((item) => item.id === articleId);

    setLines((prev) =>
      prev.map((line, rowIndex) => {
        if (rowIndex !== index) return line;

        if (!article) {
          return {
            ...line,
            article_id: "",
          };
        }

        return {
          ...line,
          article_id: article.id,
          article_number: article.article_number || "",
          description: article.article_name || "",
          quantity: line.quantity || "1",
          unit: article.unit || "st",
          unit_price_excl_vat: String(article.price_excl_vat ?? "0"),
          vat_percent: String(article.vat_percent ?? "0"),
          vat_account: article.vat_account || "",
          sales_account: article.sales_account || "",
        };
      })
    );
  }

  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  }

  async function loadInvoice() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      if (isNew) {
        const res = await fetch("/api/admin/ekonomi/fakturor?tab=all");
        const json = await res.json().catch(() => ({}));

        if (res.ok && json.ok) {
          setArticles(json.articles || []);
          setPaymentText(json.paymentText || "");
          setInvoice({
            ...emptyInvoice,
            payment_text: json.paymentText || "",
          });
        }

        return;
      }

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta faktura.");
      }

      setInvoice({
        ...emptyInvoice,
        ...(json.invoice || {}),
      });
      setLines(json.lines?.length ? json.lines : [{ ...emptyLine }]);
      setArticles(json.articles || []);
      setPaymentText(json.paymentText || "");
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta faktura.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteInvoice() {
    if (isNew || !id) return;

    const ok = window.confirm(
      "Vill du ta bort den här fakturan?\n\nFakturan arkiveras och försvinner från listan, men raderas inte permanent."
    );

    if (!ok) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(id), {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte ta bort fakturan.");
      }

      router.push("/admin/ekonomi/fakturor");
    } catch (err: any) {
      setError(err?.message || "Kunde inte ta bort fakturan.");
    } finally {
      setSaving(false);
    }
  }

  async function markInvoicePaid() {
    if (isNew || !id) return;

    const paidDate = window.prompt("Ange betaldatum (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));

    if (!paidDate) return;

    const ok = window.confirm("Vill du markera fakturan som betald? En intäkt skapas automatiskt.");

    if (!ok) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(id) + "/mark-paid", {
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
        throw new Error(json.error || "Kunde inte markera fakturan som betald.");
      }

      setMessage("Fakturan markerades som betald.");
      await loadInvoice();
    } catch (err: any) {
      setError(err?.message || "Kunde inte markera fakturan som betald.");
    } finally {
      setSaving(false);
    }
  }

  async function sendInvoiceEmail() {
    if (isNew || !id) return;

    if (!invoice.approved_for_sending_at) {
      setError("Fakturan måste förhandsgranskas och godkännas innan den kan skickas.");
      return;
    }

    if (!invoice.customer_email) {
      setError("Kundens e-post saknas.");
      return;
    }

    const ok = window.confirm(
      "Vill du skicka fakturan till " + invoice.customer_email + "?"
    );

    if (!ok) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(id) + "/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: invoice.customer_email,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skicka fakturan.");
      }

      setMessage("Fakturan skickades till " + invoice.customer_email + ".");
      await loadInvoice();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skicka fakturan.");
    } finally {
      setSaving(false);
    }
  }

  async function saveInvoice(event: FormEvent, nextStatus?: string) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        ...invoice,
        status: nextStatus || invoice.status,
        lines,
      };

      const res = await fetch(isNew ? "/api/admin/ekonomi/fakturor" : "/api/admin/ekonomi/fakturor/" + encodeURIComponent(id), {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara faktura.");
      }

      setMessage("Fakturan sparades.");

      if (isNew && json.invoice?.id) {
        router.replace("/admin/ekonomi/fakturor/" + encodeURIComponent(json.invoice.id));
      } else {
        await loadInvoice();
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara faktura.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={(event) => saveInvoice(event)} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {isNew ? "Ny kundfaktura" : "Kundfaktura " + (invoice.invoice_number || "")}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Välj kund, fyll i referenser och lägg till artiklar/rader. Moms och total räknas automatiskt.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/ekonomi/fakturor"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Avbryt
                </Link>

                {!isNew && (
                  <button
                    type="button"
                    onClick={deleteInvoice}
                    disabled={saving || loading}
                    className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-60"
                  >
                    Ta bort faktura
                  </button>
                )}

                {!isNew && (
                  <a
                    href={"/api/admin/ekonomi/fakturor/" + encodeURIComponent(id) + "/pdf"}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Öppna PDF
                  </a>
                )}

                {!isNew && (
                  <Link
                    href={"/admin/ekonomi/fakturor/" + encodeURIComponent(id) + "/preview"}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Förhandsgranska
                  </Link>
                )}

                {!isNew && invoice.status !== "paid" && (
                  <button
                    type="button"
                    onClick={markInvoicePaid}
                    disabled={saving || loading}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Markera betald
                  </button>
                )}

                {!isNew && (
                  <button
                    type="button"
                    onClick={sendInvoiceEmail}
                    disabled={saving || loading || !invoice.approved_for_sending_at}
                    title={!invoice.approved_for_sending_at ? "Förhandsgranska och godkänn fakturan först" : "Skicka faktura via e-post"}
                    className={
                      "rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition disabled:opacity-60 " +
                      (invoice.approved_for_sending_at
                        ? "bg-[#194C66] text-white hover:bg-[#0f3548]"
                        : "border border-slate-200 bg-slate-100 text-slate-500")
                    }
                  >
                    Skicka faktura
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara"}
                </button>

                <button
                  type="button"
                  onClick={(event) => saveInvoice(event as any, "unpaid")}
                  disabled={saving || loading}
                  className="rounded-xl bg-[#194C66] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548] disabled:opacity-60"
                >
                  Spara som obetald
                </button>
              </div>
            </div>

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

            {!isNew && id && (
              <InvoiceResultBox invoiceId={id} />
            )}

            <CustomerRegisterPicker invoice={invoice} setInvoice={setInvoice} />

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar faktura...
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Field label="Kund" value={invoice.customer_name} onChange={(value) => updateInvoice("customer_name", value)} />
                    <Field label="Kundnr" value={invoice.customer_number} onChange={(value) => updateInvoice("customer_number", value)} />
                    <Field label="E-post" value={invoice.customer_email} onChange={(value) => updateInvoice("customer_email", value)} />

                    <Field label="Fakturadatum" type="date" value={invoice.invoice_date} onChange={(value) => updateInvoice("invoice_date", value)} />
                    <Field label="Förfallodatum" type="date" value={invoice.due_date} onChange={(value) => updateInvoice("due_date", value)} />
                    <Field label="Betalningsvillkor dagar" value={invoice.payment_terms_days} onChange={(value) => updateInvoice("payment_terms_days", value)} />
                    <Field label="OCR" value={invoice.ocr_number} onChange={(value) => updateInvoice("ocr_number", value)} />

                    <Field label="Er referens" value={invoice.your_reference} onChange={(value) => updateInvoice("your_reference", value)} />
                    <Field label="Vår referens" value={invoice.our_reference} onChange={(value) => updateInvoice("our_reference", value)} />
                    <Field label="Er orderreferens" value={invoice.order_reference} onChange={(value) => updateInvoice("order_reference", value)} />

                    <SelectField
                      label="Kategori"
                      value={invoice.category || "Normal"}
                      onChange={(value) => updateInvoice("category", value)}
                      options={[
                        ["Normal", "Normal"],
                        ["Bussresa", "Bussresa"],
                        ["Sundra", "Sundra"],
                        ["Flygbuss", "Flygbuss"],
                      ]}
                    />

                    {!isNew && invoice.sent_at && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        Skickad till {invoice.sent_to_email || invoice.customer_email} {new Date(invoice.sent_at).toLocaleString("sv-SE")}
                      </div>
                    )}

                    <SelectField
                      label="Status"
                      value={invoice.status || "draft"}
                      onChange={(value) => updateInvoice("status", value)}
                      options={[
                        ["draft", "Utkast"],
                        ["sent", "Skickad"],
                        ["unpaid", "Obetald"],
                        ["overdue", "Förfallen"],
                        ["paid", "Betald"],
                        ["credited", "Krediterad"],
                      ]}
                    />
                  </div>

                  <Textarea label="Kundadress" value={invoice.customer_address} onChange={(value) => updateInvoice("customer_address", value)} />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Fakturarader</h2>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-[1220px] w-full border-collapse text-left text-sm">
                      <thead className="bg-white text-slate-900">
                        <tr className="border-b border-slate-200">
                          <Th>Artikel</Th>
                          <Th>Benämning</Th>
                          <Th>Antal</Th>
                          <Th>Enhet</Th>
                          <Th>Á-pris</Th>
                          <Th>Rabatt</Th>
                          <Th>Moms</Th>
                          <Th>Summa</Th>
                          <Th></Th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {lines.map((line, index) => {
                          const total = lineTotal(line);

                          return (
                            <tr key={index} className="align-top">
                              <Td>
                                <select
                                  value={line.article_id || ""}
                                  onChange={(event) => applyArticle(index, event.target.value)}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                >
                                  <option value="">Välj artikel</option>
                                  {articles.map((article) => (
                                    <option key={article.id} value={article.id}>
                                      {(article.article_number || "") + " " + article.article_name}
                                    </option>
                                  ))}
                                </select>
                              </Td>

                              <Td>
                                <input
                                  value={line.description || ""}
                                  onChange={(event) => updateLine(index, "description", event.target.value)}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />

                                <textarea
                                  value={line.extra_description || ""}
                                  onChange={(event) => updateLine(index, "extra_description", event.target.value)}
                                  placeholder="Extra beskrivning, t.ex. bussresa, tid, från/till..."
                                  rows={3}
                                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                              </Td>

                              <Td>
                                <input
                                  value={line.quantity}
                                  onChange={(event) => updateLine(index, "quantity", event.target.value)}
                                  className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                              </Td>

                              <Td>
                                <input
                                  value={line.unit}
                                  onChange={(event) => updateLine(index, "unit", event.target.value)}
                                  className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                              </Td>

                              <Td>
                                <input
                                  value={line.unit_price_excl_vat}
                                  onChange={(event) => updateLine(index, "unit_price_excl_vat", event.target.value)}
                                  className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm text-right"
                                />
                              </Td>

                              <Td>
                                <input
                                  value={line.discount_percent}
                                  onChange={(event) => updateLine(index, "discount_percent", event.target.value)}
                                  className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm text-right"
                                />
                              </Td>

                              <Td>
                                <input
                                  value={line.vat_percent}
                                  onChange={(event) => updateLine(index, "vat_percent", event.target.value)}
                                  className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm text-right"
                                />
                              </Td>

                              <Td className="text-right font-bold">
                                {fmtMoney(total.incl)}
                              </Td>

                              <Td>
                                <button
                                  type="button"
                                  onClick={() => removeLine(index)}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                                >
                                  Ta bort
                                </button>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={addLine}
                    className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Lägg till rad
                  </button>
                </section>

                <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <Textarea label="Meddelande på faktura" value={invoice.notes} onChange={(value) => updateInvoice("notes", value)} />
                    <Textarea label="Betalningstext" value={invoice.payment_text || paymentText} onChange={(value) => updateInvoice("payment_text", value)} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-[#194C66]">Summering</h2>

                    <div className="mt-5 space-y-3 text-sm">
                      <SummaryLine label="Summa" value={fmtMoney(totals.subtotal)} />
                      <SummaryLine label="Moms" value={fmtMoney(totals.vat)} />
                      <SummaryLine label="Öresavrundning" value={fmtMoney(totals.rounding)} />
                      <div className="border-t border-slate-200 pt-3">
                        <SummaryLine label="Totalt" value={fmtMoney(totals.total)} bold />
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </form>
        </main>
      </div>
    </>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (value: string) => void; type?: string }) {
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

function Textarea({ label, value, onChange }: { label: string; value: any; onChange: (value: string) => void }) {
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

function SummaryLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex items-center justify-between " + (bold ? "text-lg font-bold text-[#194C66]" : "text-slate-700")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Th({ children }: { children?: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
