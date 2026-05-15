//src/pages/admin/sundra/hallplatser.tsx
import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Stop = {
  id: string;
  name?: string | null;
  city?: string | null;
  address?: string | null;
  stop_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  status?: string | null;
};

function statusLabel(status?: string | null) {
  if (status === "active") return "Aktiv";
  if (status === "inactive") return "Inaktiv";
  if (status === "draft") return "Utkast";
  return status || "—";
}

function statusClass(status?: string | null) {
  if (status === "active") return "bg-green-100 text-green-700";
  if (status === "inactive") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export default function SundraStopsPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    stop_code: "",
    latitude: "",
    longitude: "",
    description: "",
    status: "active",
  });

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadStops() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/stops");
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

  async function save() {
    try {
      setSaving(true);
      setError("");

      if (!form.name.trim()) {
        throw new Error("Hållplatsnamn saknas.");
      }

      const res = await fetch("/api/admin/sundra/stops", {
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

      setForm({
        name: "",
        city: "",
        address: "",
        stop_code: "",
        latitude: "",
        longitude: "",
        description: "",
        status: "active",
      });

      await loadStops();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  const filteredStops = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return stops;

    return stops.filter((s) => {
      return (
        s.name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.stop_code?.toLowerCase().includes(q)
      );
    });
  }, [search, stops]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Hållplatser
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa och hantera påstigningsplatser för Sundra-resor.
              </p>
            </div>

            <button
              onClick={loadStops}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
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
                    placeholder="Ex. Malmö C"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ort">
                    <input
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Malmö"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Kod">
                    <input
                      value={form.stop_code}
                      onChange={(e) => update("stop_code", e.target.value)}
                      placeholder="MAL-C"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Adress / läge">
                  <input
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Ex. Centralplan, Läge K"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Latitud">
                    <input
                      value={form.latitude}
                      onChange={(e) => update("latitude", e.target.value)}
                      placeholder="55.6094"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Longitud">
                    <input
                      value={form.longitude}
                      onChange={(e) => update("longitude", e.target.value)}
                      placeholder="13.0007"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

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

                <Field label="Beskrivning / information">
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Ex. Samling vid bussläge K, kom 10 minuter innan avgång."
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white hover:bg-[#16384d] disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Skapa hållplats"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-white shadow">
              <div className="border-b p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#194C66]">
                      Alla hållplatser
                    </h2>
                    <p className="text-sm text-gray-500">
                      {filteredStops.length} av {stops.length} hållplatser
                    </p>
                  </div>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Sök hållplats..."
                    className="w-full rounded-xl border px-3 py-2 text-sm md:w-72"
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-gray-500">
                  Laddar hållplatser...
                </div>
              ) : filteredStops.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  Inga hållplatser hittades.
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStops.map((stop) => (
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
                            {stop.city || "—"} · {stop.address || "Ingen adress"}
                          </p>

                          {stop.description && (
                            <p className="mt-2 max-w-2xl text-sm text-gray-600">
                              {stop.description}
                            </p>
                          )}

                          {(stop.latitude || stop.longitude) && (
                            <p className="mt-2 text-xs text-gray-400">
                              GPS: {stop.latitude || "—"}, {stop.longitude || "—"}
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            stop.status
                          )}`}
                        >
                          {statusLabel(stop.status)}
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


