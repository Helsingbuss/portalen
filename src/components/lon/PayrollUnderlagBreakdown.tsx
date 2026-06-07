function n(value: any) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasValue(value: any) {
  return Math.abs(n(value)) > 0.009;
}

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtNumber(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("sv-SE");
  } catch {
    return value;
  }
}

export default function PayrollUnderlagBreakdown({ payslip }: { payslip: any }) {
  const rows = [
    {
      label: "Frånvaroavdrag",
      description: hasValue(payslip?.absence_hours)
        ? fmtNumber(payslip.absence_hours) + " frånvarotimmar"
        : "Godkänd frånvaro som påverkar lön",
      value: -Math.abs(n(payslip?.absence_deduction)),
      show: hasValue(payslip?.absence_deduction),
      tone: "red",
    },
    {
      label: "OB / tillägg",
      description: "Godkända OB- och tilläggsposter",
      value: n(payslip?.ob_allowance_amount),
      show: hasValue(payslip?.ob_allowance_amount),
      tone: "green",
    },
    {
      label: "Skattepliktigt traktamente",
      description: "Traktamente som räknas in i bruttolön",
      value: n(payslip?.per_diem_taxable_amount),
      show: hasValue(payslip?.per_diem_taxable_amount),
      tone: "green",
    },
    {
      label: "Skattefritt traktamente",
      description: "Skattefritt belopp som läggs på utbetalningen",
      value: n(payslip?.per_diem_tax_free_amount),
      show: hasValue(payslip?.per_diem_tax_free_amount),
      tone: "blue",
    },
    {
      label: "Bonus / provision",
      description: "Godkända bonus- och provisionsposter",
      value: n(payslip?.bonus_amount),
      show: hasValue(payslip?.bonus_amount),
      tone: "green",
    },
  ].filter((row) => row.show);

  const hasNotes = Boolean(String(payslip?.payroll_adjustment_notes || "").trim());
  const hasSyncedAt = Boolean(payslip?.payroll_underlag_synced_at);

  if (rows.length === 0 && !hasNotes && !hasSyncedAt) {
    return null;
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:shadow-none">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#194C66]">
            Löneunderlag
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Här visas poster som har kopplats in från frånvaro, OB, traktamente och bonus/provision.
          </p>
        </div>

        {hasSyncedAt && (
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Kopplat: {fmtDateTime(payslip.payroll_underlag_synced_at)}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="font-semibold text-slate-900">{row.label}</div>
                <div className="mt-1 text-xs text-slate-500">{row.description}</div>
              </div>

              <div
                className={
                  "text-right font-bold " +
                  (row.tone === "red"
                    ? "text-red-700"
                    : row.tone === "blue"
                      ? "text-blue-700"
                      : "text-emerald-700")
                }
              >
                {fmtMoney(row.value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasNotes && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <div className="font-bold text-[#194C66]">Anteckning från underlag</div>
          <p className="mt-1">{payslip.payroll_adjustment_notes}</p>
        </div>
      )}
    </section>
  );
}
