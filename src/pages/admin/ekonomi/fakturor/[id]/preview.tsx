import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Invoice = Record<string, any>;
type InvoiceLine = Record<string, any>;

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtNumber(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function fmtDateTime(value?: string | null) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("sv-SE");
  } catch {
    return value;
  }
}

export default function InvoicePreviewPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [paymentText, setPaymentText] = useState("");
  const [invoiceAccount, setInvoiceAccount] = useState<any>(null);
  const [swishQr, setSwishQr] = useState<any>(null);
  const [swishQrError, setSwishQrError] = useState("");

  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isApproved = Boolean(invoice?.approved_for_sending_at);

  async function loadSwishQr(invoiceId: string) {
    try {
      setSwishQrError("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(invoiceId) + "/swish-qr");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "QR-koden kunde inte skapas.");
      }

      setSwishQr(json);
    } catch (err: any) {
      setSwishQr(null);
      setSwishQrError(err?.message || "QR-koden kunde inte skapas.");
    }
  }

  async function loadPreview() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(id) + "/preview");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta förhandsgranskning.");
      }

      setInvoice(json.invoice || null);
      setLines(json.lines || []);
      setSettings(json.settings || null);
      setPaymentText(json.invoice?.payment_text || json.paymentText || "");
      setInvoiceAccount(json.invoiceAccount || null);

      await loadSwishQr(id);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta förhandsgranskning.");
    } finally {
      setLoading(false);
    }
  }

  async function approvePreview() {
    if (!id) return;

    try {
      setApproving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(id) + "/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "approve",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte godkänna fakturan.");
      }

      setInvoice(json.invoice || invoice);
      setMessage("Fakturan är godkänd för utskick.");
    } catch (err: any) {
      setError(err?.message || "Kunde inte godkänna fakturan.");
    } finally {
      setApproving(false);
    }
  }

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800;900&display=swap');

        .invoice-logo-img {
          display: block;
          width: 58mm;
          max-width: 220px;
          height: auto;
          object-fit: contain;
        }

        
        .invoice-open-sans {
          font-family: 'Open Sans', Arial, Helvetica, sans-serif !important;
          font-size: 15px;
          line-height: 1.55;
        }

        .invoice-open-sans table {
          font-size: 14px;
        }

        .invoice-open-sans .text-xs {
          font-size: 12px !important;
        }

        .invoice-open-sans .text-sm {
          font-size: 14px !important;
        }

        @media print {
          .invoice-logo-img {
            width: 50mm !important;
            max-width: 50mm !important;
          }
        }

        @page {
          size: A4;
          margin: 10mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: visible;
          }

          .invoice-print-page {
            width: 190mm !important;
            max-width: 190mm !important;
            min-height: auto !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            font-size: 10.5px !important;
            line-height: 1.35 !important;
          }

          .invoice-print-page h1 {
            font-size: 26px !important;
            margin: 0 !important;
          }

          .invoice-print-page h2 {
            font-size: 14px !important;
          }

          .invoice-print-page .invoice-logo {
            font-size: 30px !important;
            line-height: 1 !important;
          }

          .invoice-print-page .invoice-top-space {
            margin-top: 16px !important;
          }

          .invoice-print-page .invoice-grid {
            gap: 14px !important;
          }

          .invoice-print-page .invoice-card {
            padding: 12px !important;
            border-radius: 8px !important;
          }

          .invoice-print-page .invoice-section {
            margin-top: 16px !important;
          }

          .invoice-print-page table {
            font-size: 10px !important;
          }

          .invoice-print-page th {
            padding: 7px 8px !important;
          }

          .invoice-print-page td {
            padding: 7px 8px !important;
            vertical-align: top !important;
          }

          .invoice-print-page .invoice-note {
            margin-top: 12px !important;
            padding: 10px !important;
            border-radius: 8px !important;
          }

          .invoice-print-page .invoice-summary-grid {
            margin-top: 14px !important;
            gap: 12px !important;
          }

          .invoice-print-page .invoice-summary-card {
            padding: 12px !important;
            border-radius: 8px !important;
          }

          .invoice-print-page .invoice-footer {
            margin-top: 18px !important;
            padding-top: 12px !important;
          }

          .invoice-print-page .invoice-footer-grid {
            gap: 10px !important;
            font-size: 9px !important;
            line-height: 1.3 !important;
          }

          .print-hidden,
          .print\\:hidden {
            display: none !important;
          }

          .print-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Förhandsgranska faktura
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Kontrollera fakturan innan den godkänns för utskick. Swish QR-kod skapas per faktura.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={id ? "/admin/ekonomi/fakturor/" + encodeURIComponent(id) : "/admin/ekonomi/fakturor"}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="button"
                  onClick={() => window.open("/admin/ekonomi/fakturor/" + encodeURIComponent(id) + "/print", "_blank")}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Ren utskrift / PDF
                </button>

                <button
                  type="button"
                  onClick={approvePreview}
                  disabled={approving || loading || isApproved}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {isApproved ? "Godkänd för utskick" : approving ? "Godkänner..." : "Godkänn för utskick"}
                </button>

                {isApproved && (
                  <Link
                    href={id ? "/admin/ekonomi/fakturor/" + encodeURIComponent(id) : "/admin/ekonomi/fakturor"}
                    className="rounded-xl bg-[#194C66] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                  >
                    Skicka från fakturasidan
                  </Link>
                )}
              </div>
            </div>

            {(message || error || isApproved) && (
              <section
                className={
                  "rounded-2xl border p-5 text-sm font-semibold shadow-sm print:hidden " +
                  (error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700")
                }
              >
                {error ||
                  message ||
                  "Fakturan är godkänd för utskick" +
                    (invoice?.approved_for_sending_at ? " " + fmtDateTime(invoice.approved_for_sending_at) : "")}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar förhandsgranskning...
              </section>
            ) : !invoice ? (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
                Fakturan kunde inte hittas.
              </section>
            ) : (
              <section className="invoice-open-sans invoice-print-page mx-auto max-w-[900px] rounded-2xl border border-slate-200 bg-white p-10 shadow-sm print:border-0 print:p-0 print:shadow-none">
                <div className="flex items-start justify-between">
                  <div>
                    <img src="/images/helsingbuss-logo-mork.png" alt="Helsingbuss" className="invoice-logo-img" />
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">Sida 1 av 1</div>
                    <h1 className="mt-8 text-4xl font-black text-[#194C66]">Faktura</h1>
                    <div className="mt-2 text-sm">
                      <span className="font-bold">Fakturanummer</span>{" "}
                      <span>{invoice.invoice_number || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="invoice-top-space invoice-grid mt-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="invoice-card rounded-2xl border border-slate-200 bg-white p-6">
                    <InfoRow label="Kundnr" value={invoice.customer_number || "—"} />
                    <InfoRow label="Fakturadatum" value={fmtDate(invoice.invoice_date)} />
                    <InfoRow label="Leveransdatum" value={fmtDate(invoice.invoice_date)} />
                    <InfoRow label="Fakturasumma" value={fmtMoney(invoice.total_amount)} />
                    <InfoRow label="Er referens" value={invoice.your_reference || "—"} />
                    <InfoRow label="Vår referens" value={invoice.our_reference || "—"} />
                    <InfoRow label="Er orderreferens" value={invoice.order_reference || "—"} />
                    <InfoRow
                      label="Dröjsmålsränta"
                      value="Vid utebliven betalning tillämpas dröjsmålsränta enligt räntelagen. Påminnelseavgift kan tillkomma."
                    />
                  </div>

                  <div className="invoice-card rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="text-sm font-black uppercase tracking-wide text-[#194C66]">
                      Fakturamottagare
                    </div>

                    <p className="mt-4 text-lg leading-7 text-slate-900">
                      <strong>{invoice.customer_name}</strong>
                      {invoice.customer_address ? <><br />{invoice.customer_address}</> : null}
                      {(invoice.customer_zip || invoice.customer_city) ? (
                        <>
                          <br />
                          {[invoice.customer_zip, invoice.customer_city].filter(Boolean).join(" ")}
                        </>
                      ) : null}
                      {invoice.customer_country ? <><br />{invoice.customer_country}</> : null}
                    </p>
                  </div>
                </div>

                <div className="invoice-section mt-10 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-[#194C66] text-white">
                      <tr>
                        <Th>Beskrivning</Th>
                        <Th>Antal</Th>
                        <Th>Enhet</Th>
                        <Th>Á-pris</Th>
                        <Th className="text-right">Summa</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line) => (
                        <tr key={line.id || line.line_order} className="align-top">
                          <Td>
                            <div className="font-semibold text-slate-900">{line.description}</div>
                            {line.extra_description && (
                              <div className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-600">
                                {line.extra_description}
                              </div>
                            )}
                          </Td>
                          <Td>{fmtNumber(line.quantity)}</Td>
                          <Td>{line.unit}</Td>
                          <Td>{fmtMoney(line.unit_price_excl_vat)}</Td>
                          <Td className="text-right font-semibold">{fmtMoney(line.line_total_incl_vat)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {invoice.notes && (
                  <div className="invoice-note mt-8 rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm leading-6 text-slate-700">
                    {invoice.notes}
                  </div>
                )}

                <div className="invoice-summary-grid mt-8 grid gap-6 md:grid-cols-[1fr_230px_1fr]">
                  <div className="invoice-card rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-black text-[#194C66]">Sammanställning</h2>

                    <div className="mt-5 space-y-3 text-sm">
                      <SummaryLine label="Exkl. moms" value={fmtMoney(invoice.subtotal_excl_vat)} />
                      <SummaryLine label="Moms" value={fmtMoney(invoice.vat_amount)} />
                      <SummaryLine label="Avrundning" value={fmtMoney(invoice.rounding_amount)} />

                      <div className="mt-5 border-t border-[#194C66] pt-5">
                        <SummaryLine label="Att betala" value={fmtMoney(invoice.total_amount)} bold />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
                    <h2 className="text-sm font-black text-[#194C66]">Betala med Swish</h2>

                    {swishQr?.qrDataUrl ? (
                      <img
                        src={swishQr.qrDataUrl}
                        alt="Swish QR-kod"
                        className="mx-auto mt-4 h-40 w-40"
                      />
                    ) : (
                      <div className="mx-auto mt-4 flex h-40 w-40 items-center justify-center rounded-xl bg-slate-100 px-3 text-xs leading-5 text-slate-500">
                        {swishQrError || "Swish QR saknas"}
                      </div>
                    )}

                    <div className="mt-3 text-xs text-emerald-700">Belopp låst till fakturan</div>
                    <div className="text-xs text-slate-500">Swish-nummer</div>
                    <div className="text-lg font-black text-[#194C66]">
                      {invoiceAccount?.swish_number || swishQr?.swishNumber || "Saknas"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-sky-50 p-6">
                    <h2 className="text-lg font-black text-[#194C66]">Betalningsinformation</h2>

                    <div className="mt-5 space-y-3 text-sm">
                      <SummaryLine label="Förfallodatum" value={fmtDate(invoice.due_date)} />
                      <SummaryLine label="OCR" value={invoice.ocr_number || invoice.invoice_number || "—"} />
                      <SummaryLine label="Bankgiro" value={invoiceAccount?.bankgiro || "—"} />
                      <SummaryLine label="Swish" value={invoiceAccount?.swish_number || swishQr?.swishNumber || "—"} />

                      <div className="mt-5 border-t border-[#194C66] pt-5">
                        <SummaryLine label="Att betala" value={fmtMoney(invoice.total_amount)} bold />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="invoice-note mt-8 rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm leading-6 text-slate-700">
                  <strong>Betalning:</strong>
                  <br />
                  {paymentText || invoice.payment_text || "Betalningsuppgifter saknas."}
                </div>

                <div className="invoice-footer mt-10 border-t-4 border-[#194C66] pt-6">
                  <div className="invoice-footer-grid grid gap-5 text-xs text-slate-600 md:grid-cols-4">
                    <FooterBox title="Adress">
                      {settings?.company_name || "Helsingbuss"}
                      <br />
                      Hofverbergsgatan 25
                      <br />
                      254 43 Helsingborg
                    </FooterBox>

                    <FooterBox title="Telefon">
                      010-405 38 38
                      <br />
                      <br />
                      <strong>E-post / Webbplats</strong>
                      <br />
                      info@helsingbuss.se
                      <br />
                      helsingbuss.se
                    </FooterBox>

                    <FooterBox title="Säte">
                      Helsingborg
                      <br />
                      <br />
                      <strong>Organisationsnr</strong>
                      <br />
                      {settings?.org_number || "—"}
                    </FooterBox>

                    <FooterBox title="Momsreg.nr">
                      {settings?.vat_number || "—"}
                      <br />
                      <br />
                      Godkänd för F-skatt
                    </FooterBox>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <div className="font-bold text-slate-900">{label}</div>
      <div className="text-slate-700">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex items-center justify-between gap-4 " + (bold ? "text-xl font-black text-[#194C66]" : "text-slate-700")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function FooterBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-black text-[#194C66]">{title}</div>
      <div className="mt-2 leading-5">{children}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"px-4 py-3 text-xs font-black uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-4 py-4 " + className}>{children}</td>;
}
