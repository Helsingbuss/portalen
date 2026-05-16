import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Stop = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  stop_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  sort_order?: number | null;
  status?: string | null;
  active?: boolean | null;
};

const EMPTY_FORM = {
  name: "",
  city: "",
  address: "",
  stop_code: "",
  latitude: "",
  longitude: "",
  description: "",
  sort_order: "",
  status: "active",
  active: true,
};

export default function ShuttleStopsPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  async function loadStops() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/shuttle/stops");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta hållplatser.");
      }

      setStops(json.stops || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStops();
  }, []);

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
        throw new Error("Hållplatsnamn saknas.");
      }

      const res = await fetch("/api/admin/shuttle/stops", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa hållplats.");
      }

      setForm(EMPTY_FORM);
      await loadStops();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: stops.length,
      active: stops.filter((s) => s.active !== false && s.status !== "inactive").length,
    };
  }, [stops]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Airport Shuttle – Hållplatser
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa och hantera hållplatser för flygbussnätet.
              </p>
            </div>

            <button
              onClick={loadStops}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Stat title="Totala hållplatser" value={stats.total} />
            <Stat title="Aktiva hållplatser" value={stats.active} />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Skapa hållplats
              </h2>

              <div className="mt-5 space-y-4">
                <Field label="Hållplatsnamn">
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Helsingborg C"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ort">
                    <input
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Helsingborg"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Hållplatskod">
                    <input
                      value={form.stop_code}
                      onChange={(e) => update("stop_code", e.target.value)}
                      placeholder="HBG-C"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Adress / läge">
                  <input
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Järnvägsgatan / Knutpunkten"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Latitude">
                    <input
                      type="number"
                      value={form.latitude}
                      onChange={(e) => update("latitude", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Longitude">
                    <input
                      type="number"
                      value={form.longitude}
                      onChange={(e) => update("longitude", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Sorteringsordning">
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => update("sort_order", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Beskrivning">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => update("active", e.target.checked)}
                  />
                  Aktiv hållplats
                </label>

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Skapa hållplats"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-white shadow">
              <div className="border-b p-5">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Alla hållplatser
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-gray-500">
                  Laddar hållplatser...
                </div>
              ) : stops.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  Inga hållplatser skapade ännu.
                </div>
              ) : (
                <div className="divide-y">
                  {stops.map((stop) => (
                    <div key={stop.id} className="p-5 hover:bg-[#f8fafc]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-[#0f172a]">
                              {stop.name}
                            </h3>

                            {stop.stop_code && (
                              <span className="rounded-full bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-gray-600">
                                {stop.stop_code}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-gray-500">
                            {stop.city || "—"} · {stop.address || "Adress saknas"}
                          </p>

                          {stop.description && (
                            <p className="mt-2 text-sm text-gray-600">
                              {stop.description}
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            stop.active !== false
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {stop.active !== false ? "Aktiv" : "Inaktiv"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-[#194C66]">{label}</div>
      {children}
    </label>
  );
}
