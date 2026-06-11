import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const emptyForm = {
  id: "",
  name: "",
  endpoint_url: "",
  method: "POST",
  event_types_text: "",
  status: "active",
  secret_header_name: "",
  masked_secret: "",
  note: "",
};

const commonEvents = [
  "booking.created",
  "booking.updated",
  "invoice.created",
  "invoice.paid",
  "ticket.sent",
  "partner.requested",
  "driver.order_created",
  "payment.completed",
  "customer.created",
  "system.alert",
];

export default function WebhookarPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const filteredWebhooks = useMemo(() => {
    const q = search.trim().toLowerCase();

    return webhooks.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      const text = [
        item.name,
        item.endpoint_url,
        item.method,
        item.status,
        item.note,
        ...(item.event_types || []),
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!q || text.includes(q));
    });
  }, [webhooks, search, statusFilter]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/webhookar");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta webhookar.");
      }

      setWebhooks(json.webhooks || []);
      setSummary(json.summary || {});
      setWarnings(json.warnings || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta webhookar.");
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

  function toggleEvent(eventKey: string) {
    const current = String(form.event_types_text || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const next = current.includes(eventKey)
      ? current.filter((item) => item !== eventKey)
      : [...current, eventKey];

    updateField("event_types_text", next.join(", "));
  }

  function editWebhook(item: any) {
    setForm({
      id: item.id || "",
      name: item.name || "",
      endpoint_url: item.endpoint_url || "",
      method: item.method || "POST",
      event_types_text: Array.isArray(item.event_types) ? item.event_types.join(", ") : "",
      status: item.status || "active",
      secret_header_name: item.secret_header_name || "",
      masked_secret: item.masked_secret || "",
      note: item.note || "",
    });

    setSaved("");
    setError("");
  }

  function resetForm() {
    setForm(emptyForm);
    setSaved("");
    setError("");
  }

  async function saveWebhook() {
    try {
      setSaving(true);
      setError("");
      setSaved("");

      const eventTypes = String(form.event_types_text || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/system/webhookar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          event_types: eventTypes,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara webhook.");
      }

      setSaved("Webhooken är sparad.");
      setForm(emptyForm);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara webhook.");
    } finally {
      setSaving(false);
    }
  }

  async function testSavedWebhook(item: any) {
    try {
      setTestingId(item.id);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/webhookar/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte testa webhook.");
      }

      setSaved(json.result?.message || "Webhook-testet är skickat.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte testa webhook.");
    } finally {
      setTestingId("");
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
                  Webhookar
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Skapa externa mottagare för systemhändelser. Används senare för automationer, integrationer och notifieringar.
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
                <strong>Info:</strong> Kör SQL-koden för att kunna spara webhookar.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Totalt" value={summary.total || 0} />
              <SummaryCard label="Aktiva" value={summary.active || 0} tone="green" />
              <SummaryCard label="Inaktiva" value={summary.inactive || 0} />
              <SummaryCard label="Planerade" value={summary.planned || 0} tone="amber" />
              <SummaryCard label="Fel" value={summary.error || 0} tone="red" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_440px]">
              <div className="space-y-6">
                <Card title="Sparade webhookar">
                  <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_220px]">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Sök webhook..."
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
                      <option value="planned">Planerad</option>
                      <option value="error">Fel</option>
                    </select>
                  </div>

                  {loading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      Laddar webhookar...
                    </div>
                  ) : filteredWebhooks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      Inga webhookar sparade ännu.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredWebhooks.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-lg font-black text-[#194C66]">{item.name}</div>
                                <StatusBadge status={item.status} />
                              </div>

                              <div className="mt-2 break-all text-sm font-semibold text-slate-700">
                                {item.method} · {item.endpoint_url}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {(item.event_types || []).map((eventKey: string) => (
                                  <span key={eventKey} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                    {eventKey}
                                  </span>
                                ))}
                              </div>

                              {item.last_test_at && (
                                <div className="mt-3 text-xs leading-5 text-slate-500">
                                  Senaste test: {formatDate(item.last_test_at)} · {item.last_test_status || "—"} · {item.last_test_message || "—"}
                                </div>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => editWebhook(item)}
                                className="rounded-lg bg-[#194C66] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#12384c]"
                              >
                                Redigera
                              </button>

                              <button
                                type="button"
                                onClick={() => testSavedWebhook(item)}
                                disabled={testingId === item.id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50 disabled:opacity-60"
                              >
                                {testingId === item.id ? "Testar..." : "Testa"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Vanliga händelser">
                  <div className="flex flex-wrap gap-2">
                    {commonEvents.map((eventKey) => (
                      <button
                        key={eventKey}
                        type="button"
                        onClick={() => toggleEvent(eventKey)}
                        className={
                          String(form.event_types_text || "").includes(eventKey)
                            ? "rounded-full bg-[#194C66] px-3 py-2 text-xs font-bold text-white"
                            : "rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        }
                      >
                        {eventKey}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card title={form.id ? "Redigera webhook" : "Ny webhook"}>
                  <div className="space-y-4">
                    <Field label="Namn" value={form.name || ""} onChange={(value) => updateField("name", value)} />
                    <Field label="Webhook URL" value={form.endpoint_url || ""} onChange={(value) => updateField("endpoint_url", value)} />

                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField
                        label="Metod"
                        value={form.method || "POST"}
                        onChange={(value) => updateField("method", value)}
                        options={[
                          ["POST", "POST"],
                          ["PUT", "PUT"],
                          ["PATCH", "PATCH"],
                        ]}
                      />

                      <SelectField
                        label="Status"
                        value={form.status || "active"}
                        onChange={(value) => updateField("status", value)}
                        options={[
                          ["active", "Aktiv"],
                          ["inactive", "Inaktiv"],
                          ["planned", "Planerad"],
                          ["error", "Fel"],
                        ]}
                      />
                    </div>

                    <TextArea
                      label="Händelser, separera med komma"
                      value={form.event_types_text || ""}
                      onChange={(value) => updateField("event_types_text", value)}
                      rows={4}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Secret header, valfritt" value={form.secret_header_name || ""} onChange={(value) => updateField("secret_header_name", value)} />
                      <Field label="Maskerad secret, valfritt" value={form.masked_secret || ""} onChange={(value) => updateField("masked_secret", value)} />
                    </div>

                    <TextArea label="Anteckning" value={form.note || ""} onChange={(value) => updateField("note", value)} rows={4} />

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={saveWebhook}
                        disabled={saving || !form.name || !form.endpoint_url}
                        className="flex-1 rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
                      >
                        {saving ? "Sparar..." : "Spara webhook"}
                      </button>

                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                      >
                        Rensa
                      </button>
                    </div>
                  </div>
                </Card>

                <Card title="Tips">
                  <div className="space-y-3 text-sm leading-6 text-slate-600">
                    <p>
                      Använd webhookar när ett annat system ska få information automatiskt från portalen.
                    </p>
                    <p>
                      Exempel: skicka händelse till Make/Zapier, egen server, CRM eller ekonomisystem.
                    </p>
                    <p>
                      Spara inte hela hemligheter öppet. Lägg bara maskerat värde här och riktiga nycklar i miljövariabler senare.
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

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("sv-SE");
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "planned"
        ? "bg-amber-100 text-amber-700"
        : status === "inactive"
          ? "bg-slate-100 text-slate-700"
          : "bg-red-100 text-red-700";

  const label =
    status === "active"
      ? "Aktiv"
      : status === "planned"
        ? "Planerad"
        : status === "inactive"
          ? "Inaktiv"
          : "Fel";

  return <span className={"whitespace-nowrap rounded-full px-3 py-1 text-xs font-black " + cls}>{label}</span>;
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "amber" | "red";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
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
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
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
