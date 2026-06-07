import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type RunRow = {
  id?: string;
  title?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  payout_date?: string | null;
  status?: string | null;
};

type FormState = {
  pay_type: string;
  hours: string;
  hourly_rate: string;
  monthly_salary: string;
  vacation_percent: string;
  gross_base: string;
  vacation_pay: string;
  gross_total: string;
  preliminary_tax_percent: string;
  preliminary_tax_amount: string;
  net_pay: string;
  payout_amount: string;
  tax_deduction_mode: string;
  tax_notes: string;
  employer_fee_percent: string;
  employer_fee: string;
  total_cost: string;
  status: string;
  notes: string;
};

const emptyForm: FormState = {
  pay_type: "hourly",
  hours: "0",
  hourly_rate: "0",
  monthly_salary: "0",
  vacation_percent: "12",
  gross_base: "0",
  vacation_pay: "0",
  gross_total: "0",
  preliminary_tax_percent: "30",
  preliminary_tax_amount: "0",
  net_pay: "0",
  payout_amount: "0",
  tax_deduction_mode: "manual_percent",
  tax_notes: "",
  employer_fee_percent: "31.42",
  employer_fee: "0",
  total_cost: "0",
  status: "draft",
  notes: "",
};

function toText(value: any) {
  return value === null || value === undefined ? "" : String(value);
}

function toNumber(value: string) {
  const number = Number(String(value || "0").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function fmtMoney(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtNumber(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
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

function roleLabel(role?: string | null) {
  switch (role) {
    case "driver":
      return "Chaufför";
    case "traffic_manager":
      return "Trafikledare";
    case "booking_agent":
      return "Bokningsagent";
    case "admin":
      return "Administratör";
    case "employee":
      return "Anställd";
    default:
      return role || "Personal";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "draft":
      return "Utkast";
    case "approved":
      return "Godkänd";
    case "sent":
      return "Skickad";
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
    case "sent":
      return "bg-purple-100 text-purple-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "draft":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function LonLonebeskedDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [run, setRun] = useState<RunRow | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);

  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfSaving, setPdfSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function recalc(next: FormState, changedKey?: keyof FormState) {
    const hours = toNumber(next.hours);
    const hourlyRate = toNumber(next.hourly_rate);
    const monthlySalary = toNumber(next.monthly_salary);
    const vacationPercent = toNumber(next.vacation_percent);
    const employerPercent = toNumber(next.employer_fee_percent);

    const grossBase =
      next.pay_type === "monthly"
        ? monthlySalary
        : hours * hourlyRate;

    const vacationPay = grossBase * vacationPercent / 100;
    const grossTotal = grossBase + vacationPay;

    let preliminaryTaxPercent = toNumber(next.preliminary_tax_percent);
    let preliminaryTaxAmount = toNumber(next.preliminary_tax_amount);

    if (changedKey === "preliminary_tax_amount") {
      preliminaryTaxAmount = Math.max(0, Math.min(preliminaryTaxAmount, grossTotal));
      preliminaryTaxPercent = grossTotal > 0 ? preliminaryTaxAmount / grossTotal * 100 : 0;
    } else {
      preliminaryTaxAmount = grossTotal * preliminaryTaxPercent / 100;
    }

    const netPay = Math.max(0, grossTotal - preliminaryTaxAmount);
    const payoutAmount =
      changedKey === "payout_amount"
        ? toNumber(next.payout_amount)
        : netPay;

    const employerFee = grossTotal * employerPercent / 100;
    const totalCost = grossTotal + employerFee;

    return {
      ...next,
      gross_base: grossBase.toFixed(2),
      vacation_pay: vacationPay.toFixed(2),
      gross_total: grossTotal.toFixed(2),
      preliminary_tax_percent: preliminaryTaxPercent.toFixed(2),
      preliminary_tax_amount: preliminaryTaxAmount.toFixed(2),
      net_pay: netPay.toFixed(2),
      payout_amount: payoutAmount.toFixed(2),
      employer_fee: employerFee.toFixed(2),
      total_cost: totalCost.toFixed(2),
    };
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      const recalculationKeys = [
        "pay_type",
        "hours",
        "hourly_rate",
        "monthly_salary",
        "vacation_percent",
        "preliminary_tax_percent",
        "preliminary_tax_amount",
        "payout_amount",
        "employer_fee_percent",
      ];

      if (recalculationKeys.includes(String(key))) {
        return recalc(next, key);
      }

      return next;
    });
  }

  async function loadPayslip() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/lonebesked/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönebesked.");
      }

      const item = json.payslip || {};

      setRun(json.run || null);
      setEmployeeName(item.employee_name_snapshot || "Anställd");
      setEmployeeRole(item.employee_role_snapshot || "");
      setCreatedAt(item.created_at || "");
      setUpdatedAt(item.updated_at || "");

      setForm({
        pay_type: item.pay_type || "hourly",
        hours: toText(item.hours),
        hourly_rate: toText(item.hourly_rate),
        monthly_salary: toText(item.monthly_salary),
        vacation_percent: toText(item.vacation_percent),
        gross_base: toText(item.gross_base),
        vacation_pay: toText(item.vacation_pay),
        gross_total: toText(item.gross_total),
        preliminary_tax_percent: toText(item.preliminary_tax_percent),
        preliminary_tax_amount: toText(item.preliminary_tax_amount),
        net_pay: toText(item.net_pay),
        payout_amount: toText(item.payout_amount),
        tax_deduction_mode: item.tax_deduction_mode || "manual_percent",
        tax_notes: item.tax_notes || "",
        employer_fee_percent: toText(item.employer_fee_percent),
        employer_fee: toText(item.employer_fee),
        total_cost: toText(item.total_cost),
        status: item.status || "draft",
        notes: item.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function savePayslip(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/lonebesked/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara lönebesked.");
      }

      setMessage("Lönebeskedet sparades.");
      await loadPayslip();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara lönebesked.");
    } finally {
      setSaving(false);
    }
  }

  async function generatePdfFile() {
    try {
      setPdfSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/lonebesked/" + encodeURIComponent(id) + "/generate-pdf", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa PDF.");
      }

      setMessage("PDF skapades och sparades privat.");
      await loadPayslip();

      if (json.signedUrl) {
        window.open(json.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa PDF.");
    } finally {
      setPdfSaving(false);
    }
  }

  function openGeneratedPdf() {
    window.open("/api/admin/lon/lonebesked/" + encodeURIComponent(id) + "/pdf", "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    loadPayslip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={savePayslip} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Lönebesked" : employeeName}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {run?.title || "Lönekörning"} · {fmtDate(run?.period_start)} – {fmtDate(run?.period_end)}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/lon/lonebesked"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="button"
                  onClick={loadPayslip}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>

                <button
                  type="button"
                  onClick={generatePdfFile}
                  disabled={pdfSaving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pdfSaving ? "Skapar PDF..." : "Skapa PDF-fil"}
                </button>

                <button
                  type="button"
                  onClick={openGeneratedPdf}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Öppna PDF
                </button>

                <Link
                  href={"/admin/lon/lonebesked/" + encodeURIComponent(id) + "/print"}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  PDF / utskrift
                </Link>

                <Link
                  href={"/admin/lon/lonebesked/" + encodeURIComponent(id) + "/leverans"}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Leverans
                </Link>

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara lönebesked"}
                </button>
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                {error}
              </section>
            )}

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
                {message}
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Timmar" valueText={fmtNumber(form.hours)} />
              <SummaryCard label="Grundlön" valueText={fmtMoney(form.gross_base)} tone="blue" />
              <SummaryCard label="Semester" valueText={fmtMoney(form.vacation_pay)} tone="green" />
              <SummaryCard label="Brutto" valueText={fmtMoney(form.gross_total)} tone="green" />
              <SummaryCard label="Skatt" valueText={fmtMoney(form.preliminary_tax_amount)} tone="red" />
              <SummaryCard label="Nettolön" valueText={fmtMoney(form.net_pay || form.payout_amount)} tone="green" />
              <SummaryCard label="Total kostnad" valueText={fmtMoney(form.total_cost)} tone="amber" />
            </div>

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar lönebesked...
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[#194C66]">
                        Lönebesked
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {employeeName} · {roleLabel(employeeRole)}
                      </p>
                    </div>

                    <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + statusClass(form.status)}>
                      {statusLabel(form.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <SelectField
                      label="Lönetyp"
                      value={form.pay_type}
                      onChange={(value) => updateField("pay_type", value)}
                      options={[
                        ["hourly", "Timlön"],
                        ["monthly", "Månadslön"],
                      ]}
                    />

                    <Field label="Timmar" value={form.hours} onChange={(value) => updateField("hours", value)} />
                    <Field label="Timlön" value={form.hourly_rate} onChange={(value) => updateField("hourly_rate", value)} />
                    <Field label="Månadslön" value={form.monthly_salary} onChange={(value) => updateField("monthly_salary", value)} />
                    <Field label="Semester %" value={form.vacation_percent} onChange={(value) => updateField("vacation_percent", value)} />
                    <Field label="Grundlön" value={form.gross_base} onChange={(value) => updateField("gross_base", value)} />
                    <Field label="Semesterersättning" value={form.vacation_pay} onChange={(value) => updateField("vacation_pay", value)} />
                    <Field label="Brutto" value={form.gross_total} onChange={(value) => updateField("gross_total", value)} />
                    <Field label="Preliminär skatt %" value={form.preliminary_tax_percent} onChange={(value) => updateField("preliminary_tax_percent", value)} />
                    <Field label="Preliminär skatt kr" value={form.preliminary_tax_amount} onChange={(value) => updateField("preliminary_tax_amount", value)} />
                    <Field label="Nettolön" value={form.net_pay} onChange={(value) => updateField("net_pay", value)} />
                    <Field label="Utbetalningsbelopp" value={form.payout_amount} onChange={(value) => updateField("payout_amount", value)} />
                    <Field label="Arbetsgivaravgift %" value={form.employer_fee_percent} onChange={(value) => updateField("employer_fee_percent", value)} />
                    <Field label="Arbetsgivaravgift kr" value={form.employer_fee} onChange={(value) => updateField("employer_fee", value)} />
                    <Field label="Total kostnad" value={form.total_cost} onChange={(value) => updateField("total_cost", value)} />

                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => updateField("status", value)}
                      options={[
                        ["draft", "Utkast"],
                        ["approved", "Godkänd"],
                        ["sent", "Skickad"],
                        ["paid", "Betald"],
                        ["cancelled", "Avbruten"],
                      ]}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Skatt och nettolön
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <Field label="Skatteläge" value={form.tax_deduction_mode} onChange={(value) => updateField("tax_deduction_mode", value)} />
                    <Field label="Skatteanteckning" value={form.tax_notes} onChange={(value) => updateField("tax_notes", value)} />
                    <Field label="Utbetalningsbelopp" value={form.payout_amount} onChange={(value) => updateField("payout_amount", value)} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Anteckning
                  </h2>

                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={6}
                    placeholder="Intern anteckning om lönebeskedet..."
                    className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Systeminformation
                  </h2>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <InfoLine label="Skapad" value={createdAt ? new Date(createdAt).toLocaleString("sv-SE") : "—"} />
                    <InfoLine label="Senast uppdaterad" value={updatedAt ? new Date(updatedAt).toLocaleString("sv-SE") : "—"} />
                  </div>
                </section>
              </>
            )}
          </form>
        </main>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  valueText,
  tone,
}: {
  label: string;
  valueText: string;
  tone?: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50"
        : tone === "red"
          ? "text-red-700 bg-red-50"
          : tone === "blue"
            ? "text-blue-700 bg-blue-50"
            : tone === "slate"
              ? "text-slate-700 bg-slate-50"
              : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-bold">{valueText}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}
