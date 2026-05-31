import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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

type QualityNoteRow = {
  id: string;
  partner_id?: string | null;
  title?: string | null;
  message?: string | null;
  note_type?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  partners?: PartnerRow[];
  notes?: QualityNoteRow[];
  summary?: {
    total: number;
    quality: number;
    deviations: number;
    followUps: number;
  };
  error?: string;
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

function fmtDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function PartnerKvalitetPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [notes, setNotes] = useState<QualityNoteRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    quality: 0,
    deviations: 0,
    followUps: 0,
  });
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [noteType, setNoteType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function partnerName(id?: string | null) {
    const partner = partners.find((item) => item.id === id);
    return partner?.name || "—";
  }

  async function loadNotes() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (partnerId) params.set("partner_id", partnerId);
      if (noteType) params.set("note_type", noteType);

      const res = await fetch("/api/admin/partners/kvalitet?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta kvalitet och uppföljning.");
      }

      setPartners(json.partners || []);
      setNotes(json.notes || []);
      setSummary(json.summary || { total: 0, quality: 0, deviations: 0, followUps: 0 });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createNote(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/partners/kvalitet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa uppföljning.");
      }

      setMessage("Uppföljningen sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadNotes();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa uppföljning.");
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
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => notes.length, [notes]);

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
                  Kvalitet / uppföljning
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här följer du upp operatörer och partners med kvalitetsnoteringar, avvikelser, kontroller, reklamationer och interna kommentarer.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny uppföljning"}
                </button>

                <button
                  type="button"
                  onClick={loadNotes}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Kvalitet" value={summary?.quality || 0} tone="blue" />
              <SummaryCard label="Avvikelser" value={summary?.deviations || 0} tone="red" />
              <SummaryCard label="Uppföljningar" value={summary?.followUps || 0} tone="amber" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Appens noteringstabell saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>app_partner_notes</strong> saknas i databasen. Eftersom appen redan är byggd mot den tabellen bör vi skapa/återställa den.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createNote}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny kvalitet / uppföljning
                  </h2>
                  <p className="text-sm text-slate-500">
                    Lägg in en kvalitetsnotering, avvikelse, reklamation eller uppföljning kopplad till en operatör/partner.
                  </p>
                </div>

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

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Beskrivning
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
                    {saving ? "Sparar..." : "Spara uppföljning"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_260px_220px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadNotes();
                    }}
                    placeholder="Sök rubrik, partner, avvikelse, notering eller uppföljning..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Partner"
                  value={partnerId}
                  onChange={setPartnerId}
                  options={[
                    ["", "Alla partners"],
                    ...partners.map((partner) => [partner.id, partner.name || "Partner"] as [string, string]),
                  ]}
                />

                <SelectField
                  label="Typ"
                  value={noteType}
                  onChange={setNoteType}
                  options={[
                    ["", "Alla"],
                    ["quality", "Kvalitet"],
                    ["follow_up", "Uppföljning"],
                    ["deviation", "Avvikelse"],
                    ["complaint", "Reklamation"],
                    ["inspection", "Kontroll"],
                    ["praise", "Beröm"],
                    ["internal", "Intern notering"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadNotes}
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
                    Uppföljningslogg
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} poster
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Rubrik</Th>
                      <Th>Partner</Th>
                      <Th>Typ</Th>
                      <Th>Beskrivning</Th>
                      <Th>Skapad</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                          Laddar kvalitet och uppföljning...
                        </td>
                      </tr>
                    ) : notes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga uppföljningar hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första posten med knappen Ny uppföljning.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      notes.map((note) => (
                        <tr key={note.id} onClick={() => router.push("/admin/partners/kvalitet/" + encodeURIComponent(note.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {note.title || "Uppföljning"}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[220px] truncate font-semibold text-slate-900">
                              {partnerName(note.partner_id)}
                            </div>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                noteTypeClass(note.note_type)
                              }
                            >
                              {noteTypeLabel(note.note_type)}
                            </span>
                          </Td>

                          <Td>
                            <div className="max-w-[420px] truncate text-slate-600">
                              {note.message || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {fmtDateTime(note.created_at)}
                            </div>
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
