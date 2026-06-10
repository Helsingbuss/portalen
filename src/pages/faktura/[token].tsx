import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";

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

export default function PublicInvoicePage() {
  const router = useRouter();
  const token = String(router.query.token || "");

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [invoiceAccount, setInvoiceAccount] = useState<any>(null);
  const [paymentText, setPaymentText] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadInvoice() {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/public/faktura/" + encodeURIComponent(token));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Fakturan kunde inte hämtas.");
      }

      setInvoice(json.invoice || null);
      setLines(json.lines || []);
      setSettings(json.settings || null);
      setInvoiceAccount(json.invoiceAccount || null);
      setPaymentText(json.invoice?.payment_text || json.paymentText || "");
    } catch (err: any) {
      setError(err?.message || "Fakturan kunde inte hämtas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f4f0] px-6 py-10">
        <section className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          Laddar faktura...
        </section>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="min-h-screen bg-[#f5f4f0] px-6 py-10">
        <section className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
          {error || "Fakturan kunde inte hittas."}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f4f0] px-4 py-8 print:bg-white">
      <div className="mx-auto mb-5 flex max-w-5xl justify-end gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
        >
          Skriv ut / spara PDF
        </button>
      </div>

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

        <div className="invoice-summary-grid mt-8 grid gap-6 md:grid-cols-[1fr_1fr]">
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

          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-6">
            <h2 className="text-lg font-black text-[#194C66]">Betalningsinformation</h2>

            <div className="mt-5 space-y-3 text-sm">
              <SummaryLine label="Förfallodatum" value={fmtDate(invoice.due_date)} />
              <SummaryLine label="OCR" value={invoice.ocr_number || invoice.invoice_number || "—"} />
              <SummaryLine label="Bankgiro" value={invoiceAccount?.bankgiro || "—"} />
              <SummaryLine label="Swish" value={invoiceAccount?.swish_number || "—"} />

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
    </main>
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
