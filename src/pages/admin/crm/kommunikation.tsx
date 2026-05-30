import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type CommunicationRow = {
  id: string;
  communication_number?: string | null;
  contact_id?: string | null;
  agreement_id?: string | null;
  related_booking_number?: string | null;
  related_ticket_number?: string | null;
  channel?: string | null;
  direction?: string | null;
  status?: string | null;
  subject?: string | null;
  message?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  handled_by?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  completed_at?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  communications?: CommunicationRow[];
  summary?: {
    total: number;
    mail: number;
    sms: number;
    notes: number;
    pending: number;
  };
  error?: string;
};

type FormState = {
  channel: string;
  direction: string;
  status: string;
  subject: string;
  message: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  related_booking_number: string;
  related_ticket_number: string;
  handled_by: string;
  priority: string;
  tags: string;
};

const emptyForm: FormState = {
  channel: "note",
  direction: "internal",
  status: "done",
  subject: "",
  message: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  related_booking_number: "",
  related_ticket_number: "",
  handled_by: "Andreas Ekelöf",
  priority: "normal",
  tags: "",
};

function fmtDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function channelLabel(channel?: string | null) {
  switch (channel) {
    case "email":
      return "E-post";
    case "sms":
      return "SMS";
    case "phone":
      return "Samtal";
    case "note":
      return "Notering";
    case "agreement":
      return "Avtal";
    case "ticket":
      return "Biljett";
    case "reminder":
      return "Påminnelse";
    default:
      return channel || "Kommunikation";
  }
}

function directionLabel(direction?: string | null) {
  switch (direction) {
    case "inbound":
      return "Inkommande";
    case "outbound":
      return "Utgående";
    case "internal":
      return "Intern";
    default:
      return direction || "—";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "done":
      return "Klar";
    case "draft":
      return "Utkast";
    case "scheduled":
      return "Schemalagd";
    case "pending":
      return "Väntar";
    case "failed":
      return "Misslyckad";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "done":
      return "bg-emerald-100 text-emerald-700";
    case "scheduled":
      return "bg-blue-100 text-blue-700";
    case "pending":
    case "draft":
      return "bg-amber-100 text-amber-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function priorityClass(priority?: string | null) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";
    case "low":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-[#eef8fb] text-[#194C66]";
  }
}

export default function CrmKommunikationPage() {
  const [communications, setCommunications] = useState<CommunicationRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    mail: 0,
    sms: 0,
    notes: 0,
    pending: 0,
  });
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadCommunications() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (channel) params.set("channel", channel);
      if (status) params.set("status", status);

      const res = await fetch("/api/admin/crm/kommunikation?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta kommunikation.");
      }

      setCommunications(json.communications || []);
      setSummary(
        json.summary || {
          total: 0,
          mail: 0,
          sms: 0,
          notes: 0,
          pending: 0,
        }
      );
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createCommunication(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/crm/kommunikation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara kommunikation.");
      }

      setMessage("Kommunikationsposten sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadCommunications();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara kommunikation.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  useEffect(() => {
    loadCommunications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => communications.length, [communications]);

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
                  CRM
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Kommunikation
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här samlar du kommunikationslogg, samtal, e-post, SMS, interna noteringar, påminnelser och utskick.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny kommunikation"}
                </button>

                <button
                  type="button"
                  onClick={loadCommunications}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="E-post" value={summary?.mail || 0} tone="blue" />
              <SummaryCard label="SMS" value={summary?.sms || 0} tone="green" />
              <SummaryCard label="Noteringar" value={summary?.notes || 0} tone="amber" />
              <SummaryCard label="Väntar" value={summary?.pending || 0} tone="red" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Databastabellen för CRM-kommunikation saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Kör SQL-filen <strong>crm-kommunikation-table.sql</strong> i Supabase SQL Editor.
                  När tabellen finns kan kommunikationsloggar sparas och visas här.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createCommunication}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny kommunikationspost
                  </h2>
                  <p className="text-sm text-slate-500">
                    Lägg in samtal, e-post, SMS, notering, utskick eller påminnelse.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <SelectField
                    label="Typ"
                    value={form.channel}
                    onChange={(value) => updateField("channel", value)}
                    options={[
                      ["note", "Notering"],
                      ["email", "E-post"],
                      ["sms", "SMS"],
                      ["phone", "Samtal"],
                      ["agreement", "Avtal"],
                      ["ticket", "Biljett"],
                      ["reminder", "Påminnelse"],
                    ]}
                  />

                  <SelectField
                    label="Riktning"
                    value={form.direction}
                    onChange={(value) => updateField("direction", value)}
                    options={[
                      ["internal", "Intern"],
                      ["outbound", "Utgående"],
                      ["inbound", "Inkommande"],
                    ]}
                  />

                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(value) => updateField("status", value)}
                    options={[
                      ["done", "Klar"],
                      ["draft", "Utkast"],
                      ["scheduled", "Schemalagd"],
                      ["pending", "Väntar"],
                      ["failed", "Misslyckad"],
                    ]}
                  />

                  <Field label="Kontakt / kund" value={form.contact_name} onChange={(value) => updateField("contact_name", value)} />
                  <Field label="E-post" value={form.contact_email} onChange={(value) => updateField("contact_email", value)} />
                  <Field label="Telefon" value={form.contact_phone} onChange={(value) => updateField("contact_phone", value)} />

                  <Field label="Bokningsnummer" value={form.related_booking_number} onChange={(value) => updateField("related_booking_number", value)} />
                  <Field label="Biljettnummer" value={form.related_ticket_number} onChange={(value) => updateField("related_ticket_number", value)} />
                  <Field label="Handläggare" value={form.handled_by} onChange={(value) => updateField("handled_by", value)} />

                  <SelectField
                    label="Prioritet"
                    value={form.priority}
                    onChange={(value) => updateField("priority", value)}
                    options={[
                      ["low", "Låg"],
                      ["normal", "Normal"],
                      ["high", "Hög"],
                    ]}
                  />

                  <Field label="Taggar" value={form.tags} onChange={(value) => updateField("tags", value)} placeholder="Ex. avtal, biljett, uppföljning" />

                  <Field label="Ämne" value={form.subject} onChange={(value) => updateField("subject", value)} />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Meddelande / notering
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Avbryt
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara kommunikation"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadCommunications();
                    }}
                    placeholder="Sök kontakt, ämne, bokningsnummer, meddelande eller tagg..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Typ"
                  value={channel}
                  onChange={setChannel}
                  options={[
                    ["", "Alla"],
                    ["note", "Notering"],
                    ["email", "E-post"],
                    ["sms", "SMS"],
                    ["phone", "Samtal"],
                    ["agreement", "Avtal"],
                    ["ticket", "Biljett"],
                    ["reminder", "Påminnelse"],
                  ]}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["done", "Klara"],
                    ["draft", "Utkast"],
                    ["scheduled", "Schemalagda"],
                    ["pending", "Väntar"],
                    ["failed", "Misslyckade"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadCommunications}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>

              {(message || error) && (
                <div
                  className={
                    "mt-4 rounded-xl px-4 py-3 text-sm font-semibold " +
                    (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")
                  }
                >
                  {error || message}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Kommunikationslogg
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} poster
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Typ</Th>
                      <Th>Kontakt</Th>
                      <Th>Ämne</Th>
                      <Th>Meddelande</Th>
                      <Th>Status</Th>
                      <Th>Prioritet</Th>
                      <Th>Koppling</Th>
                      <Th>Skapad</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                          Laddar kommunikation...
                        </td>
                      </tr>
                    ) : communications.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga kommunikationsposter hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första posten med knappen Ny kommunikation.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      communications.map((item) => (
                        <tr key={item.id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {channelLabel(item.channel)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {directionLabel(item.direction)}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[190px] truncate font-semibold text-slate-900">
                              {item.contact_name || "—"}
                            </div>
                            <div className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                              {item.contact_email || item.contact_phone || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[220px] truncate font-semibold text-slate-900">
                              {item.subject || "—"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item.communication_number || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[280px] truncate text-slate-600">
                              {item.message || "—"}
                            </div>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                statusClass(item.status)
                              }
                            >
                              {statusLabel(item.status)}
                            </span>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                priorityClass(item.priority)
                              }
                            >
                              {item.priority === "high"
                                ? "Hög"
                                : item.priority === "low"
                                  ? "Låg"
                                  : "Normal"}
                            </span>
                          </Td>

                          <Td>
                            <div className="max-w-[190px] truncate font-semibold text-slate-900">
                              {item.related_booking_number || item.related_ticket_number || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {fmtDateTime(item.created_at)}
                            </div>
                            {item.handled_by && (
                              <div className="mt-1 text-xs text-slate-500">
                                {item.handled_by}
                              </div>
                            )}
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
  value: number;
  tone?: "green" | "amber" | "red" | "blue";
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
            : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
