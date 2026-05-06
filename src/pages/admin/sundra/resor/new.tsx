import { useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function NewSundraTripPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    category: "",
    destination: "",
    short_description: "",
    description: "",
    program: "",
    included: "",
    not_included: "",
    terms: "",
    image_url: "",
    price_from: "",
    currency: "SEK",
    status: "draft",
    is_featured: false,
    seo_title: "",
    seo_description: "",
  });

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/sundra/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa resan.");
      }

      router.push("/admin/sundra/resor");
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Skapa resa
              </h1>
              <p className="text-sm text-[#194C66]/60">
                Lägg upp grundinformationen för resan. Avgångar och datum skapas
                separat efteråt.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/sundra/resor")}
              className="rounded-[25px] border bg-white px-4 py-2 text-sm text-[#194C66] hover:bg-gray-50"
            >
              Tillbaka
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-xl bg-white p-5 shadow space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Resans grundinformation
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Detta används för resekortet och resans informationssida.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Titel">
                  <input
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="Ex. Gekås Ullared"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Slug / länk">
                  <input
                    value={form.slug}
                    onChange={(e) => update("slug", e.target.value)}
                    placeholder="Lämna tomt för automatisk"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Kategori">
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">Välj kategori</option>
                    <option value="shopping">Shoppingresa</option>
                    <option value="noje">Nöje & upplevelse</option>
                    <option value="kryssning">Kryssning</option>
                    <option value="familj">Familjeresa</option>
                    <option value="event">Eventresa</option>
                    <option value="annat">Annat</option>
                  </select>
                </Field>

                <Field label="Destination">
                  <input
                    value={form.destination}
                    onChange={(e) => update("destination", e.target.value)}
                    placeholder="Ex. Ullared"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Pris från">
                  <input
                    type="number"
                    value={form.price_from}
                    onChange={(e) => update("price_from", e.target.value)}
                    placeholder="Ex. 349"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="draft">Utkast</option>
                    <option value="published">Publicerad</option>
                    <option value="hidden">Dold</option>
                  </select>
                </Field>
              </div>

              <Field label="Bild URL">
                <input
                  value={form.image_url}
                  onChange={(e) => update("image_url", e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Kort säljtext">
                <textarea
                  value={form.short_description}
                  onChange={(e) => update("short_description", e.target.value)}
                  rows={3}
                  placeholder="Kort text som visas på resekortet."
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Lång beskrivning">
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={6}
                  placeholder="Beskriv resan mer utförligt."
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <Field label="Reseprogram">
                <textarea
                  value={form.program}
                  onChange={(e) => update("program", e.target.value)}
                  rows={6}
                  placeholder="Ex. 07:00 Avresa, 10:00 Ankomst, 16:00 Hemresa..."
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ingår i resan">
                  <textarea
                    value={form.included}
                    onChange={(e) => update("included", e.target.value)}
                    rows={5}
                    placeholder="Ex. Bussresa, bokningsavgift..."
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Ingår inte">
                  <textarea
                    value={form.not_included}
                    onChange={(e) => update("not_included", e.target.value)}
                    rows={5}
                    placeholder="Ex. Mat, entrébiljett..."
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>
              </div>

              <Field label="Villkor / bra att veta">
                <textarea
                  value={form.terms}
                  onChange={(e) => update("terms", e.target.value)}
                  rows={5}
                  placeholder="Avbokning, minsta antal resenärer, tider kan ändras..."
                  className="w-full rounded-lg border px-3 py-2"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="SEO-titel">
                  <input
                    value={form.seo_title}
                    onChange={(e) => update("seo_title", e.target.value)}
                    placeholder="Titel för Google"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="SEO-beskrivning">
                  <input
                    value={form.seo_description}
                    onChange={(e) => update("seo_description", e.target.value)}
                    placeholder="Kort Google-beskrivning"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>
              </div>
            </section>

            <aside className="h-fit rounded-xl bg-white p-5 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Förhandsinfo
              </h2>

              <div className="mt-4 overflow-hidden rounded-xl border bg-[#f8fafc]">
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt={form.title || "Resebild"}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-[#e5eef3] text-sm text-[#194C66]/60">
                    Ingen bild vald
                  </div>
                )}

                <div className="p-4">
                  <div className="text-xs uppercase tracking-wide text-[#194C66]/60">
                    {form.category || "Kategori"}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[#0f172a]">
                    {form.title || "Resans titel"}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {form.short_description ||
                      "Kort beskrivning visas här på resekortet."}
                  </p>
                  <div className="mt-3 font-semibold text-[#194C66]">
                    Från {form.price_from || "0"} {form.currency}
                  </div>
                </div>
              </div>

              <label className="mt-5 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => update("is_featured", e.target.checked)}
                />
                Visa som utvald resa
              </label>

              <button
                onClick={save}
                disabled={saving || !form.title.trim()}
                className="mt-5 w-full rounded-lg bg-[#194C66] px-4 py-3 font-medium text-white hover:bg-[#163b4d] disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Skapa resa"}
              </button>

              <p className="mt-3 text-xs text-gray-500">
                Efter att resan skapats går vi vidare och skapar avgångar/datum
                kopplade till resan.
              </p>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-[#194C66]">{label}</div>
      {children}
    </label>
  );
}
