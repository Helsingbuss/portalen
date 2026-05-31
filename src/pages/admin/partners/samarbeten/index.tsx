import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type PartnershipRow = {
  id: string;
  partner_type?: string | null;
  name?: string | null;
  org_number?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  address?: string | null;
  status?: string | null;
  quality_level?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  partnerships?: PartnershipRow[];
  summary?: {
    total: number;
    active: number;
    inactive: number;
    highQuality: number;
  };
  error?: string;
};

type FormState = {
  name: string;
  org_number: string;
  contact_person: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  address: string;
  status: string;
  quality_level: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  org_number: "",
  contact_person: "",
  email: "",
  phone: "",
  website: "",
  city: "",
  address: "",
  status: "active",
  quality_level: "normal",
  notes: "",
};

function statusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "inactive":
      return "Inaktiv";
    case "paused":
      return "Pausad";
    case "blocked":
      return "Blockerad";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "paused":
      return "bg-blue-100 text-blue-700";
    case "blocked":
      return "bg-red-100 text-red-700";
    case "inactive":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function qualityLabel(level?: string | null) {
  switch (level) {
    case "high":
      return "Hög";
    case "premium":
      return "Premium";
    case "approved":
      return "Godkänd";
    case "normal":
      return "Normal";
    case "low":
      return "Låg";
    default:
      return level || "Normal";
  }
}

function qualityClass(level?: string | null) {
  switch (level) {
    case "high":
    case "premium":
    case "approved":
      return "bg-[#eef8fb] text-[#194C66]";
    case "low":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function PartnerSamarbetenPage() {
  const router = useRouter();
  const [partnerships, setHotels] = useState<PartnershipRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    active: 0,
    inactive: 0,
    highQuality: 0,
  });
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [quality, setQuality] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPartnerships() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (quality) params.set("quality", quality);

      const res = await fetch("/api/admin/partners/samarbeten?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta samarbeten.");
      }

      setHotels(json.partnerships || []);
      setSummary(json.summary || { total: 0, active: 0, inactive: 0, highQuality: 0 });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createPartnership(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/partners/samarbeten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa samarbete/partner.");
      }

      setMessage("Samarbete / partner sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadPartnerships();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa samarbete/partner.");
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
    loadPartnerships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => partnerships.length, [partnerships]);

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
                  Samarbeten / partnerskap
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här samlar du samarbete/partner, samarbete/partnern och logipartners som kan kopplas till paketresor, evenemang, kryssningar och samarbeten.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Nytt samarbete"}
                </button>

                <button
                  type="button"
                  onClick={loadPartnerships}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Aktiva" value={summary?.active || 0} tone="green" />
              <SummaryCard label="Inaktiva/pausade" value={summary?.inactive || 0} tone="amber" />
              <SummaryCard label="Hög kvalitet" value={summary?.highQuality || 0} tone="blue" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Partner-tabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>app_partners</strong> saknas i databasen. Portalen använder samma partnersystem som appen.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createPartnership}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Nytt samarbete
                  </h2>
                  <p className="text-sm text-slate-500">
                    Lägg in samarbete/partner, kontaktperson, ort, status och anteckningar.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <Field label="Samarbete / partner" value={form.name} onChange={(value) => updateField("name", value)} />
                  <Field label="Org.nr" value={form.org_number} onChange={(value) => updateField("org_number", value)} />
                  <Field label="Kontaktperson" value={form.contact_person} onChange={(value) => updateField("contact_person", value)} />

                  <Field label="E-post" value={form.email} onChange={(value) => updateField("email", value)} />
                  <Field label="Telefon" value={form.phone} onChange={(value) => updateField("phone", value)} />
                  <Field label="Webbplats" value={form.website} onChange={(value) => updateField("website", value)} />

                  <Field label="Ort" value={form.city} onChange={(value) => updateField("city", value)} />
                  <Field label="Adress" value={form.address} onChange={(value) => updateField("address", value)} />

                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(value) => updateField("status", value)}
                    options={[
                      ["active", "Aktiv"],
                      ["paused", "Pausad"],
                      ["inactive", "Inaktiv"],
                      ["blocked", "Blockerad"],
                    ]}
                  />

                  <SelectField
                    label="Kvalitet"
                    value={form.quality_level}
                    onChange={(value) => updateField("quality_level", value)}
                    options={[
                      ["normal", "Normal"],
                      ["approved", "Godkänd"],
                      ["high", "Hög"],
                      ["premium", "Premium"],
                      ["low", "Låg"],
                    ]}
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Anteckningar
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={4}
                    placeholder="Ex. antal rum, prisnivå, paketresor, frukost, bussparkering, kontaktväg..."
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
                    {saving ? "Sparar..." : "Spara samarbete"}
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
                      if (event.key === "Enter") loadPartnerships();
                    }}
                    placeholder="Sök samarbete/partner, kontaktperson, e-post, ort eller anteckning..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["active", "Aktiva"],
                    ["paused", "Pausade"],
                    ["inactive", "Inaktiva"],
                    ["blocked", "Blockerade"],
                  ]}
                />

                <SelectField
                  label="Kvalitet"
                  value={quality}
                  onChange={setQuality}
                  options={[
                    ["", "Alla"],
                    ["normal", "Normal"],
                    ["approved", "Godkänd"],
                    ["high", "Hög"],
                    ["premium", "Premium"],
                    ["low", "Låg"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadPartnerships}
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
                    Samarbete / partnerlista
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} samarbete/partnern
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Samarbete / partner</Th>
                      <Th>Kontakt</Th>
                      <Th>Ort</Th>
                      <Th>Status</Th>
                      <Th>Kvalitet</Th>
                      <Th>Webb</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                          Laddar samarbeten...
                        </td>
                      </tr>
                    ) : partnerships.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga samarbeten hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första samarbete/partnert med knappen Nytt samarbete.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      partnerships.map((partnership) => (
                        <tr key={partnership.id} onClick={() => router.push("/admin/partners/samarbeten/" + encodeURIComponent(partnership.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {partnership.name || "Samarbete / partner"}
                            </div>
                            {partnership.org_number && (
                              <div className="mt-1 text-xs text-slate-500">
                                Org.nr {partnership.org_number}
                              </div>
                            )}
                          </Td>

                          <Td>
                            <div className="max-w-[220px] truncate font-semibold text-slate-900">
                              {partnership.contact_person || "—"}
                            </div>
                            <div className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                              {partnership.email || partnership.phone || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {partnership.city || "—"}
                            </div>
                            {partnership.address && (
                              <div className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                                {partnership.address}
                              </div>
                            )}
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                statusClass(partnership.status)
                              }
                            >
                              {statusLabel(partnership.status)}
                            </span>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                qualityClass(partnership.quality_level)
                              }
                            >
                              {qualityLabel(partnership.quality_level)}
                            </span>
                          </Td>

                          <Td>
                            {partnership.website ? (
                              <a
                                href={String(partnership.website).startsWith("http") ? partnership.website : "https://" + partnership.website}
                                onClick={(event) => event.stopPropagation()}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-[#00645d] hover:underline"
                              >
                                Öppna
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </Td>

                          <Td>
                            <div className="max-w-[260px] truncate text-slate-600">
                              {partnership.notes || "—"}
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
