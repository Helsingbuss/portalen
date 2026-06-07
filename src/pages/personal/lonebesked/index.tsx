import { useEffect, useMemo, useState } from "react";

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
  run?: RunRow | null;
  gross_total?: number | null;
  preliminary_tax_amount?: number | null;
  net_pay?: number | null;
  payout_amount?: number | null;
  status?: string | null;
  email_status?: string | null;
};

type ApiResponse = {
  ok: boolean;
  employee?: EmployeeRow | null;
  payslips?: PayslipRow[];
  summary?: {
    total: number;
    sent: number;
    paid: number;
    totalGross: number;
    totalTax: number;
    totalNet: number;
  };
  error?: string;
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

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "short",
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

function statusClass(status?: string | null) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";
    case "approved":
      return "bg-blue-100 text-blue-700";
    case "exported":
    case "bank_sent":
      return "bg-purple-100 text-purple-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function PersonalLonebeskedPage() {
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    sent: 0,
    paid: 0,
    totalGross: 0,
    totalTax: 0,
    totalNet: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPayslips() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("personal_auth_token");

      if (!token) {
        window.location.href = "/personal/login";
        return;
      }

      const res = await fetch("/api/personal/lonebesked", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (res.status === 401) {
        localStorage.removeItem("personal_auth_token");
        window.location.href = "/personal/login";
        return;
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönebesked.");
      }

      setEmployee(json.employee || null);
      setPayslips(json.payslips || []);
      setSummary(json.summary || {
        total: 0,
        sent: 0,
        paid: 0,
        totalGross: 0,
        totalTax: 0,
        totalNet: 0,
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("personal_auth_token");
    window.location.href = "/personal/login";
  }

  useEffect(() => {
    loadPayslips();
  }, []);

  const payslipTotal = useMemo(() => payslips.length, [payslips]);

  return (
    <main className="min-h-screen bg-[#f5f4f0]">
      <section className="bg-[#194C66] px-6 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b1e3dd]">
              Helsingbuss Personal
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Mina lönebesked
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100">
              {employee ? "Inloggad som " + employeeName(employee) : "Dina publicerade lönebesked visas här."}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-fit rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Logga ut
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Lönebesked" value={summary?.total || 0} />
          <SummaryCard label="Brutto" valueText={fmtMoney(summary?.totalGross || 0)} tone="blue" />
          <SummaryCard label="Skatt" valueText={fmtMoney(summary?.totalTax || 0)} tone="red" />
          <SummaryCard label="Netto" valueText={fmtMoney(summary?.totalNet || 0)} tone="green" />
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-[#194C66]">
              Publicerade lönebesked
            </h2>
            <p className="text-sm text-slate-500">
              Visar {payslipTotal} lönebesked
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-5 py-10 text-center text-slate-500">
                Laddar lönebesked...
              </div>
            ) : payslips.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-base font-bold text-[#194C66]">
                  Inga lönebesked att visa
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  När arbetsgivaren publicerar ett lönebesked visas det här.
                </p>
              </div>
            ) : (
              payslips.map((payslip) => (
                <a
                  key={payslip.id}
                  href={"/personal/lonebesked/" + encodeURIComponent(payslip.id)}
                  className="block px-5 py-5 transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-lg font-bold text-[#194C66]">
                        {payslip.run?.title || "Lönebesked"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Period: {fmtDate(payslip.run?.period_start)} – {fmtDate(payslip.run?.period_end)}
                        {" · "}
                        Utbetalning: {fmtDate(payslip.run?.payout_date)}
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm md:grid-cols-4 lg:min-w-[520px]">
                      <MiniStat label="Brutto" value={fmtMoney(payslip.gross_total)} />
                      <MiniStat label="Skatt" value={fmtMoney(payslip.preliminary_tax_amount)} tone="red" />
                      <MiniStat label="Netto" value={fmtMoney(payslip.net_pay || payslip.payout_amount)} tone="green" />
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Status
                        </div>
                        <span className={"mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(payslip.status)}>
                          {statusLabel(payslip.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  valueText,
  tone,
}: {
  label: string;
  value?: number;
  valueText?: string;
  tone?: "green" | "red" | "blue";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "red"
        ? "text-red-700 bg-red-50"
        : tone === "blue"
          ? "text-blue-700 bg-blue-50"
          : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-bold">{valueText || value || 0}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  const color = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-700" : "text-slate-900";

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={"mt-1 font-bold " + color}>{value}</div>
    </div>
  );
}
