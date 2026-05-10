import { useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function NewSundraTripPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",

    category: "",
    destination: "",
    location: "",
    country: "Sverige",

    trip_type: "day",

    short_description: "",
    description: "",
    program: "",

    image_url: "",

    duration_days: 1,
    duration_nights: 0,

    price_from: "",

    hero_badge: "",

    campaign_label: "",
    campaign_text: "",

    card_title: "",
    card_description: "",

    card_badge: "",

    price_prefix: "fr.",
    price_suffix: "",
    price_subtext: "",

    card_theme: "red",

    is_public: true,
    is_featured: false,
    enable_price_calendar: true,
    enable_rooms: false,
    enable_options: true,

    google_title: "",
    google_description: "",
    google_keywords: "",
    google_ads_tags: "",
  });

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleImageSelect(file?: File | null) {
    if (!file) return;

    try {
      setImageUploading(true);
      setError("");

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/sundra/upload-image", {
        method: "POST",
        body: fd,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Kunde inte ladda upp bilden.");
      }

      update("image_url", json.url);
    } catch (e: any) {
      setError(e?.message || "Något gick fel vid bilduppladdning.");
    } finally {
      setImageUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/sundra/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte skapa resa.");
      }

      router.push(`/admin/sundra/resor/${json.trip.id}`);
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

        <main className="p-6 pt-24">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Skapa resa
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa nya resor för Sundra & Helsingbuss.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/sundra/resor")}
              className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-[#f8fafc]"
            >
              Tillbaka
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="space-y-6">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-lg font-semibold text-[#194C66]">
                  Resinformation
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Titel">
                    <input
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder="Ex. Ullared Weekend"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Slug">
                    <input
                      value={form.slug}
                      onChange={(e) => update("slug", e.target.value)}
                      placeholder="ullared-weekend"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Destination">
                    <input
                      value={form.destination}
                      onChange={(e) => update("destination", e.target.value)}
                      placeholder="Ullared"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Land">
                    <input
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Reskategori">
                    <input
                      value={form.category}
                      onChange={(e) => update("category", e.target.value)}
                      placeholder="Shoppingresa"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Typ av resa">
                    <select
                      value={form.trip_type}
                      onChange={(e) => update("trip_type", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="day">Dagstur</option>
                      <option value="hotel">Övernattning</option>
                      <option value="multi">Flerdagarsresa</option>
                    </select>
                  </Field>

                  <Field label="Dagar">
                    <input
                      type="number"
                      value={form.duration_days}
                      onChange={(e) =>
                        update("duration_days", Number(e.target.value))
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Nätter">
                    <input
                      type="number"
                      value={form.duration_nights}
                      onChange={(e) =>
                        update("duration_nights", Number(e.target.value))
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Kort beskrivning">
                    <textarea
                      rows={3}
                      value={form.short_description}
                      onChange={(e) =>
                        update("short_description", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Full beskrivning">
                    <textarea
                      rows={7}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Program">
                    <textarea
                      rows={6}
                      value={form.program}
                      onChange={(e) => update("program", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Resebild">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e.target.files?.[0])}
                    />

                    <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4">
                      {form.image_url ? (
                        <img
                          src={form.image_url}
                          alt="Vald resebild"
                          className="mb-4 h-56 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="mb-4 flex h-56 items-center justify-center rounded-xl bg-white text-sm text-gray-500">
                          Ingen bild vald ännu
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={imageUploading}
                          className="rounded-xl bg-[#194C66] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {imageUploading ? "Laddar upp..." : "Välj bild"}
                        </button>

                        <input
                          value={form.image_url}
                          onChange={(e) => update("image_url", e.target.value)}
                          placeholder="Eller klistra in bild-URL här"
                          className="min-w-[260px] flex-1 rounded-xl border px-3 py-2 text-sm"
                        />
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-gray-500">
                        Endast admin: Rekommenderad bildstorlek är{" "}
                        <strong>1600 × 1000 px</strong> eller större. Använd
                        gärna liggande bild i 16:10 eller 3:2-format. Bilden
                        används på resekort, widget, priskalender och resesidan.
                      </p>
                    </div>
                  </Field>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-lg font-semibold text-[#194C66]">
                  Google & annonser
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Google titel">
                    <input
                      value={form.google_title}
                      onChange={(e) => update("google_title", e.target.value)}
                      placeholder="Ex. Bussresa till Ullared med Helsingbuss"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Google sökord">
                    <input
                      value={form.google_keywords}
                      onChange={(e) =>
                        update("google_keywords", e.target.value)
                      }
                      placeholder="ullared, bussresa, shoppingresa"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Google beskrivning">
                    <textarea
                      rows={3}
                      value={form.google_description}
                      onChange={(e) =>
                        update("google_description", e.target.value)
                      }
                      placeholder="Kort säljande text som kan användas för SEO och annonser."
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Ads tags / kampanjtaggar">
                    <input
                      value={form.google_ads_tags}
                      onChange={(e) =>
                        update("google_ads_tags", e.target.value)
                      }
                      placeholder="ex. sundra_ullared, google_ads, sommarresa"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-2xl bg-white p-5 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Synlighet
                </h2>

                <div className="mt-4 space-y-3">
                  <label className="flex items-start gap-3 rounded-xl border bg-[#f8fafc] p-3">
                    <input
                      type="checkbox"
                      checked={form.is_public}
                      onChange={(e) => update("is_public", e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-semibold text-[#194C66]">
                        Visa på Våra resor
                      </span>
                      <span className="text-sm text-gray-500">
                        Resan visas i widgeten för alla resor på hemsidan.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border bg-[#f8fafc] p-3">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => update("is_featured", e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-semibold text-[#194C66]">
                        Rekommenderad resa
                      </span>
                      <span className="text-sm text-gray-500">
                        Resan kan visas på startsidan som utvald/förvald resa.
                      </span>
                    </span>
                  </label>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Kampanjkort
                </h2>

                <div className="mt-4 space-y-4">
                  <Field label="Kampanj etikett">
                    <input
                      value={form.campaign_label}
                      onChange={(e) =>
                        update("campaign_label", e.target.value)
                      }
                      placeholder="Spara upp till 40%"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Kampanjtext">
                    <input
                      value={form.campaign_text}
                      onChange={(e) => update("campaign_text", e.target.value)}
                      placeholder="Populär resa"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Korttitel">
                    <input
                      value={form.card_title}
                      onChange={(e) => update("card_title", e.target.value)}
                      placeholder="Shoppingweekend"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Kortbeskrivning">
                    <textarea
                      rows={3}
                      value={form.card_description}
                      onChange={(e) =>
                        update("card_description", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Badge">
                    <input
                      value={form.card_badge}
                      onChange={(e) => update("card_badge", e.target.value)}
                      placeholder="Nyhet"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Tema">
                    <select
                      value={form.card_theme}
                      onChange={(e) => update("card_theme", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="red">Röd</option>
                      <option value="teal">Turkos</option>
                      <option value="blue">Blå</option>
                      <option value="green">Grön</option>
                      <option value="dark">Mörk</option>
                    </select>
                  </Field>

                  <Field label="Pris från">
                    <input
                      type="number"
                      value={form.price_from}
                      onChange={(e) => update("price_from", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Pris prefix">
                    <input
                      value={form.price_prefix}
                      onChange={(e) => update("price_prefix", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Pris text under">
                    <input
                      value={form.price_subtext}
                      onChange={(e) => update("price_subtext", e.target.value)}
                      placeholder="2 dagar med buss"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <button
                  onClick={save}
                  disabled={saving || !form.title.trim()}
                  className="mt-6 w-full rounded-xl bg-[#194C66] px-4 py-3 font-medium text-white hover:bg-[#16384d] disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Skapa resa"}
                </button>
              </section>
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


