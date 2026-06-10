import SupplierRegisterPicker from "@/components/ekonomi/SupplierRegisterPicker";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type InvoiceLine = Record<string, any>;
type BankAccount = Record<string, any>;
type CustomerInvoice = Record<string, any>;

const today = new Date().toISOString().slice(0, 10);

const emptyInvoice = {
  invoice_origin: "current",
  supplier_type: "supplier",
  supplier_name: "",
  supplier_org_number: "",
  supplier_email: "",
  supplier_invoice_number: "",
  ocr_number: "",
  invoice_reference: "",
  invoice_date: today,
  due_date: today,
  received_date: today,
  linked_customer_invoice_id: "",
  linked_order_reference: "",
  linked_booking_id: "",
  linked_offer_id: "",
  category: "Leverantörsfaktura",
  status: "received",
  currency: "SEK",
  paid_date: today,
  payment_method: "bank_transfer",
  paid_bank_account_id: "",
  payment_reference: "",
  notes: "",
  internal_notes: "",
  default_cost_account: "4010",
};

const emptyLine = {
  description: "",
  extra_description: "",
  quantity: "1",
  unit: "st",
  unit_price_excl_vat: "0",
  discount_percent: "0",
  vat_percent: "25",
  cost_account: "4010",
  vat_account: "2641",
};


function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Kunde inte läsa filen."));

    reader.readAsDataURL(file);
  });
}


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


function invoiceDefaultsFromMode(mode: string) {
  if (mode === "historical-paid") {
    return {
      ...emptyInvoice,
      invoice_origin: "historical",
      status: "paid",
      paid_date: today,
      received_date: today,
      notes: "Gammal leverantörsfaktura. Redan betald.",
    };
  }

  if (mode === "historical-unpaid") {
    return {
      ...emptyInvoice,
      invoice_origin: "historical",
      status: "unpaid",
      paid_date: "",
      payment_method: "",
      payment_reference: "",
      notes: "Gammal leverantörsfaktura. Ej betald ännu.",
    };
  }

  return emptyInvoice;
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

export default function LeverantorsfakturaDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");
  const isNew = id === "ny";
  const mode = String(router.query.mode || "");

  const [invoice, setInvoice] = useState<any>(emptyInvoice);
  const [lines, setLines] = useState<InvoiceLine[]>([{ ...emptyLine }]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

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
      rounding,
      total,
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

  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function applyCustomerInvoice(value: string) {
    const selected = customerInvoices.find((item) => item.id === value);

    updateInvoice("linked_customer_invoice_id", value);

    if (selected) {
      updateInvoice("linked_order_reference", selected.order_reference || "Faktura " + selected.invoice_number);
    }
  }

  async function loadInvoice() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      if (isNew) {
        const res = await fetch("/api/admin/ekonomi/leverantorsreskontra?tab=all");
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Kunde inte hämta grunddata.");
        }

        setAccounts(json.accounts || []);
        setCustomerInvoices(json.customerInvoices || []);

        if (json.accounts?.[0]?.id) {
          setInvoice({
            ...invoiceDefaultsFromMode(mode),
            paid_bank_account_id: json.accounts[0].id,
          });
        }

        if (!json.accounts?.[0]?.id) {
          setInvoice(invoiceDefaultsFromMode(mode));
        }

        return;
      }

      const res = await fetch("/api/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta leverantörsfaktura.");
      }

      setInvoice({
        ...emptyInvoice,
        ...(json.invoice || {}),
      });
      setLines(json.lines?.length ? json.lines : [{ ...emptyLine }]);
      setAccounts(json.accounts || []);
      setCustomerInvoices(json.customerInvoices || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta leverantörsfaktura.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadAttachment(file?: File | null) {
    if (isNew || !id || !file) return;

    try {
      setUploadingAttachment(true);
      setError("");
      setMessage("");

      const base64 = await fileToBase64(file);

      const res = await fetch("/api/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(id) + "/attachment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type || "application/pdf",
          base64,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte ladda upp bilagan.");
      }

      setMessage("Bilagan laddades upp.");
      await loadInvoice();
    } catch (err: any) {
      setError(err?.message || "Kunde inte ladda upp bilagan.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function openAttachment() {
    if (isNew || !id) return;

    try {
      setError("");

      const res = await fetch("/api/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(id) + "/attachment");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte öppna bilagan.");
      }

      window.open(json.url, "_blank");
    } catch (err: any) {
      setError(err?.message || "Kunde inte öppna bilagan.");
    }
  }

  async function deleteAttachment() {
    if (isNew || !id) return;

    const ok = window.confirm("Vill du ta bort bilagan från leverantörsfakturan?");

    if (!ok) return;

    try {
      setUploadingAttachment(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(id) + "/attachment", {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte ta bort bilagan.");
      }

      setMessage("Bilagan togs bort.");
      await loadInvoice();
    } catch (err: any) {
      setError(err?.message || "Kunde inte ta bort bilagan.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function saveInvoice(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        ...invoice,
        lines,
      };

      const res = await fetch(isNew ? "/api/admin/ekonomi/leverantorsreskontra" : "/api/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(id), {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara leverantörsfakturan.");
      }

      setMessage("Leverantörsfakturan sparades.");

      if (isNew && json.invoice?.id) {
        router.replace("/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(json.invoice.id));
      } else {
        await loadInvoice();
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara leverantörsfakturan.");
    } finally {
      setSaving(false);
    }
  }

  async function markInvoicePaid() {
    if (isNew || !id) return;

    const paidDate = window.prompt(
      "Ange betaldatum (YYYY-MM-DD)",
      invoice.paid_date || new Date().toISOString().slice(0, 10)
    );

    if (!paidDate) return;

    const ok = window.confirm("Vill du markera leverantörsfakturan som betald?");

    if (!ok) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch(
        "/api/admin/ekonomi/leverantorsreskontra/" +
          encodeURIComponent(id) +
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
      await loadInvoice();
    } catch (err: any) {
      setError(err?.message || "Kunde inte markera leverantörsfakturan som betald.");
    } finally {
      setSaving(false);
    }
  }

async function deleteInvoice() {
    if (isNew || !id) return;

    const ok = window.confirm("Vill du arkivera den här leverantörsfakturan?");

    if (!ok) return;

    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(id), {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte arkivera leverantörsfakturan.");
      }

      router.push("/admin/ekonomi/leverantorsreskontra");
    } catch (err: any) {
      setError(err?.message || "Kunde inte arkivera leverantörsfakturan.");
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
          <form onSubmit={saveInvoice} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {isNew && mode === "historical-paid"
                    ? "Gammal betald leverantörsfaktura"
                    : isNew && mode === "historical-unpaid"
                      ? "Gammal obetald leverantörsfaktura"
                      : isNew
                        ? "Ny leverantörsfaktura"
                        : "Leverantörsfaktura"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Lägg in fakturor från leverantörer, bussbolag och samarbetspartner. Gamla fakturor kan läggas in som betalda eller obetalda.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/ekonomi/leverantorsreskontra"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                {!isNew && invoice.status !== "paid" && (
                  <button
                    type="button"
                    onClick={markInvoicePaid}
                    disabled={saving || loading}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Markera som betald
                  </button>
                )}

                {!isNew && (
                  <button
                    type="button"
                    onClick={deleteInvoice}
                    disabled={saving || loading}
                    className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-60"
                  >
                    Arkivera
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara"}
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

            <SupplierRegisterPicker invoice={invoice} setInvoice={setInvoice} />

            
            {invoice?.id && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#194C66]">Internt PDF-underlag</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Öppna eller skriv ut ett internt underlag för leverantörs-/samarbetsfakturan.
                    </p>
                  </div>

                  <a
                    href={"/api/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(String(invoice.id)) + "/pdf"}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Öppna internt PDF-underlag
                  </a>
                </div>
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar...
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Grunduppgifter</h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <SelectField
                      label="Fakturatyp"
                      value={invoice.invoice_origin || "current"}
                      onChange={(value) => updateInvoice("invoice_origin", value)}
                      options={[
                        ["current", "Ny/aktuell faktura"],
                        ["historical", "Gammal faktura"],
                      ]}
                    />

                    <SelectField
                      label="Leverantörstyp"
                      value={invoice.supplier_type || "supplier"}
                      onChange={(value) => updateInvoice("supplier_type", value)}
                      options={[
                        ["supplier", "Leverantör"],
                        ["partner", "Samarbetspartner"],
                        ["subcontractor", "Underleverantör buss"],
                        ["hotel_activity", "Hotell/aktivitet"],
                        ["system", "System/program"],
                        ["other", "Övrigt"],
                      ]}
                    />

                    <Field label="Leverantör/samarbetspartner" value={invoice.supplier_name} onChange={(value) => updateInvoice("supplier_name", value)} />
                    <Field label="Org.nr" value={invoice.supplier_org_number} onChange={(value) => updateInvoice("supplier_org_number", value)} />
                    <Field label="E-post" value={invoice.supplier_email} onChange={(value) => updateInvoice("supplier_email", value)} />
                    <Field label="Leverantörens fakturanr" value={invoice.supplier_invoice_number} onChange={(value) => updateInvoice("supplier_invoice_number", value)} />
                    <Field label="OCR" value={invoice.ocr_number} onChange={(value) => updateInvoice("ocr_number", value)} />
                    <Field label="Referens" value={invoice.invoice_reference} onChange={(value) => updateInvoice("invoice_reference", value)} />

                    <Field label="Fakturadatum" type="date" value={invoice.invoice_date} onChange={(value) => updateInvoice("invoice_date", value)} />
                    <Field label="Förfallodatum" type="date" value={invoice.due_date} onChange={(value) => updateInvoice("due_date", value)} />
                    <Field label="Mottagen datum" type="date" value={invoice.received_date} onChange={(value) => updateInvoice("received_date", value)} />

                    <SelectField
                      label="Status"
                      value={invoice.status || "received"}
                      onChange={(value) => updateInvoice("status", value)}
                      options={[
                        ["received", "Mottagen"],
                        ["approved", "Godkänd"],
                        ["unpaid", "Obetald"],
                        ["overdue", "Förfallen"],
                        ["paid", "Betald"],
                      ]}
                    />

                    <SelectField
                      label="Kategori"
                      value={invoice.category || "Leverantörsfaktura"}
                      onChange={(value) => updateInvoice("category", value)}
                      options={[
                        ["Leverantörsfaktura", "Leverantörsfaktura"],
                        ["Samarbetspartnerfaktura", "Samarbetspartnerfaktura"],
                        ["Underleverantör buss", "Underleverantör buss"],
                        ["Hotell/aktivitet", "Hotell/aktivitet"],
                        ["System/program", "System/program"],
                        ["Drivmedel", "Drivmedel"],
                        ["Marknadsföring", "Marknadsföring"],
                        ["Övrig kostnad", "Övrig kostnad"],
                      ]}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Koppling</h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <SelectField
                      label="Koppla till kundfaktura"
                      value={invoice.linked_customer_invoice_id || ""}
                      onChange={applyCustomerInvoice}
                      options={[
                        ["", "Ingen koppling"],
                        ...customerInvoices.map((item) => [
                          item.id,
                          "Faktura " + item.invoice_number + " · " + item.customer_name + " · " + fmtMoney(item.total_amount),
                        ] as [string, string]),
                      ]}
                    />

                    <Field label="Orderreferens / bokning" value={invoice.linked_order_reference} onChange={(value) => updateInvoice("linked_order_reference", value)} />
                    <Field label="Bokning-ID" value={invoice.linked_booking_id} onChange={(value) => updateInvoice("linked_booking_id", value)} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Originalfaktura / bilaga</h2>

                  {isNew ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Spara leverantörsfakturan först, sedan kan du ladda upp originalfakturan som PDF eller bild.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {invoice.attachment_filename ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                          <div className="font-bold">Bilaga finns</div>
                          <div className="mt-1">{invoice.attachment_filename}</div>
                          {invoice.attachment_uploaded_at && (
                            <div className="mt-1 text-xs">
                              Uppladdad {new Date(invoice.attachment_uploaded_at).toLocaleString("sv-SE")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                          Ingen originalfaktura är uppladdad ännu.
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Ladda upp PDF/bild
                          </label>
                          <input
                            type="file"
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            disabled={uploadingAttachment}
                            onChange={(event) => uploadAttachment(event.target.files?.[0])}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-[#194C66] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#0f3548]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={openAttachment}
                          disabled={!invoice.attachment_path || uploadingAttachment}
                          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Öppna bilaga
                        </button>

                        <button
                          type="button"
                          onClick={deleteAttachment}
                          disabled={!invoice.attachment_path || uploadingAttachment}
                          className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          Ta bort bilaga
                        </button>
                      </div>

                      {uploadingAttachment && (
                        <p className="text-sm font-semibold text-[#194C66]">
                          Hanterar bilaga...
                        </p>
                      )}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Betalning</h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <Field label="Betaldatum" type="date" value={invoice.paid_date} onChange={(value) => updateInvoice("paid_date", value)} />

                    <SelectField
                      label="Betalningssätt"
                      value={invoice.payment_method || "bank_transfer"}
                      onChange={(value) => updateInvoice("payment_method", value)}
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
                      label="Betalt från konto"
                      value={invoice.paid_bank_account_id || ""}
                      onChange={(value) => updateInvoice("paid_bank_account_id", value)}
                      options={[
                        ["", "Välj konto"],
                        ...accounts.map((account) => [
                          account.id,
                          account.account_label || account.bank_name || "Bankkonto",
                        ] as [string, string]),
                      ]}
                    />

                    <Field label="Betalningsreferens" value={invoice.payment_reference} onChange={(value) => updateInvoice("payment_reference", value)} />
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    Om status sätts till Betald skapas/uppdateras kostnaden automatiskt i Intäkter & utgifter.
                  </p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[#194C66]">Rader</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Lägg in en eller flera kostnadsrader från fakturan.
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
                            <Field label="Beskrivning" value={line.description} onChange={(value) => updateLine(index, "description", value)} />
                            <Field label="Antal" value={line.quantity} onChange={(value) => updateLine(index, "quantity", value)} />
                            <Field label="Enhet" value={line.unit} onChange={(value) => updateLine(index, "unit", value)} />
                            <Field label="Pris exkl. moms" value={line.unit_price_excl_vat} onChange={(value) => updateLine(index, "unit_price_excl_vat", value)} />
                            <Field label="Rabatt %" value={line.discount_percent} onChange={(value) => updateLine(index, "discount_percent", value)} />
                            <Field label="Moms %" value={line.vat_percent} onChange={(value) => updateLine(index, "vat_percent", value)} />
                            <Field label="Kostnadskonto" value={line.cost_account} onChange={(value) => updateLine(index, "cost_account", value)} />
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
                        <div className="text-xl font-bold">{fmtMoney(totals.subtotal)}</div>
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
                        <div className="opacity-80">Totalt</div>
                        <div className="text-2xl font-black">{fmtMoney(totals.total)}</div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Anteckningar</h2>

                  <Textarea label="Anteckning" value={invoice.notes} onChange={(value) => updateInvoice("notes", value)} />
                  <Textarea label="Intern anteckning" value={invoice.internal_notes} onChange={(value) => updateInvoice("internal_notes", value)} />
                </section>
              </>
            )}
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
