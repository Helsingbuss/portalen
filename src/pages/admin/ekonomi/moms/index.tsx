import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type VatRate = {
  id?: string;
  rate_code: string;
  label: string;
  vat_percent: number | string;
  sales_account: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  display_order: number | string;
};

type VatSettings = Record<string, any>;

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10";

function fmtPercent(value: any) {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0)) + " %";
}

function defaultRateTemplate(): VatRate {
  return {
    rate_code: "vat_custom_" + Date.now(),
    label: "Ny momssats",
    vat_percent: 0,
    sales_account: "",
    description: "",
    is_default: false,
    is_active: true,
    display_order: 100,
  };
}

export default function EkonomiMomsPage() {
  const [settings, setSettings] = useState<VatSettings>({});
  const [rates, setRates] = useState<VatRate[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeRates = useMemo(
    () => rates.filter((row) => row.is_active !== false),
    [rates]
  );

  const defaultRate = useMemo(
    () => activeRates.find((row) => row.is_default) || activeRates[0] || null,
    [activeRates]
  );

  function updateSetting(key: string, value: any) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateRate(index: number, key: keyof VatRate, value: any) {
    setRates((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        return {
          ...row,
          [key]: value,
        };
      })
    );
  }

  function setDefaultRate(index: number) {
    setRates((prev) =>
      prev.map((row, rowIndex) => ({
        ...row,
        is_default: rowIndex === index,
      }))
    );
  }

  function addRate() {
    setRates((prev) => [...prev, defaultRateTemplate()]);
  }

  async function loadVatSettings() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/moms");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta momsinställningar.");
      }

      setNeedsSetup(Boolean(json.needsSetup));
      setSettings(json.settings || json.defaults?.settings || {});
      setRates(
        json.rates?.length
          ? json.rates
          : json.defaults?.rates || []
      );
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta momsinställningar.");
    } finally {
      setLoading(false);
    }
  }

  async function saveVatSettings(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/moms", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings,
          rates,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara momsinställningar.");
      }

      setSettings(json.settings || settings);
      setRates(json.rates || rates);
      setNeedsSetup(false);
      setMessage("Momsinställningarna sparades.");
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara momsinställningar.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadVatSettings();
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveVatSettings} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Moms
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Hantera momssatser, momskonton, momsredovisning och skattekonto. Här skiljer vi på riktiga bankkonton och bokföringskonton.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadVatSettings}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara moms"}
                </button>
              </div>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellen <strong>company_vat_rates</strong> eller <strong>company_finance_settings</strong> saknas. Kör SQL-koden för Ekonomi → Moms först.
              </section>
            )}

            {(message || error) && (
              <section
                className={
                  "rounded-2xl border p-5 text-sm font-semibold shadow-sm " +
                  (error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700")
                }
              >
                {error || message}
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Aktiva momssatser" value={activeRates.length} />
              <SummaryCard label="Standardmoms" value={defaultRate ? fmtPercent(defaultRate.vat_percent) : "Saknas"} />
              <SummaryCard label="Ingående moms" value={settings.accounting_vat_input_account || "2641"} />
              <SummaryCard label="Momsredovisning" value={settings.accounting_vat_report_account || "2650"} />
            </div>

            <Section title="Grundinställningar">
              <div className="grid gap-4 lg:grid-cols-4">
                <SelectField
                  label="Momsperiod"
                  value={settings.vat_period || "quarterly"}
                  onChange={(value) => updateSetting("vat_period", value)}
                  options={[
                    ["monthly", "Månadsvis"],
                    ["quarterly", "Kvartalsvis"],
                    ["yearly", "Årsvis"],
                  ]}
                />

                <Field
                  label="Standardmoms %"
                  value={settings.standard_vat_percent ?? 25}
                  onChange={(value) => updateSetting("standard_vat_percent", value)}
                />

                <Field
                  label="Skattekonto hos Skatteverket"
                  value={settings.tax_account}
                  onChange={(value) => updateSetting("tax_account", value)}
                />

                <Field
                  label="Bokföringskonto skattekonto"
                  value={settings.accounting_tax_account || "1630"}
                  onChange={(value) => updateSetting("accounting_tax_account", value)}
                />

                <Field
                  label="Ingående moms"
                  value={settings.accounting_vat_input_account || "2641"}
                  onChange={(value) => updateSetting("accounting_vat_input_account", value)}
                />

                <Field
                  label="Momsredovisning"
                  value={settings.accounting_vat_report_account || "2650"}
                  onChange={(value) => updateSetting("accounting_vat_report_account", value)}
                />
              </div>
            </Section>

            <Section title="Momssatser och försäljningskonton">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Namn</Th>
                      <Th>Momssats</Th>
                      <Th>Utgående momskonto</Th>
                      <Th>Beskrivning</Th>
                      <Th>Standard</Th>
                      <Th>Aktiv</Th>
                      <Th>Sortering</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rates.map((rate, index) => (
                      <tr key={rate.rate_code || index} className="align-top">
                        <Td>
                          <input
                            value={rate.label || ""}
                            onChange={(event) => updateRate(index, "label", event.target.value)}
                            className={fieldClass}
                          />
                        </Td>

                        <Td>
                          <input
                            value={rate.vat_percent ?? ""}
                            onChange={(event) => updateRate(index, "vat_percent", event.target.value)}
                            className={fieldClass}
                          />
                        </Td>

                        <Td>
                          <input
                            value={rate.sales_account || ""}
                            onChange={(event) => updateRate(index, "sales_account", event.target.value)}
                            placeholder="Ex. 2611"
                            className={fieldClass}
                          />
                        </Td>

                        <Td>
                          <textarea
                            value={rate.description || ""}
                            onChange={(event) => updateRate(index, "description", event.target.value)}
                            rows={3}
                            className={fieldClass}
                          />
                        </Td>

                        <Td>
                          <button
                            type="button"
                            onClick={() => setDefaultRate(index)}
                            className={
                              "rounded-xl px-4 py-3 text-sm font-semibold " +
                              (rate.is_default
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600")
                            }
                          >
                            {rate.is_default ? "Standard" : "Välj"}
                          </button>
                        </Td>

                        <Td>
                          <select
                            value={rate.is_active ? "true" : "false"}
                            onChange={(event) => updateRate(index, "is_active", event.target.value === "true")}
                            className={fieldClass}
                          >
                            <option value="true">Ja</option>
                            <option value="false">Nej</option>
                          </select>
                        </Td>

                        <Td>
                          <input
                            value={rate.display_order ?? 100}
                            onChange={(event) => updateRate(index, "display_order", event.target.value)}
                            className={fieldClass}
                          />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addRate}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                >
                  Lägg till momssats
                </button>
              </div>
            </Section>

            <Section title="Rekommenderade konton">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoBox label="25 % moms" value="2611 – Utgående moms 25 %" />
                <InfoBox label="12 % moms" value="2621 – Utgående moms 12 %" />
                <InfoBox label="6 % moms" value="2631 – Utgående moms 6 %" />
                <InfoBox label="Ingående moms" value="2641 – Ingående moms" />
                <InfoBox label="Momsredovisning" value="2650 – Redovisningskonto moms" />
                <InfoBox label="Skattekonto" value="1630 – Skattekonto" />
              </div>
            </Section>

            <Section title="Anteckningar">
              <Textarea
                label="Intern anteckning"
                value={settings.notes}
                onChange={(value) => updateSetting("notes", value)}
              />
            </Section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
              >
                {saving ? "Sparar..." : "Spara momsinställningar"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 truncate text-2xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-bold text-[#194C66]">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={fieldClass}
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
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
