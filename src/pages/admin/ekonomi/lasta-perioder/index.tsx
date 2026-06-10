import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function lastDayOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function monthName(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function previousMonthDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return String(value);
  }
}

const emptyForm = {
  period_name: "",
  start_date: firstDayOfMonth(),
  end_date: lastDayOfMonth(),
  lock_type: "month",
  reason: "",
  locked_by: "Admin",
};

export default function LastaPerioderPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [form, setForm] = useState<any>(emptyForm);

  const [includeUnlocked, setIncludeUnlocked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateForm(key: string, value: any) {
    setForm((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }

  function setCurrentMonth() {
    const date = new Date();

    setForm({
      ...emptyForm,
      period_name: "Låst " + monthName(date),
      start_date: firstDayOfMonth(date),
      end_date: lastDayOfMonth(date),
      lock_type: "month",
      reason: "Månaden är avstämd.",
    });
  }

  function setPreviousMonth() {
    const date = previousMonthDate();

    setForm({
      ...emptyForm,
      period_name: "Låst " + monthName(date),
      start_date: firstDayOfMonth(date),
      end_date: lastDayOfMonth(date),
      lock_type: "month",
      reason: "Föregående månad är avstämd.",
    });
  }

  async function loadPeriods() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (includeUnlocked) {
        params.set("include_unlocked", "true");
      }

      const res = await fetch("/api/admin/ekonomi/lasta-perioder?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta låsta perioder.");
      }

      setNeedsSetup(Boolean(json.needsSetup));
      setPeriods(json.periods || []);
      setSummary(json.summary || {});
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta låsta perioder.");
    } finally {
      setLoading(false);
    }
  }

  async function createPeriod(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/lasta-perioder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte låsa perioden.");
      }

      setMessage("Perioden är låst.");
      setForm(emptyForm);
      await loadPeriods();
    } catch (err: any) {
      setError(err?.message || "Kunde inte låsa perioden.");
    } finally {
      setSaving(false);
    }
  }

  async function unlockPeriod(period: any) {
    const ok = window.confirm(
      "Vill du låsa upp perioden?\n\n" +
        period.period_name +
        "\n" +
        period.start_date +
        " till " +
        period.end_date
    );

    if (!ok) return;

    try {
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/lasta-perioder", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: period.id,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte låsa upp perioden.");
      }

      setMessage("Perioden låstes upp.");
      await loadPeriods();
    } catch (err: any) {
      setError(err?.message || "Kunde inte låsa upp perioden.");
    }
  }

  useEffect(() => {
    loadPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Låsta perioder
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Lås månader eller datumintervall när ekonomin är avstämd, så gamla fakturor och transaktioner inte ändras av misstag.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadPeriods}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Uppdatera
                </button>

                <a
                  href="/admin/ekonomi/bokforingsunderlag"
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  Bokföringsunderlag
                </a>
              </div>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellen och låsningsfunktionen saknas. Kör SQL-koden nedan först.
              </section>
            )}

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 shadow-sm">
                {message}
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Aktiva låsningar" value={summary.activeCount || 0} tone="amber" />
              <SummaryCard label="Upplåsta historiska" value={summary.unlockedCount || 0} />
              <SummaryCard label="Dagens datum" value={today()} />
            </section>

            <form onSubmit={createPeriod} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">Lås ny period</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    När perioden är låst stoppas ändringar i kundfakturor, leverantörsfakturor och transaktioner som har datum inom perioden.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={setCurrentMonth}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Denna månad
                  </button>

                  <button
                    type="button"
                    onClick={setPreviousMonth}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Föregående månad
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
                  >
                    {saving ? "Låser..." : "Lås period"}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                <Field
                  label="Namn"
                  value={form.period_name}
                  onChange={(value) => updateForm("period_name", value)}
                  placeholder="Ex. Låst maj 2026"
                />

                <Field
                  label="Startdatum"
                  type="date"
                  value={form.start_date}
                  onChange={(value) => updateForm("start_date", value)}
                />

                <Field
                  label="Slutdatum"
                  type="date"
                  value={form.end_date}
                  onChange={(value) => updateForm("end_date", value)}
                />

                <SelectField
                  label="Typ"
                  value={form.lock_type}
                  onChange={(value) => updateForm("lock_type", value)}
                  options={[
                    ["month", "Månad"],
                    ["quarter", "Kvartal"],
                    ["year", "År"],
                    ["custom", "Egen period"],
                  ]}
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
                <Field
                  label="Orsak / anteckning"
                  value={form.reason}
                  onChange={(value) => updateForm("reason", value)}
                  placeholder="Ex. Perioden är avstämd med banken."
                />

                <Field
                  label="Låst av"
                  value={form.locked_by}
                  onChange={(value) => updateForm("locked_by", value)}
                />
              </div>
            </form>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Viktigt:</strong> Lås inte en period förrän du är klar med avstämning, betalningar och kontroll. När perioden är låst kommer databasen stoppa ändringar i ekonomitabeller med datum i perioden.
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#194C66]">Perioder</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Här visas dina låsta perioder.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={includeUnlocked}
                      onChange={(event) => setIncludeUnlocked(event.target.checked)}
                    />
                    Visa även upplåsta
                  </label>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Laddar låsta perioder...
                </div>
              ) : periods.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Inga låsta perioder finns ännu.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Namn</Th>
                        <Th>Start</Th>
                        <Th>Slut</Th>
                        <Th>Typ</Th>
                        <Th>Orsak</Th>
                        <Th>Låst av</Th>
                        <Th>Status</Th>
                        <Th>Åtgärd</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {periods.map((period) => (
                        <tr key={period.id} className="align-top transition hover:bg-slate-50">
                          <Td className="font-bold text-[#194C66]">{period.period_name}</Td>
                          <Td>{fmtDate(period.start_date)}</Td>
                          <Td>{fmtDate(period.end_date)}</Td>
                          <Td>{period.lock_type || "—"}</Td>
                          <Td>{period.reason || "—"}</Td>
                          <Td>{period.locked_by || "—"}</Td>
                          <Td>
                            <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (period.is_locked ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                              {period.is_locked ? "Låst" : "Upplåst"}
                            </span>
                          </Td>
                          <Td>
                            {period.is_locked ? (
                              <button
                                type="button"
                                onClick={() => unlockPeriod(period)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                              >
                                Lås upp
                              </button>
                            ) : (
                              "—"
                            )}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "amber";
}) {
  const cls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
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
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
