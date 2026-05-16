import { useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function NewShuttleRoutePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    route_code: "",

    airport_name: "",
    start_city: "",
    end_city: "",

    start_location: "",
    end_location: "",

    default_price: "",
    estimated_duration_minutes: "",

    operator_name: "",
    color: "#194C66",

    description: "",
    status: "active",

    is_public: true,
    is_featured: false,
  });

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function save() {
    try {
      setSaving(true);
      setError("");

      if (!form.name.trim()) {
        throw new Error("Ange namn på rutten.");
      }

      const res = await fetch("/api/admin/shuttle/routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa rutt.");
      }

      router.push("/admin/shuttle/rutter");
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
                Skapa Airport Shuttle-rutt
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa grundrutt för flygbuss, exempelvis Helsingborg C till flygplatsen.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/shuttle/rutter")}
              className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-[#f8fafc]"
            >
              Tillbaka
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="mb-5 text-lg font-semibold text-[#194C66]">
                Ruttinformation
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ruttnamn">
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Helsingborg C → Ängelholm Airport"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Ruttkod">
                  <input
                    value={form.route_code}
                    onChange={(e) => update("route_code", e.target.value)}
                    placeholder="AIR-HBG-AGH"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Flygplats">
                  <input
                    value={form.airport_name}
                    onChange={(e) => update("airport_name", e.target.value)}
                    placeholder="Ängelholm Helsingborg Airport"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Operatör">
                  <input
                    value={form.operator_name}
                    onChange={(e) => update("operator_name", e.target.value)}
                    placeholder="Helsingbuss / Partner"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Startort">
                  <input
                    value={form.start_city}
                    onChange={(e) => update("start_city", e.target.value)}
                    placeholder="Helsingborg"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Slutort">
                  <input
                    value={form.end_city}
                    onChange={(e) => update("end_city", e.target.value)}
                    placeholder="Ängelholm Airport"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Startplats">
                  <input
                    value={form.start_location}
                    onChange={(e) => update("start_location", e.target.value)}
                    placeholder="Helsingborg C"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Slutplats">
                  <input
                    value={form.end_location}
                    onChange={(e) => update("end_location", e.target.value)}
                    placeholder="Flygplatsens terminal"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Grundpris">
                  <input
                    type="number"
                    value={form.default_price}
                    onChange={(e) => update("default_price", e.target.value)}
                    placeholder="199"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Restid minuter">
                  <input
                    type="number"
                    value={form.estimated_duration_minutes}
                    onChange={(e) =>
                      update("estimated_duration_minutes", e.target.value)
                    }
                    placeholder="35"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Färg">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => update("color", e.target.value)}
                    className="h-12 w-full rounded-xl border p-1"
                  />
                </Field>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="active">Aktiv</option>
                    <option value="draft">Utkast</option>
                    <option value="inactive">Inaktiv</option>
                  </select>
                </Field>

                <div className="md:col-span-2">
                  <Field label="Beskrivning">
                    <textarea
                      rows={5}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="Beskriv rutten, målgrupp, trafikupplägg och viktig information."
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow">
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
                      Publik rutt
                    </span>
                    <span className="text-sm text-gray-500">
                      Rutten kan visas på kundsida och bokningsflöde.
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
                      Utvald rutt
                    </span>
                    <span className="text-sm text-gray-500">
                      Kan lyftas extra på startsida eller i admin.
                    </span>
                  </span>
                </label>
              </div>

              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="mt-6 w-full rounded-xl bg-[#194C66] px-4 py-3 font-semibold text-white hover:bg-[#16384d] disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Skapa rutt"}
              </button>
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
