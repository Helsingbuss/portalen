import { useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type GalleryImage = {
  url: string;
  alt?: string;
};

export default function NewSundraTripPage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
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
    gallery_images: [] as GalleryImage[],

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

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[åä]/g, "a")
      .replace(/[ö]/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function uploadImage(file: File) {
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

    return json.url as string;
  }

  async function handleImageSelect(file?: File | null) {
    if (!file) return;

    try {
      setImageUploading(true);
      setError("");

      const url = await uploadImage(file);

      setForm((prev) => {
        const exists = prev.gallery_images.some((img) => img.url === url);

        return {
          ...prev,
          image_url: url,
          gallery_images: exists
            ? prev.gallery_images
            : [{ url, alt: prev.title || "Resebild" }, ...prev.gallery_images],
        };
      });
    } catch (e: any) {
      setError(e?.message || "Något gick fel vid bilduppladdning.");
    } finally {
      setImageUploading(false);
    }
  }

  async function handleGallerySelect(files?: FileList | null) {
    if (!files || files.length === 0) return;

    try {
      setGalleryUploading(true);
      setError("");

      const uploaded: GalleryImage[] = [];

      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        uploaded.push({
          url,
          alt: form.title || "Resebild",
        });
      }

      setForm((prev) => {
        const currentUrls = new Set(prev.gallery_images.map((img) => img.url));

        const nextImages = [
          ...prev.gallery_images,
          ...uploaded.filter((img) => !currentUrls.has(img.url)),
        ];

        return {
          ...prev,
          image_url: prev.image_url || uploaded[0]?.url || "",
          gallery_images: nextImages,
        };
      });

      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    } catch (e: any) {
      setError(e?.message || "Något gick fel vid uppladdning av bilder.");
    } finally {
      setGalleryUploading(false);
    }
  }

  function addGalleryUrl() {
    const url = prompt("Klistra in bild-URL:");
    if (!url) return;

    setForm((prev) => {
      const cleanUrl = url.trim();

      if (!cleanUrl) return prev;

      const exists = prev.gallery_images.some((img) => img.url === cleanUrl);

      return {
        ...prev,
        image_url: prev.image_url || cleanUrl,
        gallery_images: exists
          ? prev.gallery_images
          : [...prev.gallery_images, { url: cleanUrl, alt: prev.title || "Resebild" }],
      };
    });
  }

  function removeGalleryImage(index: number) {
    setForm((prev) => {
      const removed = prev.gallery_images[index];
      const next = prev.gallery_images.filter((_, i) => i !== index);

      return {
        ...prev,
        gallery_images: next,
        image_url:
          prev.image_url === removed?.url
            ? next[0]?.url || ""
            : prev.image_url,
      };
    });
  }

  function setAsMainImage(url: string) {
    update("image_url", url);
  }

  async function save() {
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,

        // Sparas extra så designen kan använda flera bilder om API:t/mappar stödjer media.
        media: {
          galleryImages: form.gallery_images,
          gallery_images: form.gallery_images,
          images: form.gallery_images,
          heroImage: form.image_url,
          hero_image: form.image_url,
        },

        // Extra varianter för kompatibilitet.
        images: form.gallery_images,
        gallery: form.gallery_images,
        image_gallery: form.gallery_images,
      };

      const res = await fetch("/api/admin/sundra/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
                      onChange={(e) => {
                        const title = e.target.value;
                        update("title", title);

                        if (!form.slug) {
                          update("slug", makeSlug(title));
                        }
                      }}
                      placeholder="Ex. Ullared Weekend"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Slug">
                    <input
                      value={form.slug}
                      onChange={(e) => update("slug", makeSlug(e.target.value))}
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
                  <Field label="Bilder till resan">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e.target.files?.[0])}
                    />

                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleGallerySelect(e.target.files)}
                    />

                    <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4">
                      {form.image_url ? (
                        <img
                          src={form.image_url}
                          alt="Vald huvudbild"
                          className="mb-4 h-64 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="mb-4 flex h-64 items-center justify-center rounded-xl bg-white text-sm text-gray-500">
                          Ingen huvudbild vald ännu
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={imageUploading}
                          className="rounded-xl bg-[#194C66] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {imageUploading ? "Laddar upp..." : "Välj huvudbild"}
                        </button>

                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          disabled={galleryUploading}
                          className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-[#194C66] hover:bg-gray-50 disabled:opacity-50"
                        >
                          {galleryUploading
                            ? "Laddar upp bilder..."
                            : "+ Lägg till fler bilder"}
                        </button>

                        <button
                          type="button"
                          onClick={addGalleryUrl}
                          className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-[#194C66] hover:bg-gray-50"
                        >
                          Lägg till bild-URL
                        </button>
                      </div>

                      <div className="mt-4">
                        <input
                          value={form.image_url}
                          onChange={(e) => update("image_url", e.target.value)}
                          placeholder="Huvudbild URL"
                          className="w-full rounded-xl border px-3 py-2 text-sm"
                        />
                      </div>

                      {form.gallery_images.length > 0 && (
                        <div className="mt-5">
                          <div className="mb-2 text-sm font-semibold text-[#194C66]">
                            Bildgalleri ({form.gallery_images.length} bilder)
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {form.gallery_images.map((img, index) => {
                              const isMain = img.url === form.image_url;

                              return (
                                <div
                                  key={`${img.url}-${index}`}
                                  className={`overflow-hidden rounded-xl border bg-white ${
                                    isMain
                                      ? "border-[#194C66] ring-2 ring-[#194C66]/20"
                                      : "border-gray-200"
                                  }`}
                                >
                                  <img
                                    src={img.url}
                                    alt={img.alt || "Resebild"}
                                    className="h-32 w-full object-cover"
                                  />

                                  <div className="space-y-2 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-semibold text-gray-600">
                                        Bild {index + 1}
                                      </span>

                                      {isMain && (
                                        <span className="rounded-full bg-[#e2f7f1] px-2 py-1 text-[10px] font-bold text-[#00866f]">
                                          Huvudbild
                                        </span>
                                      )}
                                    </div>

                                    <input
                                      value={img.alt || ""}
                                      onChange={(e) => {
                                        const next = [...form.gallery_images];
                                        next[index] = {
                                          ...next[index],
                                          alt: e.target.value,
                                        };
                                        update("gallery_images", next);
                                      }}
                                      placeholder="Alt-text / beskrivning"
                                      className="w-full rounded-lg border px-2 py-1 text-xs"
                                    />

                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setAsMainImage(img.url)}
                                        className="flex-1 rounded-lg border bg-white px-2 py-1 text-xs font-semibold text-[#194C66] hover:bg-gray-50"
                                      >
                                        Sätt som huvudbild
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => removeGalleryImage(index)}
                                        className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                                      >
                                        Ta bort
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <p className="mt-3 text-xs leading-relaxed text-gray-500">
                        Rekommenderad huvudbild är{" "}
                        <strong>1600 × 1000 px</strong> eller större.
                        Lägg gärna till 3–6 bilder så att resesidan kan visa
                        stor bild, små bilder och bildgalleri.
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
