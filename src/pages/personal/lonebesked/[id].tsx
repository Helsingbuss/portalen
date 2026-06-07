import PayrollUnderlagBreakdown from "@/components/lon/PayrollUnderlagBreakdown";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type EmployeeRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
};

type RunRow = {
  title?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  payout_date?: string | null;
  status?: string | null;
};

type PayslipRow = {
  id: string;
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
  tax_deduction_mode?: string | null;
  tax_notes?: string | null;

  status?: string | null;
  notes?: string | null;
  app_published_at?: string | null;
};

function employeeName(employee?: EmployeeRow | null) {
  if (!employee) return "";
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Medarbetare";
}

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

function statusLabel(status?: string | null) {
  switch (status) {
    case "draft":
      return "Utkast";
    case "approved":
      return "Godkänd";
    case "exported":
      return "Exporterad";
    case "bank_sent":
      return "Skickad till bank";
    case "paid":
      return "Betald";
    case "cancelled":
      return "Avbruten";
    default:
      return status || "Status";
  }
}

function payTypeLabel(value?: string | null) {
  if (value === "monthly") return "Månadslön";
  return "Timlön";
}

export default function PersonalLonebeskedDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [payslip, setPayslip] = useState<PayslipRow | null>(null);
  const [run, setRun] = useState<RunRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [pdfOpening, setPdfOpening] = useState(false);
  const [error, setError] = useState("");

  async function loadPayslip() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("personal_auth_token");

      if (!token) {
        window.location.href = "/personal/login";
        return;
      }

      const res = await fetch("/api/personal/lonebesked/" + encodeURIComponent(id), {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        localStorage.removeItem("personal_auth_token");
        window.location.href = "/personal/login";
        return;
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönebeskedet.");
      }

      setEmployee(json.employee || null);
      setPayslip(json.payslip || null);
      setRun(json.run || null);
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function openPdfFile() {
    try {
      setPdfOpening(true);
      setError("");

      const token = localStorage.getItem("personal_auth_token");

      if (!token) {
        window.location.href = "/personal/login";
        return;
      }

      const res = await fetch("/api/personal/lonebesked/" + encodeURIComponent(id) + "/pdf", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        localStorage.removeItem("personal_auth_token");
        window.location.href = "/personal/login";
        return;
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte öppna PDF.");
      }

      if (json.signedUrl) {
        window.open(json.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte öppna PDF.");
    } finally {
      setPdfOpening(false);
    }
  }

  useEffect(() => {
    loadPayslip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <main className="min-h-screen bg-[#f5f4f0]">
      <section className="bg-[#194C66] px-6 py-8 text-white print:hidden">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b1e3dd]">
              Helsingbuss Personal
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Lönebesked
            </h1>

            <p className="mt-2 text-sm text-slate-100">
              {employeeName(employee)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/personal/lonebesked"
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Tillbaka
            </a>

            <button
              type="button"
              onClick={openPdfFile}
              disabled={pdfOpening}
              className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
            >
              {pdfOpening ? "Öppnar..." : "Öppna riktig PDF"}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
            >
              Skriv ut / spara PDF
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-8 print:px-0 print:py-0">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm print:shadow-none">
            Laddar lönebesked...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
            {error}
          </div>
        ) : !payslip ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            Lönebeskedet hittades inte.
          </div>
        ) : (
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none">
            <header className="border-b border-slate-200 pb-6">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                Helsingbuss
              </div>

              <h2 className="mt-2 text-3xl font-bold text-[#194C66]">
                Lönebesked
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                {run?.title || "Lönekörning"}
              </p>
            </header>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <InfoBox label="Anställd" value={payslip.employee_name_snapshot || employeeName(employee)} />
              <InfoBox label="Lönetyp" value={payTypeLabel(payslip.pay_type)} />
              <InfoBox label="Period" value={fmtDate(run?.period_start) + " – " + fmtDate(run?.period_end)} />
              <InfoBox label="Utbetalningsdatum" value={fmtDate(run?.payout_date)} />
              <InfoBox label="Status" value={statusLabel(payslip.status)} />
              <InfoBox label="Publicerad" value={fmtDate(payslip.app_published_at)} />
            </section>

            <section className="mt-8">
              <h3 className="text-lg font-bold text-[#194C66]">
                Lön
              </h3>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <Row label="Timmar" value={fmtNumber(payslip.hours) + " h"} />
                <Row label="Timlön" value={fmtMoney(payslip.hourly_rate)} />
                <Row label="Månadslön" value={fmtMoney(payslip.monthly_salary)} />
                <Row label="Grundlön" value={fmtMoney(payslip.gross_base)} />
                <Row label="Semesterersättning" value={fmtMoney(payslip.vacation_pay) + " (" + fmtNumber(payslip.vacation_percent) + " %)"} />
                <Row label="Bruttolön" value={fmtMoney(payslip.gross_total)} strong />
                <Row label="Preliminär skatt" value={"-" + fmtMoney(payslip.preliminary_tax_amount) + " (" + fmtNumber(payslip.preliminary_tax_percent) + " %)"} tone="red" />
                <Row label="Nettolön" value={fmtMoney(payslip.net_pay)} tone="green" strong />
                <Row label="Utbetalningsbelopp" value={fmtMoney(payslip.payout_amount || payslip.net_pay)} strong />
              </div>
            </section>

            
            {payslip && (
              <PayrollUnderlagBreakdown payslip={payslip} />
            )}

            {payslip.tax_notes && (
              <section className="mt-8 rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                <h3 className="font-bold text-[#194C66]">
                  Skatteanteckning
                </h3>
                <p className="mt-2">{payslip.tax_notes}</p>
              </section>
            )}

            {payslip.notes && (
              <section className="mt-8 rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                <h3 className="font-bold text-[#194C66]">
                  Anteckning
                </h3>
                <p className="mt-2">{payslip.notes}</p>
              </section>
            )}

            <footer className="mt-10 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
              Detta lönebesked visas i Helsingbuss personalvy. Vid frågor, kontakta ansvarig administratör.
            </footer>
          </article>
        )}
      </section>
    </main>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "green" | "red";
}) {
  const color = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-700" : "text-slate-900";

  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="text-sm text-slate-600">{label}</div>
      <div className={(strong ? "font-bold " : "font-semibold ") + color}>{value}</div>
    </div>
  );
}
