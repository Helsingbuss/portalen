import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

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
  scheduled_at: string;
  sent_at: string;
  completed_at: string;
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
  handled_by: "",
  scheduled_at: "",
  sent_at: "",
  completed_at: "",
  priority: "normal",
  tags: "",
};

function toDateTimeInput(value?: string | null) {
  if (!value) return "";

  try {
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
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

function priorityLabel(priority?: string | null) {
  switch (priority) {
    case "high":
      return "Hög";
    case "low":
      return "Låg";
    default:
      return "Normal";
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

export default function CrmKommunikationDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [communicationNumber, setCommunicationNumber] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadCommunication() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/crm/kommunikation/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta kommunikationsposten.");
      }

      const item = json.communication || {};

      setCommunicationNumber(item.communication_number || "");
      setCreatedAt(item.created_at || "");

      setForm({
        channel: item.channel || "note",
        direction: item.direction || "internal",
        status: item.status || "done",
        subject: item.subject || "",
        message: item.message || "",
        contact_name: item.contact_name || "",
        contact_email: item.contact_email || "",
        contact_phone: item.contact_phone || "",
        related_booking_number: item.related_booking_number || "",
        related_ticket_number: item.related_ticket_number || "",
        handled_by: item.handled_by || "",
        scheduled_at: toDateTimeInput(item.scheduled_at),
        sent_at: toDateTimeInput(item.sent_at),
        completed_at: toDateTimeInput(item.completed_at),
        priority: item.priority || "normal",
        tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCommunication(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessageText("");

      const res = await fetch("/api/admin/crm/kommunikation/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara kommunikationsposten.");
      }

      setMessageText("Kommunikationsposten sparades.");
      await loadCommunication();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara kommunikationsposten.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadCommunication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
                  {loading ? "Kommunikation" : form.subject || channelLabel(form.channel)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {communicationNumber || "Visa och redigera kommunikationspost."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/crm/kommunikation"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="communication-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara kommunikation"}
                </button>
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                {error}
              </section>
            )}

            {messageText && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
                {messageText}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar kommunikationspost...
              </section>
            ) : (
              <form id="communication-edit-form" onSubmit={saveCommunication} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {communicationNumber || "Kommunikation"}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {form.subject || channelLabel(form.channel)}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {directionLabel(form.direction)}
                        {createdAt ? " · Skapad " + new Date(createdAt).toLocaleString("sv-SE") : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          statusClass(form.status)
                        }
                      >
                        {statusLabel(form.status)}
                      </span>

                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          priorityClass(form.priority)
                        }
                      >
                        {priorityLabel(form.priority)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Grunduppgifter
                  </h2>

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

                    <Field
                      label="Handläggare"
                      value={form.handled_by}
                      onChange={(value) => updateField("handled_by", value)}
                    />

                    <Field
                      label="Taggar"
                      value={form.tags}
                      onChange={(value) => updateField("tags", value)}
                      placeholder="Ex. avtal, biljett, uppföljning"
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Kontakt & koppling
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <Field label="Kontakt / kund" value={form.contact_name} onChange={(value) => updateField("contact_name", value)} />
                    <Field label="E-post" value={form.contact_email} onChange={(value) => updateField("contact_email", value)} />
                    <Field label="Telefon" value={form.contact_phone} onChange={(value) => updateField("contact_phone", value)} />
                    <Field label="Bokningsnummer" value={form.related_booking_number} onChange={(value) => updateField("related_booking_number", value)} />
                    <Field label="Biljettnummer" value={form.related_ticket_number} onChange={(value) => updateField("related_ticket_number", value)} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Innehåll
                  </h2>

                  <div className="mt-5 space-y-4">
                    <Field
                      label="Ämne"
                      value={form.subject}
                      onChange={(value) => updateField("subject", value)}
                    />

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Meddelande / notering
                      </label>
                      <textarea
                        value={form.message}
                        onChange={(event) => updateField("message", event.target.value)}
                        rows={8}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Tidpunkter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <Field
                      label="Schemalagd"
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(value) => updateField("scheduled_at", value)}
                    />

                    <Field
                      label="Skickad"
                      type="datetime-local"
                      value={form.sent_at}
                      onChange={(value) => updateField("sent_at", value)}
                    />

                    <Field
                      label="Klar"
                      type="datetime-local"
                      value={form.completed_at}
                      onChange={(value) => updateField("completed_at", value)}
                    />
                  </div>
                </section>

                <div className="flex justify-end gap-3">
                  <Link
                    href="/admin/crm/kommunikation"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara kommunikation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        type={type}
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
