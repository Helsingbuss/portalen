import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type RunRow = {
  title?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  payout_date?: string | null;
};

type PayslipRow = {
  employee_name_snapshot?: string | null;
  employee_role_snapshot?: string | null;
  pay_type?: string | null;
  hours?: number | null;
  hourly_rate?: number | null;
  monthly_salary?: number | null;
  vacation_percent?: number | null;
  gross_base?: number | null;
  vacation_pay?: number | null;
  gross_total?: number | null;
  preliminary_tax_percent?: number | null;
  preliminary_tax_amount?: number | null;
  net_pay?: number | null;
  payout_amount?: number | null;
  tax_notes?: string | null;
  employer_fee_percent?: number | null;
  employer_fee?: number | null;
  total_cost?: number | null;
  notes?: string | null;
};

function fmtMoney(value?: number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtNumber(value?: number | null) {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function payTypeLabel(type?: string | null) {
  return type === "monthly" ? "Månadslön" : "Timlön";
}

export default function LonebeskedPrintPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [run, setRun] = useState<RunRow | null>(null);
  const [payslip, setPayslip] = useState<PayslipRow | null>(null);
  const [error, setError] = useState("");

  async function loadPayslip() {
    if (!id) return;

    try {
      const res = await fetch("/api/admin/lon/lonebesked/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönebesked.");
      }

      setRun(json.run || null);
      setPayslip(json.payslip || null);
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    }
  }

  useEffect(() => {
    loadPayslip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return <main className="p-10 text-red-700">{error}</main>;
  }

  if (!payslip) {
    return <main className="p-10 text-slate-500">Laddar lönebesked...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow print:shadow-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white"
          >
            Skriv ut / spara som PDF
          </button>

          <button
            type="button"
            onClick={() => history.back()}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66]"
          >
            Tillbaka
          </button>
        </div>

        <section className="border-b border-slate-200 pb-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
            Helsingbuss
          </div>

          <h1 className="mt-2 text-3xl font-bold text-[#194C66]">
            Lönebesked
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {run?.title || "Lönekörning"}
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Info label="Anställd" value={payslip.employee_name_snapshot || "—"} />
          <Info label="Lönetyp" value={payTypeLabel(payslip.pay_type)} />
          <Info label="Period" value={fmtDate(run?.period_start) + " – " + fmtDate(run?.period_end)} />
          <Info label="Utbetalningsdatum" value={fmtDate(run?.payout_date)} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-[#194C66]">Lön</h2>

          <table className="mt-4 w-full border-collapse text-sm">
            <tbody>
              <Row label="Timmar" value={fmtNumber(payslip.hours) + " h"} />
              <Row label="Timlön" value={fmtMoney(payslip.hourly_rate)} />
              <Row label="Månadslön" value={fmtMoney(payslip.monthly_salary)} />
              <Row label="Grundlön" value={fmtMoney(payslip.gross_base)} />
              <Row label="Semesterersättning" value={fmtMoney(payslip.vacation_pay) + " (" + fmtNumber(payslip.vacation_percent) + " %)"} />
              <Row label="Bruttolön" value={fmtMoney(payslip.gross_total)} strong />
              <Row label="Preliminär skatt" value={"-" + fmtMoney(payslip.preliminary_tax_amount) + " (" + fmtNumber(payslip.preliminary_tax_percent) + " %)"} />
              <Row label="Nettolön" value={fmtMoney(payslip.net_pay || payslip.payout_amount)} strong />
              <Row label="Utbetalningsbelopp" value={fmtMoney(payslip.payout_amount || payslip.net_pay)} strong />
            </tbody>
          </table>
        </section>

        <section className="mt-8 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
          <h2 className="text-base font-bold text-[#194C66]">Intern arbetsgivarkostnad</h2>
          <p className="mt-2">
            Arbetsgivaravgift: {fmtMoney(payslip.employer_fee)} ({fmtNumber(payslip.employer_fee_percent)} %)
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            Total kostnad: {fmtMoney(payslip.total_cost)}
          </p>
        </section>

        {payslip.tax_notes && (
          <section className="mt-8">
            <h2 className="text-base font-bold text-[#194C66]">Skatteanteckning</h2>
            <p className="mt-2 text-sm text-slate-600">{payslip.tax_notes}</p>
          </section>
        )}

        {payslip.notes && (
          <section className="mt-8">
            <h2 className="text-base font-bold text-[#194C66]">Anteckning</h2>
            <p className="mt-2 text-sm text-slate-600">{payslip.notes}</p>
          </section>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Detta lönebesked är framtaget i Helsingbuss portal.
        </footer>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-3 text-slate-600">{label}</td>
      <td className={"py-3 text-right " + (strong ? "text-lg font-bold text-[#194C66]" : "font-semibold text-slate-900")}>
        {value}
      </td>
    </tr>
  );
}
