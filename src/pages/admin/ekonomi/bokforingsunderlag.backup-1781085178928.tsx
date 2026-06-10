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

const rows: AccountingRow[] = [];

function money(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function getMonthEnd() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default function BokforingsunderlagPage() {
  const [fromDate, setFromDate] = useState(getMonthStart());
  const [toDate, setToDate] = useState(getMonthEnd());

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
  }, []);

  function handlePrint() {
    window.print();
  }

  const content = (
    <main>
      <div className="no-print" style={{ marginBottom: 16 }}>
        <h1>Bokföringsunderlag</h1>
        <p>
          Här kommer bokföringsunderlag från fakturor, leverantörsfakturor och betalningar.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <label>
            Från datum<br />
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>

          <label>
            Till datum<br />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>

          <button type="button" onClick={handlePrint}>
            Skriv ut / Spara som PDF
          </button>
        </div>
      </div>

      <section>
        <h2>Sammanställning</h2>

        <p>
          Period: <strong>{fromDate}</strong> – <strong>{toDate}</strong>
        </p>

        <table>
          <tbody>
            <tr>
              <td>Debet</td>
              <td>{money(totals.debit)}</td>
            </tr>
            <tr>
              <td>Kredit</td>
              <td>{money(totals.credit)}</td>
            </tr>
            <tr>
              <td>Moms</td>
              <td>{money(totals.vat)}</td>
            </tr>
            <tr>
              <td>Antal poster</td>
              <td>{rows.length}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Poster för bokföring</h2>

        {rows.length === 0 ? (
          <p>
            Inga bokföringsposter är kopplade ännu. Nästa steg blir att koppla
            fakturor, leverantörsfakturor, betalningar och moms hit.
          </p>
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
        @media print {
          .no-print,
          nav,
          aside,
          button,
          input {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th,
          td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            font-size: 12px;
          }

          th {
            background: #f3f4f6;
          }
        }
      `}</style>
    </main>
  );

  return (
    <>
      {content}
    </>
  );
}
