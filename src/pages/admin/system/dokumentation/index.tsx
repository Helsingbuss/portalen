import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const emptyForm = {
  title: "",
  slug: "",
  category: "Övrigt",
  summary: "",
  content: "",
  tags_text: "",
  status: "published",
  is_pinned: false,
  sort_order: 0,
};

export default function DokumentationPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [form, setForm] = useState<any>(emptyForm);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const categories = useMemo(() => {
    return Array.from(new Set(docs.map((doc) => doc.category || "Övrigt"))).sort((a, b) =>
      String(a).localeCompare(String(b), "sv")
    );
  }, [docs]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return docs.filter((doc) => {
      const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

      const text = [
        doc.title,
        doc.slug,
        doc.category,
        doc.summary,
        doc.content,
        ...(doc.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && matchesStatus && (!q || text.includes(q));
    });
  }, [docs, search, categoryFilter, statusFilter]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/dokumentation");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta dokumentation.");
      }

      const list = json.docs || [];

      setDocs(list);
      setSummary(json.summary || {});
      setWarnings(json.warnings || []);

      if (!selectedSlug && list[0]) {
        selectDoc(list[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta dokumentation.");
    } finally {
      setLoading(false);
    }
  }

  function selectDoc(doc: any) {
    setSelectedSlug(doc.slug || "");

    setForm({
      title: doc.title || "",
      slug: doc.slug || "",
      category: doc.category || "Övrigt",
      summary: doc.summary || "",
      content: doc.content || "",
      tags_text: Array.isArray(doc.tags) ? doc.tags.join(", ") : "",
      status: doc.status || "published",
      is_pinned: doc.is_pinned === true,
      sort_order: Number(doc.sort_order || 0),
    });

    setSaved("");
    setError("");
  }

  function newDoc() {
    setSelectedSlug("");
    setForm(emptyForm);
    setSaved("");
    setError("");
  }

  function updateField(field: string, value: any) {
    setForm((current: any) => ({
      ...(current || {}),
      [field]: value,
    }));
  }

  function createSlugFromTitle() {
    const slug = String(form.title || "")
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    updateField("slug", slug);
  }

  async function saveDoc() {
    try {
      setSaving(true);
      setError("");
      setSaved("");

      const tags = String(form.tags_text || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/system/dokumentation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          tags,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara dokumentation.");
      }

      setSaved("Dokumentationen är sparad.");
      setSelectedSlug(json.doc?.slug || form.slug);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara dokumentation.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
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
                  System / inställningar · Hjälpcenter
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Dokumentation
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Samla manualer, interna instruktioner, rutiner och stödmaterial direkt i portalen.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={newDoc}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Ny artikel
                </button>

                <button
                  type="button"
                  onClick={saveDoc}
                  disabled={saving || !form.title}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara artikel"}
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
                <strong>Info:</strong> Kör SQL-koden för att kunna spara dokumentation. Standardartiklarna visas ändå.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Artiklar" value={summary.total || docs.length || 0} />
              <SummaryCard label="Publicerade" value={summary.published || 0} tone="green" />
              <SummaryCard label="Utkast" value={summary.drafts || 0} tone="amber" />
              <SummaryCard label="Fästa" value={summary.pinned || 0} />
              <SummaryCard label="Sparade" value={summary.saved || 0} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <div className="space-y-6">
                <Card title="Artiklar">
                  <div className="space-y-3">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Sök dokumentation..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                      >
                        <option value="all">Alla kategorier</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                      >
                        <option value="all">Alla statusar</option>
                        <option value="published">Publicerad</option>
                        <option value="draft">Utkast</option>
                        <option value="archived">Arkiverad</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {loading ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        Laddar dokumentation...
                      </div>
                    ) : filteredDocs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        Inga artiklar hittades.
                      </div>
                    ) : (
                      filteredDocs.map((doc) => (
                        <button
                          key={doc.slug}
                          type="button"
                          onClick={() => selectDoc(doc)}
                          className={
                            selectedSlug === doc.slug
                              ? "w-full rounded-xl border border-[#194C66] bg-[#194C66] px-4 py-3 text-left text-sm text-white"
                              : "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-black">{doc.is_pinned ? "★ " : ""}{doc.title}</div>
                              <div className={selectedSlug === doc.slug ? "mt-1 text-xs text-white/80" : "mt-1 text-xs text-slate-500"}>
                                {doc.category} · {statusLabel(doc.status)} · {doc.source === "sparad" ? "Sparad" : "Standard"}
                              </div>
                            </div>
                          </div>

                          {doc.summary && (
                            <div className={selectedSlug === doc.slug ? "mt-2 text-xs leading-5 text-white/80" : "mt-2 text-xs leading-5 text-slate-500"}>
                              {doc.summary}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card title={selectedSlug ? "Redigera artikel" : "Ny artikel"}>
                  <div className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <Field label="Rubrik" value={form.title || ""} onChange={(value) => updateField("title", value)} />

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Slug
                        </label>

                        <div className="mt-2 flex gap-2">
                          <input
                            value={form.slug || ""}
                            onChange={(event) => updateField("slug", event.target.value)}
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                          />

                          <button
                            type="button"
                            onClick={createSlugFromTitle}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-[#194C66] hover:bg-slate-50"
                          >
                            Skapa
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-3">
                      <Field label="Kategori" value={form.category || ""} onChange={(value) => updateField("category", value)} />

                      <SelectField
                        label="Status"
                        value={form.status || "published"}
                        onChange={(value) => updateField("status", value)}
                        options={[
                          ["published", "Publicerad"],
                          ["draft", "Utkast"],
                          ["archived", "Arkiverad"],
                        ]}
                      />

                      <NumberField
                        label="Sortering"
                        value={Number(form.sort_order || 0)}
                        onChange={(value) => updateField("sort_order", value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => updateField("is_pinned", !form.is_pinned)}
                      className={
                        form.is_pinned
                          ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-700"
                          : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-600"
                      }
                    >
                      {form.is_pinned ? "★ Fäst artikel" : "Fäst artikel"}
                    </button>

                    <Field label="Kort sammanfattning" value={form.summary || ""} onChange={(value) => updateField("summary", value)} />

                    <TextArea
                      label="Innehåll"
                      value={form.content || ""}
                      onChange={(value) => updateField("content", value)}
                      rows={14}
                    />

                    <Field label="Taggar, separera med komma" value={form.tags_text || ""} onChange={(value) => updateField("tags_text", value)} />
                  </div>
                </Card>

                <Card title="Förhandsvisning">
                  <article className="prose max-w-none">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {form.category || "Övrigt"} · {statusLabel(form.status)}
                    </div>

                    <h2 className="mt-2 text-2xl font-black text-[#194C66]">
                      {form.is_pinned ? "★ " : ""}{form.title || "Rubrik saknas"}
                    </h2>

                    {form.summary && (
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                        {form.summary}
                      </p>
                    )}

                    <div className="mt-5 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                      {form.content || "Innehåll saknas."}
                    </div>

                    {form.tags_text && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {String(form.tags_text)
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {tag}
                            </span>
                          ))}
                      </div>
                    )}
                  </article>
                </Card>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function statusLabel(status: string) {
  if (status === "draft") return "Utkast";
  if (status === "archived") return "Arkiverad";
  return "Publicerad";
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "amber";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 6,
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
