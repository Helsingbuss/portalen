import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";

type Invoice = Record<string, any>;
type InvoiceLine = Record<string, any>;

function fmtMoney(value?: number | string | null) {
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

function fmtNumber(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function InvoicePrintPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [invoiceAccount, setInvoiceAccount] = useState<any>(null);
  const [paymentText, setPaymentText] = useState("");
  const [swishQr, setSwishQr] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSwishQr(invoiceId: string) {
    try {
      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(invoiceId) + "/swish-qr");
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.ok) {
        setSwishQr(json);
      }
    } catch {
      setSwishQr(null);
    }
  }

  async function loadInvoice() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(id) + "/preview");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta fakturan.");
      }

      setInvoice(json.invoice || null);
      setLines(json.lines || []);
      setSettings(json.settings || null);
      setInvoiceAccount(json.invoiceAccount || null);
      setPaymentText(json.invoice?.payment_text || json.paymentText || "");

      await loadSwishQr(id);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta fakturan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <main className="print-page-message">Laddar faktura...</main>;
  }

  if (error || !invoice) {
    return <main className="print-page-message">{error || "Fakturan kunde inte hittas."}</main>;
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800;900&display=swap');

        .invoice-logo-img {
          display: block;
          width: 62mm;
          max-width: 235px;
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
            width: 54mm !important;
            max-width: 54mm !important;
          }
        }

        @page {
          size: A4;
          margin: 9mm;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #e5e7eb;
          color: #111827;
          font-family: 'Open Sans', Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .print-actions {
          max-width: 210mm;
          margin: 18px auto;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .print-actions button,
        .print-actions a {
          border: 1px solid #d1d5db;
          background: white;
          color: #194C66;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .invoice-a4 {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 18px;
          background: #ffffff;
          padding: 10mm;
          box-sizing: border-box;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
          font-size: 12.4px;
          line-height: 1.38;
        }

        .top {
          display: grid;
          grid-template-columns: 1fr 70mm;
          gap: 10mm;
          align-items: start;
        }

        .logo {
          font-size: 34px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -1.7px;
          color: #194C66;
        }

        .page-no {
          text-align: right;
          font-size: 13px;
          color: #333;
        }

        .invoice-title {
          margin-top: 6mm;
          color: #194C66;
          font-size: 28px;
          line-height: 1;
          font-weight: 900;
          text-align: right;
        }

        .invoice-number {
          margin-top: 5mm;
          text-align: right;
          font-size: 11px;
          font-weight: 700;
        }

        .recipient {
          margin-top: 9mm;
          font-size: 10.8px;
          line-height: 1.35;
          text-align: left;
          padding-left: 20mm;
        }

        .info-grid {
          margin-top: 9mm;
          display: grid;
          grid-template-columns: 1fr 64mm;
          gap: 8mm;
          align-items: start;
        }

        .invoice-info {
          display: grid;
          grid-template-columns: 28mm 1fr;
          column-gap: 4mm;
          row-gap: 1.3mm;
          font-size: 11.4px;
        }

        .label {
          font-weight: 800;
        }

        .value {
          color: #111827;
        }

        .small-text {
          font-size: 10.4px;
          line-height: 1.25;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        .line-table {
          margin-top: 5mm;
          font-size: 11.2px;
        }

        .line-table thead tr {
          border-top: 1.5px solid #111827;
          border-bottom: 1.5px solid #111827;
        }

        .line-table th {
          padding: 2.3mm 1.6mm;
          text-align: left;
          font-size: 10.3px;
          font-weight: 900;
        }

        .line-table td {
          padding: 2.3mm 1.6mm;
          vertical-align: top;
          border-bottom: 1px solid #e5e7eb;
        }

        .right {
          text-align: right;
        }

        .line-description {
          font-weight: 700;
        }

        .extra-description {
          margin-top: 1.7mm;
          white-space: pre-line;
          font-size: 10.8px;
          line-height: 1.38;
          color: #111827;
          font-weight: 400;
        }

        .message {
          margin-top: 7mm;
          font-size: 11.2px;
          line-height: 1.35;
          white-space: pre-line;
        }

        .bottom-area {
          margin-top: 18mm;
          display: grid;
          grid-template-columns: 48mm 24mm 1fr;
          gap: 5mm;
          align-items: end;
        }

        .totals {
          font-size: 10.8px;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          gap: 10mm;
          padding: 0.6mm 0;
        }

        .payment-box {
          border-top: 1.5px solid #111827;
          padding-top: 2mm;
          font-size: 10.6px;
        }

        .payment-grid {
          display: grid;
          grid-template-columns: 28mm 1fr;
          row-gap: 1mm;
          column-gap: 3mm;
        }

        .pay-total {
          margin-top: 2mm;
          border-top: 1.5px solid #111827;
          padding-top: 2mm;
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          font-weight: 900;
        }

        .qr {
          width: 26mm;
          height: 26mm;
          object-fit: contain;
          display: block;
          border: 1px solid #e5e7eb;
        }

        .qr-placeholder {
          width: 26mm;
          height: 26mm;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5e7eb;
          font-size: 8px;
          text-align: center;
          color: #6b7280;
        }

        .footer {
          margin-top: 6mm;
          border-top: 1.5px solid #111827;
          padding-top: 2.5mm;
          display: grid;
          grid-template-columns: 1.1fr 1fr 1fr 1fr;
          gap: 4mm;
          font-size: 9.4px;
          line-height: 1.25;
        }

        .footer-title {
          font-weight: 900;
          color: #194C66;
          margin-bottom: 1mm;
        }

        .print-page-message {
          max-width: 700px;
          margin: 40px auto;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          color: #4b5563;
          font-family: 'Open Sans', Arial, Helvetica, sans-serif;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
          }

          .print-actions {
            display: none !important;
          }

          .invoice-a4 {
            margin: 0 !important;
            box-shadow: none !important;
            width: 192mm !important;
            min-height: auto !important;
            padding: 0 !important;
          }

          .bottom-area {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .footer {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-actions">
        <a href={id ? "/admin/ekonomi/fakturor/" + encodeURIComponent(id) + "/preview" : "/admin/ekonomi/fakturor"}>
          Tillbaka
        </a>
        <button type="button" onClick={() => window.print()}>
          Skriv ut / spara PDF
        </button>
      </div>

      <main className="invoice-a4">
        <section className="top">
          <div>
            <img src="/images/helsingbuss-logo-mork.png" alt="Helsingbuss" className="invoice-logo-img" />
          </div>

          <div>
            <div className="page-no">Sida 1 av 1</div>
            <div className="invoice-title">Faktura</div>
            <div className="invoice-number">
              Fakturanummer&nbsp;&nbsp; {invoice.invoice_number || "—"}
            </div>

            <div className="recipient">
              <strong>{invoice.customer_name}</strong>
              {invoice.customer_address ? <><br />{invoice.customer_address}</> : null}
              {(invoice.customer_zip || invoice.customer_city) ? (
                <>
                  <br />
                  {[invoice.customer_zip, invoice.customer_city].filter(Boolean).join(" ")}
                </>
              ) : null}
              {invoice.customer_country ? <><br />{invoice.customer_country}</> : null}
            </div>
          </div>
        </section>

        <section className="info-grid">
          <div className="invoice-info">
            <InfoRow label="Kundnr" value={invoice.customer_number || "—"} />
            <InfoRow label="Fakturadatum" value={fmtDate(invoice.invoice_date)} />
            <InfoRow label="Leveransdatum" value={fmtDate(invoice.invoice_date)} />
            <InfoRow label="Fakturasumma" value={fmtMoney(invoice.total_amount) + " kr"} />
            <InfoRow label="Er referens" value={invoice.your_reference || "—"} />
            <InfoRow label="Vår referens" value={invoice.our_reference || "—"} />
            <InfoRow label="Er orderreferens" value={invoice.order_reference || "—"} />
            <InfoRow
              label="Dröjsmålsränta"
              value={
                <span className="small-text">
                  Vid utebliven betalning tillämpas dröjsmålsränta enligt räntelagen.
                  Påminnelseavgift kan tillkomma.
                </span>
              }
            />
          </div>

          <div />
        </section>

        <table className="line-table">
          <thead>
            <tr>
              <th>Beskrivning</th>
              <th className="right">Antal</th>
              <th>Enhet</th>
              <th className="right">Á-pris</th>
              <th className="right">Summa</th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line) => (
              <tr key={line.id || line.line_order}>
                <td>
                  <div className="line-description">{line.description}</div>
                  {line.extra_description && (
                    <div className="extra-description">{line.extra_description}</div>
                  )}
                </td>
                <td className="right">{fmtNumber(line.quantity)}</td>
                <td>{line.unit}</td>
                <td className="right">{fmtMoney(line.unit_price_excl_vat)}</td>
                <td className="right">{fmtMoney(line.line_total_incl_vat)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {invoice.notes && (
          <div className="message">{invoice.notes}</div>
        )}

        <section className="bottom-area">
          <div className="totals">
            <div className="totals-row">
              <strong>Exkl. moms</strong>
              <span>{fmtMoney(invoice.subtotal_excl_vat)}</span>
            </div>
            <div className="totals-row">
              <strong>Moms</strong>
              <span>{fmtMoney(invoice.vat_amount)}</span>
            </div>
            <div className="totals-row">
              <strong>Avrundning</strong>
              <span>{fmtMoney(invoice.rounding_amount)}</span>
            </div>
          </div>

          <div>
            {swishQr?.qrDataUrl ? (
              <img src={swishQr.qrDataUrl} alt="Swish QR" className="qr" />
            ) : (
              <div className="qr-placeholder">Swish QR<br />saknas</div>
            )}
          </div>

          <div className="payment-box">
            <div className="payment-grid">
              <strong>Förfallodatum</strong>
              <span className="right">{fmtDate(invoice.due_date)}</span>

              <strong>OCR</strong>
              <span className="right">{invoice.ocr_number || invoice.invoice_number || "—"}</span>

              <strong>Bankgiro</strong>
              <span className="right">{invoiceAccount?.bankgiro || "—"}</span>

              <strong>Swish</strong>
              <span className="right">{invoiceAccount?.swish_number || swishQr?.swishNumber || "—"}</span>
            </div>

            <div className="pay-total">
              <span>Att betala</span>
              <span>{fmtMoney(invoice.total_amount)}</span>
            </div>
          </div>
        </section>

        <footer className="footer">
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
        </footer>
      </main>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </>
  );
}

function FooterBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="footer-title">{title}</div>
      <div>{children}</div>
    </div>
  );
}
