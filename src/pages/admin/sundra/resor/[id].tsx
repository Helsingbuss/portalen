import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function EditSundraTripPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<any>({
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

    is_featured: false,
    enable_price_calendar: true,
    enable_rooms: false,
    enable_options: true,
  });

  function update(key: string, value: any) {
    setForm((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadTrip() {
    try {
      setLoading(true);

      const res = await fetch(`/api/admin/sundra/trips/${id}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte hämta resa.");
      }

      setForm({
        ...form,
        ...json.trip,
      });
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadTrip();
    }
  }, [id]);

  async function save() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/sundra/trips/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte spara resa.");
      }

      alert("Resan sparades.");
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTrip() {
    const ok = confirm(
      "Är du säker på att du vill ta bort resan?"
    );

    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/sundra/trips/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte ta bort resa.");
      }

      router.push("/admin/sundra/resor");
    } catch (e: any) {
      alert(e?.message || "Något gick fel.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f5f4f0]">
        <AdminMenu />

        <div className="flex flex-1 flex-col">
          <Header />

          <main className="p-6 pt-24">
            <div className="rounded-2xl bg-white p-6 shadow">
              Laddar resa...
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f4f0]">
      <AdminMenu />

      <div className="flex flex-1 flex-col">
        <Header />

        <main className="p-6 pt-24">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Redigera resa
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Uppdatera information för resan.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  router.push("/admin/sundra/resor")
                }
                className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-[#f8fafc]"
              >
                Tillbaka
              </button>

              <button
                onClick={removeTrip}
                className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Ta bort
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* VÄNSTER */}
            <section className="rounded-2xl bg-white p-5 shadow">
              <h2 className="mb-4 text-lg font-semibold text-[#194C66]">
                Resinformation
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Titel">
                  <input
                    value={form.title || ""}
                    onChange={(e) =>
                      update("title", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Slug">
                  <input
                    value={form.slug || ""}
                    onChange={(e) =>
                      update("slug", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Destination">
                  <input
                    value={form.destination || ""}
                    onChange={(e) =>
                      update("destination", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Land">
                  <input
                    value={form.country || ""}
                    onChange={(e) =>
                      update("country", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Kategori">
                  <input
                    value={form.category || ""}
                    onChange={(e) =>
                      update("category", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Resetyp">
                  <select
                    value={form.trip_type || "day"}
                    onChange={(e) =>
                      update("trip_type", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="day">Dagstur</option>
                    <option value="hotel">Övernattning</option>
                    <option value="multi">Flerdagarsresa</option>
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Kort beskrivning">
                  <textarea
                    rows={3}
                    value={form.short_description || ""}
                    onChange={(e) =>
                      update(
                        "short_description",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Beskrivning">
                  <textarea
                    rows={7}
                    value={form.description || ""}
                    onChange={(e) =>
                      update("description", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Program">
                  <textarea
                    rows={6}
                    value={form.program || ""}
                    onChange={(e) =>
                      update("program", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Bild URL">
                  <input
                    value={form.image_url || ""}
                    onChange={(e) =>
                      update("image_url", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>
              </div>
            </section>

            {/* HÖGER */}
            <aside className="space-y-6">
              <section className="rounded-2xl bg-white p-5 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Kampanjkort
                </h2>

                <div className="mt-4 space-y-4">
                  <Field label="Kampanj etikett">
                    <input
                      value={form.campaign_label || ""}
                      onChange={(e) =>
                        update(
                          "campaign_label",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Kampanjtext">
                    <input
                      value={form.campaign_text || ""}
                      onChange={(e) =>
                        update(
                          "campaign_text",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Korttitel">
                    <input
                      value={form.card_title || ""}
                      onChange={(e) =>
                        update("card_title", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Kortbeskrivning">
                    <textarea
                      rows={3}
                      value={form.card_description || ""}
                      onChange={(e) =>
                        update(
                          "card_description",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Badge">
                    <input
                      value={form.card_badge || ""}
                      onChange={(e) =>
                        update("card_badge", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Tema">
                    <select
                      value={form.card_theme || "red"}
                      onChange={(e) =>
                        update("card_theme", e.target.value)
                      }
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
                      value={form.price_from || ""}
                      onChange={(e) =>
                        update("price_from", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Pris prefix">
                    <input
                      value={form.price_prefix || ""}
                      onChange={(e) =>
                        update(
                          "price_prefix",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Pris text under">
                    <input
                      value={form.price_subtext || ""}
                      onChange={(e) =>
                        update(
                          "price_subtext",
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="mt-6 w-full rounded-xl bg-[#194C66] px-4 py-3 font-medium text-white hover:bg-[#16384d] disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Spara resa"}
                </button>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
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
      <div className="mb-1 text-sm font-medium text-[#194C66]">
        {label}
      </div>

      {children}
    </label>
  );
}


