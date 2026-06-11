import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function NotiserMallarPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [summary, setSummary] = useState<any>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.key === selectedKey) || selected;
  }, [templates, selectedKey, selected]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/notiser-mallar");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta notiser och mallar.");
      }

      const list = json.templates || [];

      setTemplates(list);
      setSummary(json.summary || {});
      setWarnings(json.warnings || []);

      if (!selectedKey && list[0]) {
        setSelectedKey(list[0].key);
        setSelected({ ...list[0] });
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta notiser och mallar.");
    } finally {
      setLoading(false);
    }
  }

  function chooseTemplate(key: string) {
    const template = templates.find((item) => item.key === key);

    setSelectedKey(key);
    setSelected(template ? { ...template } : null);
    setSaved("");
    setError("");
  }

  function updateField(field: string, value: any) {
    setSelected((current: any) => ({
      ...(current || {}),
      [field]: value,
    }));
  }

  async function saveTemplate() {
    if (!selected) return;

    try {
      setSaving(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/notiser-mallar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selected),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara mallen.");
      }

      setSaved("Mallen är sparad.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara mallen.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedKey) return;

    const template = templates.find((item) => item.key === selectedKey);
    if (template) setSelected({ ...template });
  }, [templates, selectedKey]);

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
                  System / inställningar · Kommunikation
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Notiser & mallar
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Hantera standardtexter för e-post, SMS och interna notiser.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Uppdatera
                </button>

                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={saving || !selected}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara mall"}
                </button>
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {saved && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 shadow-sm">
                {saved}
              </section>
            )}

            {warnings.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                <strong>Info:</strong> Kör SQL-koden för att kunna spara ändringar i mallarna. Standardmallarna visas ändå.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Mallar" value={summary.templates || templates.length || 0} />
              <SummaryCard label="Aktiva" value={summary.active || 0} tone="green" />
              <SummaryCard label="Sparade ändringar" value={summary.saved || 0} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-[#194C66]">Mallar</h2>

                {loading ? (
                  <div className="mt-5 text-sm text-slate-500">Laddar mallar...</div>
                ) : (
                  <div className="mt-5 space-y-2">
                    {templates.map((template) => (
                      <button
                        key={template.key}
                        type="button"
                        onClick={() => chooseTemplate(template.key)}
                        className={
                          selectedKey === template.key
                            ? "w-full rounded-xl border border-[#194C66] bg-[#194C66] px-4 py-3 text-left text-sm text-white"
                            : "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        }
                      >
                        <div className="font-bold">{template.name}</div>
                        <div className={selectedKey === template.key ? "mt-1 text-xs text-white/80" : "mt-1 text-xs text-slate-500"}>
                          {template.category} · {template.channel} · {template.source === "sparad" ? "Sparad" : "Standard"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {!selectedTemplate ? (
                  <div className="text-sm text-slate-500">Välj en mall.</div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 xl:grid-cols-3">
                      <Field
                        label="Namn"
                        value={selected?.name || ""}
                        onChange={(value) => updateField("name", value)}
                      />

                      <Field
                        label="Kategori"
                        value={selected?.category || ""}
                        onChange={(value) => updateField("category", value)}
                      />

                      <SelectField
                        label="Kanal"
                        value={selected?.channel || "email"}
                        onChange={(value) => updateField("channel", value)}
                        options={[
                          ["email", "E-post"],
                          ["sms", "SMS"],
                          ["system", "Intern notis"],
                        ]}
                      />
                    </div>

                    <Field
                      label="Ämnesrad"
                      value={selected?.subject || ""}
                      onChange={(value) => updateField("subject", value)}
                    />

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Meddelande
                      </label>

                      <textarea
                        value={selected?.body || ""}
                        onChange={(event) => updateField("body", event.target.value)}
                        rows={14}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Variabler
                      </label>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {(selected?.variables || []).map((variable: string) => (
                          <span key={variable} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {"{{" + variable + "}}"}
                          </span>
                        ))}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        Variablerna byts senare ut automatiskt när mejl, SMS eller notiser skickas från systemet.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateField("is_active", selected?.is_active === false)}
                      className={
                        selected?.is_active === false
                          ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700"
                          : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
                      }
                    >
                      {selected?.is_active === false ? "Inaktiv mall" : "Aktiv mall"}
                    </button>
                  </div>
                )}
              </div>
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
  tone?: "green";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
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
        {options.map(([key, optionLabel]) => (
          <option key={key} value={key}>{optionLabel}</option>
        ))}
      </select>
    </div>
  );
}
