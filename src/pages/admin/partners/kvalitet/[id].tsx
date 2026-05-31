import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type PartnerRow = {
  id: string;
  name?: string | null;
  partner_type?: string | null;
  city?: string | null;
  contact_person?: string | null;
};

type FormState = {
  partner_id: string;
  title: string;
  note_type: string;
  message: string;
};

const emptyForm: FormState = {
  partner_id: "",
  title: "",
  note_type: "quality",
  message: "",
};

function noteTypeLabel(type?: string | null) {
  switch (type) {
    case "quality":
      return "Kvalitet";
    case "follow_up":
      return "Uppföljning";
    case "deviation":
      return "Avvikelse";
    case "complaint":
      return "Reklamation";
    case "inspection":
      return "Kontroll";
    case "praise":
      return "Beröm";
    case "internal":
      return "Intern notering";
    default:
      return type || "Notering";
  }
}

function noteTypeClass(type?: string | null) {
  switch (type) {
    case "quality":
      return "bg-[#eef8fb] text-[#194C66]";
    case "follow_up":
    case "inspection":
      return "bg-blue-100 text-blue-700";
    case "deviation":
    case "complaint":
      return "bg-red-100 text-red-700";
    case "praise":
      return "bg-emerald-100 text-emerald-700";
    case "internal":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function PartnerKvalitetDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState("");

  function partnerName(id?: string | null) {
    const partner = partners.find((item) => item.id === id);
    return partner?.name || "—";
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadNote() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/partners/kvalitet/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta uppföljningen.");
      }

      const note = json.note || {};

      setPartners(json.partners || []);
      setCreatedAt(note.created_at || "");

      setForm({
        partner_id: note.partner_id || "",
        title: note.title || "",
        note_type: note.note_type || "quality",
        message: note.message || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessageText("");

      const res = await fetch("/api/admin/partners/kvalitet/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara uppföljningen.");
      }

      setMessageText("Uppföljningen sparades.");
      await loadNote();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara uppföljningen.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadNote();
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
                  Operatörer & partners
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Kvalitet / uppföljning" : form.title || "Uppföljning"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {partnerName(form.partner_id)}
                  {createdAt ? " · Skapad " + new Date(createdAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/partners/kvalitet"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="partner-quality-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara uppföljning"}
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
                Laddar uppföljning...
              </section>
            ) : (
              <form id="partner-quality-edit-form" onSubmit={saveNote} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {noteTypeLabel(form.note_type)}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {form.title || "Uppföljning"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {partnerName(form.partner_id)}
                      </p>
                    </div>

                    <span
                      className={
                        "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                        noteTypeClass(form.note_type)
                      }
                    >
                      {noteTypeLabel(form.note_type)}
                    </span>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Uppföljningsuppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <SelectField
                      label="Operatör / partner"
                      value={form.partner_id}
                      onChange={(value) => updateField("partner_id", value)}
                      options={[
                        ["", "Välj partner"],
                        ...partners.map((partner) => [partner.id, partner.name || "Partner"] as [string, string]),
                      ]}
                    />

                    <Field
                      label="Rubrik"
                      value={form.title}
                      onChange={(value) => updateField("title", value)}
                      placeholder="Ex. Kontroll efter uppdrag"
                    />

                    <SelectField
                      label="Typ"
                      value={form.note_type}
                      onChange={(value) => updateField("note_type", value)}
                      options={[
                        ["quality", "Kvalitet"],
                        ["follow_up", "Uppföljning"],
                        ["deviation", "Avvikelse"],
                        ["complaint", "Reklamation"],
                        ["inspection", "Kontroll"],
                        ["praise", "Beröm"],
                        ["internal", "Intern notering"],
                      ]}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Beskrivning
                  </h2>

                  <textarea
                    value={form.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    rows={8}
                    className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </section>

                <div className="flex justify-end gap-3">
                  <Link
                    href="/admin/partners/kvalitet"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara uppföljning"}
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
