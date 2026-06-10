import { useMemo, useState } from "react";

type AccountingRow = {
  id: string;
  date: string;
  type: string;
  text: string;
  reference: string;
  debit: number;
  credit: number;
  vat: number;
};

const initialRows: AccountingRow[] = [];

function money(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function currentMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function currentMonthEnd() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}

export default function BokforingsunderlagPage() {
  const [fromDate, setFromDate] = useState(currentMonthStart());
  const [toDate, setToDate] = useState(currentMonthEnd());
  const [rows] = useState<AccountingRow[]>(initialRows);

  const totals = useMemo(() => {
    return rows.reduce(
      (sum, row) => {
        sum.debit += row.debit;
        sum.credit += row.credit;
        sum.vat += row.vat;
        return sum;
      },
      { debit: 0, credit: 0, vat: 0 }
    );
  }, [rows]);

  function handlePrint() {
    window.print();
  }

  return (
    <main className="hb-accounting-page">
      <section className="hb-accounting-hero">
        <div>
          <p className="hb-kicker">Ekonomi</p>
          <h1>Bokföringsunderlag</h1>
          <p>
            Här samlas underlag från fakturor, leverantörsfakturor och betalningar
            inför bokföring. Välj period, kontrollera posterna och skriv ut eller
            spara som PDF.
          </p>
        </div>

        <div className="hb-actions no-print">
          <button type="button" onClick={handlePrint}>
            Skriv ut
          </button>
          <button type="button" onClick={handlePrint}>
            Spara som PDF
          </button>
        </div>
      </section>

      <section className="hb-period-card no-print">
        <div>
          <label>Från datum</label>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>

        <div>
          <label>Till datum</label>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>

        <div className="hb-period-info">
          <span>Vald period</span>
          <strong>
            {fromDate} – {toDate}
          </strong>
        </div>
      </section>

      <section className="hb-summary-grid">
        <article>
          <span>Debet</span>
          <strong>{money(totals.debit)}</strong>
          <p>Summa kostnader/utgående poster</p>
        </article>

        <article>
          <span>Kredit</span>
          <strong>{money(totals.credit)}</strong>
          <p>Summa intäkter/ingående poster</p>
        </article>

        <article>
          <span>Moms</span>
          <strong>{money(totals.vat)}</strong>
          <p>Beräknad moms för vald period</p>
        </article>

        <article>
          <span>Poster</span>
          <strong>{rows.length}</strong>
          <p>Antal underlag i perioden</p>
        </article>
      </section>

      <section className="hb-table-card">
        <div className="hb-table-header">
          <div>
            <p className="hb-kicker">Underlag</p>
            <h2>Poster för bokföring</h2>
          </div>
          <p>
            Period: {fromDate} – {toDate}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="hb-empty-state">
            <h3>Inga bokföringsposter är kopplade ännu</h3>
            <p>
              Sidan är redo för nästa steg. Då kopplar vi in fakturor,
              leverantörsfakturor, betalningar och moms så underlaget fylls
              automatiskt.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Typ</th>
                <th>Text</th>
                <th>Referens</th>
                <th>Debet</th>
                <th>Kredit</th>
                <th>Moms</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{row.type}</td>
                  <td>{row.text}</td>
                  <td>{row.reference}</td>
                  <td>{money(row.debit)}</td>
                  <td>{money(row.credit)}</td>
                  <td>{money(row.vat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <style jsx>{`
        .hb-accounting-page {
          padding: 28px;
          color: #17202a;
        }

        .hb-accounting-hero {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
          padding: 26px;
          border-radius: 24px;
          background: linear-gradient(135deg, #1a545f, #007764);
          color: #fff;
          margin-bottom: 20px;
        }

        .hb-accounting-hero h1 {
          margin: 4px 0 8px;
          font-size: 30px;
        }

        .hb-accounting-hero p {
          margin: 0;
          max-width: 720px;
          opacity: 0.92;
        }

        .hb-kicker {
          margin: 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
          opacity: 0.85;
        }

        .hb-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hb-actions button {
          border: 0;
          border-radius: 999px;
          padding: 11px 16px;
          font-weight: 800;
          cursor: pointer;
          background: #f5f4f0;
          color: #1a545f;
        }

        .hb-period-card {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          padding: 18px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.08);
          margin-bottom: 20px;
        }

        .hb-period-card label,
        .hb-period-info span {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 800;
          color: #334155;
        }

        .hb-period-card input {
          width: 100%;
          border: 1px solid #d8dee8;
          border-radius: 14px;
          padding: 11px 12px;
          font-size: 14px;
        }

        .hb-period-info {
          padding: 12px 14px;
          border-radius: 16px;
          background: #f8fafc;
        }

        .hb-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .hb-summary-grid article {
          padding: 18px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.08);
        }

        .hb-summary-grid span {
          display: block;
          font-size: 13px;
          font-weight: 800;
          color: #64748b;
        }

        .hb-summary-grid strong {
          display: block;
          margin-top: 6px;
          font-size: 24px;
          color: #1a545f;
        }

        .hb-summary-grid p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .hb-table-card {
          padding: 20px;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.08);
        }

        .hb-table-header {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .hb-table-header h2 {
          margin: 4px 0 0;
        }

        .hb-table-header p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          overflow: hidden;
          border-radius: 16px;
        }

        th,
        td {
          padding: 12px 10px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
          font-size: 14px;
        }

        th {
          background: #f8fafc;
          color: #334155;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .hb-empty-state {
          padding: 26px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
        }

        .hb-empty-state h3 {
          margin: 0 0 8px;
          color: #1a545f;
        }

        .hb-empty-state p {
          margin: 0;
          color: #64748b;
          max-width: 720px;
        }

        @media (max-width: 900px) {
          .hb-accounting-hero,
          .hb-table-header {
            flex-direction: column;
          }

          .hb-period-card,
          .hb-summary-grid {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          .no-print,
          nav,
          aside,
          button,
          input {
            display: none !important;
          }

          .hb-accounting-page {
            padding: 0;
          }

          .hb-accounting-hero,
          .hb-table-card,
          .hb-summary-grid article {
            box-shadow: none !important;
          }

          .hb-accounting-hero {
            background: #fff !important;
            color: #111827 !important;
            border-bottom: 2px solid #111827;
            border-radius: 0;
            padding: 0 0 12px;
          }

          .hb-summary-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          th,
          td {
            border: 1px solid #d1d5db;
            font-size: 11px;
          }
        }
      `}</style>
    </main>
  );
}
