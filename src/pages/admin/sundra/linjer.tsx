import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Trip = {
  id: string;
  title?: string | null;
  destination?: string | null;
};

type LineStop = {
  id?: string;
  stop_name: string;
  stop_city?: string | null;
  departure_time?: string | null;
  price?: number | string | null;
  order_index?: number;
  is_active?: boolean;
};

type Line = {
  id: string;
  trip_id?: string | null;
  name?: string | null;
  code?: string | null;
  description?: string | null;
  start_city?: string | null;
  end_city?: string | null;
  color?: string | null;
  status?: string | null;
  created_at?: string | null;
  sundra_trips?: Trip | null;
  sundra_line_stops?: LineStop[];
};

const EMPTY_STOP: LineStop = {
  stop_name: "",
  stop_city: "",
  departure_time: "",
  price: "",
  order_index: 1,
  is_active: true,
};

const EMPTY_FORM = {
  id: "",
  trip_id: "",
  name: "",
  code: "",
  description: "",
  start_city: "",
  end_city: "",
  color: "#194C66",
  status: "active",
  stops: [{ ...EMPTY_STOP }],
};

function statusLabel(status?: string | null) {
  if (status === "active") return "Aktiv";
  if (status === "draft") return "Utkast";
  if (status === "inactive") return "Inaktiv";
  return status || "—";
}

function statusClass(status?: string | null) {
  if (status === "active") return "bg-green-100 text-green-700";
  if (status === "inactive") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function money(value?: number | string | null) {
  const n = Number(value || 0);
  return n.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function tidyTime(value?: string | null) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

export default function SundraLinesPage() {
  const [loading, setLoading] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const isEditing = Boolean(form.id);

  function update(key: string, value: any) {
    setForm((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateStop(index: number, key: keyof LineStop, value: any) {
    setForm((prev: any) => {
      const stops = [...prev.stops];
      stops[index] = {
        ...stops[index],
        [key]: value,
      };
      return { ...prev, stops };
    });
  }

  function addStop() {
    setForm((prev: any) => ({
      ...prev,
      stops: [
        ...prev.stops,
        {
          ...EMPTY_STOP,
          order_index: prev.stops.length + 1,
        },
      ],
    }));
  }

  function removeStop(index: number) {
    setForm((prev: any) => {
      const stops = prev.stops
        .filter((_: any, i: number) => i !== index)
        .map((stop: LineStop, i: number) => ({
          ...stop,
          order_index: i + 1,
        }));

      return {
        ...prev,
        stops: stops.length ? stops : [{ ...EMPTY_STOP }],
      };
    });
  }

  async function loadTrips() {
    try {
      setLoadingTrips(true);

      const res = await fetch("/api/admin/sundra/trips");
      const json = await res.json().catch(() => ({}));

      setTrips(Array.isArray(json?.trips) ? json.trips : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTrips(false);
    }
  }

  async function loadLines() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/lines");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta linjer.");
      }

      setLines(json.lines || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
    loadLines();
  }, []);

  function editLine(line: Line) {
    setForm({
      id: line.id,
      trip_id: line.trip_id || "",
      name: line.name || "",
      code: line.code || "",
      description: line.description || "",
      start_city: line.start_city || "",
      end_city: line.end_city || "",
      color: line.color || "#194C66",
      status: line.status || "active",
      stops:
        line.sundra_line_stops && line.sundra_line_stops.length
          ? line.sundra_line_stops.map((stop, index) => ({
              stop_name: stop.stop_name || "",
              stop_city: stop.stop_city || "",
              departure_time: stop.departure_time
                ? String(stop.departure_time).slice(0, 5)
                : "",
              price: stop.price ?? "",
              order_index: stop.order_index || index + 1,
              is_active: stop.is_active !== false,
            }))
          : [{ ...EMPTY_STOP }],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  async function save() {
    try {
      setSaving(true);
      setError("");

      if (!form.name.trim()) {
        throw new Error("Linjenamn saknas.");
      }

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch("/api/admin/sundra/lines", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          stops: form.stops.map((stop: LineStop, index: number) => ({
            ...stop,
            order_index: index + 1,
            price:
              stop.price === "" || stop.price === null || stop.price === undefined
                ? 0
                : Number(stop.price),
          })),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte spara linje.");
      }

      resetForm();
      await loadLines();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: lines.length,
      active: lines.filter((l) => l.status === "active").length,
      stops: lines.reduce(
        (sum, line) => sum + Number(line.sundra_line_stops?.length || 0),
        0
      ),
    };
  }, [lines]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Linjer & hållplatspriser
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Koppla linjer till resor och sätt pris per hållplats.
              </p>
            </div>

            <button
              onClick={loadLines}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Stat title="Totala linjer" value={stats.total} />
            <Stat title="Aktiva linjer" value={stats.active} />
            <Stat title="Hållplatser" value={stats.stops} />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#194C66]">
                    {isEditing ? "Redigera linje" : "Skapa linje"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Lägg in linje, koppla till resa och sätt pris per hållplats.
                  </p>
                </div>

                {isEditing && (
                  <button
                    onClick={resetForm}
                    className="rounded-full border bg-white px-3 py-1 text-xs font-semibold text-[#194C66]"
                  >
                    Ny linje
                  </button>
                )}
              </div>

              <div className="mt-5 space-y-4">
                <Field label="Koppla till resa">
                  <select
                    value={form.trip_id}
                    onChange={(e) => update("trip_id", e.target.value)}
                    disabled={loadingTrips}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="">
                      {loadingTrips ? "Laddar resor..." : "Ingen resa vald"}
                    </option>

                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                        {trip.destination ? ` – ${trip.destination}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Linjenamn">
                    <input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Linje 1 Malmö"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Linjekod">
                    <input
                      value={form.code}
                      onChange={(e) => update("code", e.target.value)}
                      placeholder="L1"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Startort">
                    <input
                      value={form.start_city}
                      onChange={(e) => update("start_city", e.target.value)}
                      placeholder="Malmö"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Slutort">
                    <input
                      value={form.end_city}
                      onChange={(e) => update("end_city", e.target.value)}
                      placeholder="Gekås Ullared"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Beskrivning">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Beskrivning av linjen..."
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="rounded-2xl border bg-[#f8fafc] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#194C66]">
                        Hållplatser & priser
                      </h3>
                      <p className="text-xs text-gray-500">
                        Exempel: Malmö C – 749 kr – 05:00.
                      </p>
                    </div>

                    <button
                      onClick={addStop}
                      className="rounded-full bg-[#194C66] px-4 py-2 text-xs font-semibold text-white"
                    >
                      + Lägg till
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.stops.map((stop: LineStop, index: number) => (
                      <div
                        key={index}
                        className="rounded-2xl border bg-white p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="font-semibold text-[#194C66]">
                            Hållplats {index + 1}
                          </div>

                          <button
                            onClick={() => removeStop(index)}
                            className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                          >
                            Ta bort
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Hållplats">
                            <input
                              value={stop.stop_name || ""}
                              onChange={(e) =>
                                updateStop(index, "stop_name", e.target.value)
                              }
                              placeholder="Malmö Central"
                              className="w-full rounded-xl border px-3 py-2"
                            />
                          </Field>

                          <Field label="Ort">
                            <input
                              value={stop.stop_city || ""}
                              onChange={(e) =>
                                updateStop(index, "stop_city", e.target.value)
                              }
                              placeholder="Malmö"
                              className="w-full rounded-xl border px-3 py-2"
                            />
                          </Field>

                          <Field label="Avgångstid">
                            <input
                              type="time"
                              value={stop.departure_time || ""}
                              onChange={(e) =>
                                updateStop(index, "departure_time", e.target.value)
                              }
                              className="w-full rounded-xl border px-3 py-2"
                            />
                          </Field>

                          <Field label="Pris från denna hållplats">
                            <input
                              type="number"
                              value={stop.price ?? ""}
                              onChange={(e) =>
                                updateStop(index, "price", e.target.value)
                              }
                              placeholder="749"
                              className="w-full rounded-xl border px-3 py-2"
                            />
                          </Field>
                        </div>

                        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={stop.is_active !== false}
                            onChange={(e) =>
                              updateStop(index, "is_active", e.target.checked)
                            }
                          />
                          Aktiv hållplats
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white hover:bg-[#16384d] disabled:opacity-50"
                >
                  {saving
                    ? "Sparar..."
                    : isEditing
                      ? "Spara ändringar"
                      : "Skapa linje"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-white shadow">
              <div className="border-b p-5">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Alla linjer
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-gray-500">
                  Laddar linjer...
                </div>
              ) : lines.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  Inga linjer skapade ännu.
                </div>
              ) : (
                <div className="divide-y">
                  {lines.map((line) => (
                    <div key={line.id} className="p-5 hover:bg-[#f8fafc]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="mt-1 h-5 w-5 rounded-full border"
                            style={{
                              backgroundColor: line.color || "#194C66",
                            }}
                          />

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-[#0f172a]">
                                {line.name}
                              </h3>

                              {line.code && (
                                <span className="rounded-full bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-gray-600">
                                  {line.code}
                                </span>
                              )}

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                  line.status
                                )}`}
                              >
                                {statusLabel(line.status)}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-gray-500">
                              {line.start_city || "—"} → {line.end_city || "—"}
                            </p>

                            {line.sundra_trips?.title && (
                              <p className="mt-1 text-xs font-semibold text-[#194C66]">
                                Resa: {line.sundra_trips.title}
                              </p>
                            )}

                            {line.description && (
                              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                                {line.description}
                              </p>
                            )}

                            {line.sundra_line_stops &&
                              line.sundra_line_stops.length > 0 && (
                                <div className="mt-4 overflow-hidden rounded-2xl border">
                                  <table className="w-full text-left text-sm">
                                    <thead className="bg-[#f8fafc] text-xs text-gray-500">
                                      <tr>
                                        <th className="px-3 py-2">#</th>
                                        <th className="px-3 py-2">Hållplats</th>
                                        <th className="px-3 py-2">Tid</th>
                                        <th className="px-3 py-2">Pris</th>
                                      </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                      {line.sundra_line_stops.map(
                                        (stop, index) => (
                                          <tr key={stop.id || index}>
                                            <td className="px-3 py-2 text-gray-400">
                                              {index + 1}
                                            </td>
                                            <td className="px-3 py-2">
                                              <div className="font-medium">
                                                {stop.stop_name}
                                              </div>
                                              {stop.stop_city && (
                                                <div className="text-xs text-gray-500">
                                                  {stop.stop_city}
                                                </div>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              {tidyTime(stop.departure_time)}
                                            </td>
                                            <td className="px-3 py-2 font-semibold text-[#194C66]">
                                              {money(stop.price)}
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                          </div>
                        </div>

                        <button
                          onClick={() => editLine(line)}
                          className="rounded-full bg-[#194C66] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Redigera
                        </button>
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
