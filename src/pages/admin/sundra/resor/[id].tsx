import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type TripForm = {
  title: string;
  slug: string;
  category: string;
  destination: string;
  short_description: string;
  description: string;
  program: string;
  included: string;
  not_included: string;
  terms: string;
  image_url: string;
  price_from: string;
  currency: string;
  status: string;
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
};

const EMPTY_FORM: TripForm = {
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
};

export default function SundraTripDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [form, setForm] = useState<TripForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/admin/sundra/trips/${id}`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Kunde inte hämta resan.");
        }

        const trip = json.trip;

        setForm({
          title: trip.title || "",
          slug: trip.slug || "",
          category: trip.category || "",
          destination: trip.destination || "",
          short_description: trip.short_description || "",
          description: trip.description || "",
          program: trip.program || "",
          included: trip.included || "",
          not_included: trip.not_included || "",
          terms: trip.terms || "",
          image_url: trip.image_url || "",
          price_from:
            trip.price_from === null || trip.price_from === undefined
              ? ""
              : String(trip.price_from),
          currency: trip.currency || "SEK",
          status: trip.status || "draft",
          is_featured: Boolean(trip.is_featured),
          seo_title: trip.seo_title || "",
          seo_description: trip.seo_description || "",
        });
      } catch (e: any) {
        setError(e?.message || "Något gick fel.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  function update(key: keyof TripForm, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSavedMessage("");
  }

  async function save() {
    if (!id || typeof id !== "string") return;

    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      const res = await fetch(`/api/admin/sundra/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte spara resan.");
      }

      setSavedMessage("Sparat ✔");
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTrip() {
    if (!id || typeof id !== "string") return;

    const ok = confirm(
      "Är du säker på att du vill ta bort resan? Alla avgångar kopplade till resan tas också bort."
    );

    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/sundra/trips/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte ta bort resan.");
      }

      router.push("/admin/sundra/resor");
    } catch (e: any) {
      setError(e?.message || "Något gick fel vid borttagning.");
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
                Redigera resa
              </h1>
              <p className="text-sm text-[#194C66]/60">
                Uppdatera informationen som visas på resesidan och resekortet.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => router.push("/admin/sundra/resor")}
                className="rounded-[25px] border bg-white px-4 py-2 text-sm text-[#194C66] hover:bg-gray-50"
              >
                Tillbaka
              </button>

              <button
                onClick={() =>
                  router.push(`/admin/sundra/avganger/new?trip_id=${id}`)
                }
                className="rounded-[25px] bg-[#0f766e] px-4 py-2 text-sm text-white"
              >
                + Skapa avgång
              </button>
            </div>
          </div>

          {loading && (
            <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow">
              Laddar resa...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <section className="rounded-xl bg-white p-5 shadow space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-[#194C66]">
                    Resans information
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Ändra texter, bild, pris och status för resan.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Titel">
                    <input
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>

                  <Field label="Slug / länk">
                    <input
                      value={form.slug}
                      onChange={(e) => update("slug", e.target.value)}
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
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>

                  <Field label="Pris från">
                    <input
                      type="number"
                      value={form.price_from}
                      onChange={(e) => update("price_from", e.target.value)}
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
                    onChange={(e) =>
                      update("short_description", e.target.value)
                    }
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Lång beskrivning">
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Reseprogram">
                  <textarea
                    value={form.program}
                    onChange={(e) => update("program", e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Ingår i resan">
                    <textarea
                      value={form.included}
                      onChange={(e) => update("included", e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>

                  <Field label="Ingår inte">
                    <textarea
                      value={form.not_included}
                      onChange={(e) => update("not_included", e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Villkor / bra att veta">
                  <textarea
                    value={form.terms}
                    onChange={(e) => update("terms", e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="SEO-titel">
                    <input
                      value={form.seo_title}
                      onChange={(e) => update("seo_title", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>

                  <Field label="SEO-beskrivning">
                    <input
                      value={form.seo_description}
                      onChange={(e) =>
                        update("seo_description", e.target.value)
                      }
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
                  {saving ? "Sparar..." : "Spara ändringar"}
                </button>

                {savedMessage && (
                  <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    {savedMessage}
                  </div>
                )}

                <button
                  onClick={removeTrip}
                  className="mt-3 w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Ta bort resa
                </button>
              </aside>
            </div>
          )}
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
