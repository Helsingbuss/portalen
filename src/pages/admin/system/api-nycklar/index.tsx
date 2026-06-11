import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const emptyForm = {
  name: "",
  provider: "",
  key_type: "env",
  env_key_name: "",
  masked_value: "",
  status: "active",
  is_required: false,
  note: "",
};

export default function ApiNycklarPage() {
  const [envChecks, setEnvChecks] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const filteredSavedKeys = useMemo(() => {
    const q = search.trim().toLowerCase();

    return apiKeys.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      const text = [
        item.name,
        item.provider,
        item.key_type,
        item.env_key_name,
        item.status,
        item.note,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!q || text.includes(q));
    });
  }, [apiKeys, search, statusFilter]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/api-nycklar");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta API-nycklar.");
      }

      setEnvChecks(json.envChecks || []);
      setApiKeys(json.apiKeys || []);
      setSummary(json.summary || {});
      setWarnings(json.warnings || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta API-nycklar.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: string, value: any) {
    setForm((current: any) => ({
      ...(current || {}),
      [field]: value,
    }));
  }

  function useEnvAsForm(item: any, keyName?: string) {
    const firstKey = keyName || item.keys?.find((key: any) => key.exists)?.key || item.env_keys?.[0] || "";

    setForm({
      name: item.name || "",
      provider: item.provider || "",
      key_type: "env",
      env_key_name: firstKey,
      masked_value: item.keys?.find((key: any) => key.key === firstKey)?.preview || "",
      status: item.exists ? "active" : item.required ? "missing" : "planned",
      is_required: item.required === true,
      note: item.description || "",
    });

    setSaved("");
    setError("");
  }

  function editSavedKey(item: any) {
    setForm({
      name: item.name || "",
      provider: item.provider || "",
      key_type: item.key_type || "env",
      env_key_name: item.env_key_name || "",
      masked_value: item.masked_value || "",
      status: item.status || "active",
      is_required: item.is_required === true,
      note: item.note || "",
    });

    setSaved("");
    setError("");
  }

  async function saveApiKey() {
    try {
      setSaving(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/api-nycklar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara API-nyckelposten.");
      }

      setSaved("API-nyckelposten är sparad.");
      setForm(emptyForm);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara API-nyckelposten.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
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
                  System / inställningar · API & utvecklare
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  API-nycklar
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Kontrollera vilka API-nycklar som finns i miljön och dokumentera externa integrationer utan att visa hemliga nycklar öppet.
                </p>
              </div>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
              >
                Uppdatera
              </button>
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
                <strong>Info:</strong> Kör SQL-koden för att kunna spara egna API-nyckelposter. Miljöstatusen visas ändå.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Miljönycklar" value={summary.envTotal || 0} />
              <SummaryCard label="Finns" value={summary.envActive || 0} tone="green" />
              <SummaryCard label="Saknas" value={summary.envMissing || 0} tone="red" />
              <SummaryCard label="Sparade poster" value={summary.savedKeys || 0} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <div className="space-y-6">
                <Card title="Miljövariabler">
                  {loading ? (
                    <div className="text-sm text-slate-500">Laddar API-nycklar...</div>
                  ) : (
                    <div className="space-y-3">
                      {envChecks.map((item) => (
                        <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="font-bold text-[#194C66]">{item.name}</div>
                              <div className="mt-1 text-sm leading-6 text-slate-600">{item.description}</div>
                              <div className="mt-2 text-xs font-semibold text-slate-500">{item.provider}</div>
                            </div>

                            <StatusBadge status={item.status} />
                          </div>

                          <div className="mt-4 grid gap-2 md:grid-cols-2">
                            {(item.keys || []).map((key: any) => (
                              <button
                                key={key.key}
                                type="button"
                                onClick={() => useEnvAsForm(item, key.key)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:bg-slate-50"
                              >
                                <div className="font-bold text-slate-700">{key.key}</div>
                                <div className={key.exists ? "mt-1 font-semibold text-emerald-700" : "mt-1 font-semibold text-red-700"}>
                                  {key.exists ? key.preview || "Finns" : "Saknas"}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Sparade API-nyckelposter">
                  <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_220px]">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Sök nyckel, leverantör eller anteckning..."
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                    />

                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                    >
                      <option value="all">Alla statusar</option>
                      <option value="active">Aktiv</option>
                      <option value="inactive">Inaktiv</option>
                      <option value="missing">Saknas</option>
                      <option value="planned">Planerad</option>
                    </select>
                  </div>

                  {filteredSavedKeys.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      Inga sparade API-nyckelposter ännu.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <Th>Namn</Th>
                            <Th>Leverantör</Th>
                            <Th>Env-nyckel</Th>
                            <Th>Status</Th>
                            <Th>Anteckning</Th>
                            <Th>Åtgärd</Th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredSavedKeys.map((item) => (
                            <tr key={item.id || item.name} className="align-top transition hover:bg-slate-50">
                              <Td className="font-bold text-[#194C66]">{item.name}</Td>
                              <Td>{item.provider || "—"}</Td>
                              <Td>{item.env_key_name || "—"}</Td>
                              <Td><StatusBadge status={item.status} /></Td>
                              <Td>{item.note || "—"}</Td>
                              <Td>
                                <button
                                  type="button"
                                  onClick={() => editSavedKey(item)}
                                  className="rounded-lg bg-[#194C66] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#12384c]"
                                >
                                  Redigera
                                </button>
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>

              <div className="space-y-6">
                <Card title="Lägg till / redigera post">
                  <div className="space-y-4">
                    <Field label="Namn" value={form.name || ""} onChange={(value) => updateField("name", value)} />
                    <Field label="Leverantör" value={form.provider || ""} onChange={(value) => updateField("provider", value)} />
                    <Field label="Env-nyckel" value={form.env_key_name || ""} onChange={(value) => updateField("env_key_name", value)} />
                    <Field label="Maskerat värde" value={form.masked_value || ""} onChange={(value) => updateField("masked_value", value)} />

                    <SelectField
                      label="Typ"
                      value={form.key_type || "env"}
                      onChange={(value) => updateField("key_type", value)}
                      options={[
                        ["env", "Miljövariabel"],
                        ["external", "Extern portal"],
                        ["internal", "Intern nyckel"],
                      ]}
                    />

                    <SelectField
                      label="Status"
                      value={form.status || "active"}
                      onChange={(value) => updateField("status", value)}
                      options={[
                        ["active", "Aktiv"],
                        ["inactive", "Inaktiv"],
                        ["missing", "Saknas"],
                        ["planned", "Planerad"],
                      ]}
                    />

                    <button
                      type="button"
                      onClick={() => updateField("is_required", !form.is_required)}
                      className={
                        form.is_required
                          ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-700"
                          : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-600"
                      }
                    >
                      {form.is_required ? "✓ Krävs för drift" : "Valfri / ej kritisk"}
                    </button>

                    <TextArea label="Anteckning" value={form.note || ""} onChange={(value) => updateField("note", value)} />

                    <button
                      type="button"
                      onClick={saveApiKey}
                      disabled={saving || !form.name}
                      className="w-full rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
                    >
                      {saving ? "Sparar..." : "Spara API-post"}
                    </button>
                  </div>
                </Card>

                <Card title="Viktigt om säkerhet">
                  <div className="space-y-3 text-sm leading-6 text-slate-600">
                    <p>
                      Spara inte hela hemliga API-nycklar i portalen. Lägg riktiga nycklar i <strong>.env.local</strong>.
                    </p>
                    <p>
                      Här sparar vi bara status, namn, maskerat värde och anteckningar så du får kontroll.
                    </p>
                    <p>
                      Efter ändring i <strong>.env.local</strong> behöver du starta om <strong>npm run dev</strong>.
                    </p>
                  </div>
                </Card>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active" || status === "ok"
      ? "bg-emerald-100 text-emerald-700"
      : status === "optional" || status === "planned"
        ? "bg-amber-100 text-amber-700"
        : status === "inactive"
          ? "bg-slate-100 text-slate-700"
          : "bg-red-100 text-red-700";

  const label =
    status === "active" || status === "ok"
      ? "Aktiv"
      : status === "optional"
        ? "Valfri"
        : status === "planned"
          ? "Planerad"
          : status === "inactive"
            ? "Inaktiv"
            : "Saknas";

  return <span className={"whitespace-nowrap rounded-full px-3 py-1 text-xs font-black " + cls}>{label}</span>;
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "red";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
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

function TextArea({
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

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
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

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
