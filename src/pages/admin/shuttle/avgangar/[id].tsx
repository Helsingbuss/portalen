import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type StopForm = {
  id?: string;
  line_id?: string | null;
  line_stop_id?: string | null;
  stop_id?: string | null;
  stop_name?: string | null;
  city?: string | null;
  stop_order?: number | null;
  scheduled_time?: string | null;
  price?: number | string | null;
  direction?: string | null;
  is_return?: boolean | null;
};

function tidyDate(value: any) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function tidyTime(value: any) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

export default function EditShuttleDeparturePage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [departure, setDeparture] = useState<any>(null);
  const [stops, setStops] = useState<StopForm[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDeparture() {
    if (!id || id === "undefined") return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/shuttle/departures/${id}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Kunde inte hämta avgång.");
      }

      const loaded = json.departure;

      setDeparture({
        ...loaded,
        departure_date: tidyDate(loaded.departure_date),
        departure_time: tidyTime(loaded.departure_time),
        booking_deadline: loaded.booking_deadline
          ? String(loaded.booking_deadline).slice(0, 16)
          : "",
      });

      setStops(
        Array.isArray(loaded.shuttle_departure_stops)
          ? loaded.shuttle_departure_stops.map((stop: any) => ({
              ...stop,
              scheduled_time: tidyTime(stop.scheduled_time),
              price: String(stop.price ?? 0),
            }))
          : []
      );
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta avgång.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeparture();
  }, [id]);

  function updateDeparture(key: string, value: any) {
    setDeparture((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateStop(index: number, key: keyof StopForm, value: any) {
    setStops((prev) =>
      prev.map((stop, i) =>
        i === index
          ? {
              ...stop,
              [key]: value,
            }
          : stop
      )
    );
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        route_id: departure.route_id || null,
        line_id: departure.line_id || null,

        departure_date: departure.departure_date || null,
        departure_time: departure.departure_time || null,

        departure_location: departure.departure_location || null,
        destination_location: departure.destination_location || null,

        price: departure.price || 0,
        capacity: departure.capacity || 0,
        booked_count: departure.booked_count || 0,

        status: departure.status || "open",
        booking_deadline: departure.booking_deadline || null,
        notes: departure.notes || null,

        direction: departure.direction || "outbound",
        is_return: departure.is_return === true,

        stops,
      };

      const res = await fetch(`/api/admin/shuttle/departures/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Kunde inte spara avgång.");
      }

      setSuccess("Avgången är uppdaterad.");
      await loadDeparture();
    } catch (e: any) {
      setError(e?.message || "Kunde inte spara avgång.");
    } finally {
      setSaving(false);
    }
  }

  async function removeDeparture() {
    const ok = window.confirm(
      "Vill du verkligen ta bort denna avgång? Detta tar även bort hållplatstiderna för avgången."
    );

    if (!ok) return;

    try {
      setDeleting(true);
      setError("");

      const res = await fetch(`/api/admin/shuttle/departures/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Kunde inte ta bort avgång.");
      }

      router.push("/admin/shuttle/avgangar");
    } catch (e: any) {
      setError(e?.message || "Kunde inte ta bort avgång.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Redigera avgång
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Ändra datum, tid, pris, status och hållplatstider.
              </p>
            </div>

            <Link
              href="/admin/shuttle/avgangar"
              className="rounded-full border border-[#194C66]/20 px-5 py-3 text-sm font-semibold text-[#194C66]"
            >
              Tillbaka
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {success}
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow">
              Laddar avgång...
            </div>
          ) : !departure ? (
            <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow">
              Avgången kunde inte hittas.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-3xl bg-white p-6 shadow xl:col-span-2">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]">
                    {departure.direction === "return" || departure.is_return
                      ? "Retur"
                      : "Utresa"}
                  </span>

                  <span className="rounded-full bg-[#f5f4f0] px-3 py-1 text-xs text-gray-600">
                    {departure.shuttle_lines?.name ||
                      departure.shuttle_routes?.name ||
                      "Flygbuss"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Field label="Datum">
                    <input
                      type="date"
                      value={departure.departure_date || ""}
                      onChange={(e) =>
                        updateDeparture("departure_date", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                    />
                  </Field>

                  <Field label="Tid">
                    <input
                      type="time"
                      value={departure.departure_time || ""}
                      onChange={(e) =>
                        updateDeparture("departure_time", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                    />
                  </Field>

                  <Field label="Pris">
                    <input
                      value={departure.price ?? ""}
                      onChange={(e) => updateDeparture("price", e.target.value)}
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                      inputMode="decimal"
                    />
                  </Field>

                  <Field label="Kapacitet">
                    <input
                      value={departure.capacity ?? ""}
                      onChange={(e) =>
                        updateDeparture("capacity", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                      inputMode="numeric"
                    />
                  </Field>

                  <Field label="Från">
                    <input
                      value={departure.departure_location || ""}
                      onChange={(e) =>
                        updateDeparture("departure_location", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                    />
                  </Field>

                  <Field label="Till">
                    <input
                      value={departure.destination_location || ""}
                      onChange={(e) =>
                        updateDeparture("destination_location", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                    />
                  </Field>

                  <Field label="Status">
                    <select
                      value={departure.status || "open"}
                      onChange={(e) => updateDeparture("status", e.target.value)}
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                    >
                      <option value="open">Öppen</option>
                      <option value="closed">Stängd</option>
                      <option value="cancelled">Inställd</option>
                      <option value="draft">Utkast</option>
                    </select>
                  </Field>

                  <Field label="Bokningsstopp">
                    <input
                      type="datetime-local"
                      value={departure.booking_deadline || ""}
                      onChange={(e) =>
                        updateDeparture("booking_deadline", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                    />
                  </Field>
                </div>

                <label className="mt-5 block">
                  <span className="mb-1 block text-sm text-[#194C66]/80">
                    Intern notering
                  </span>
                  <textarea
                    value={departure.notes || ""}
                    onChange={(e) => updateDeparture("notes", e.target.value)}
                    className="min-h-[100px] w-full rounded-xl border px-3 py-3 text-sm"
                  />
                </label>

                <div className="mt-8 rounded-3xl border border-[#e5eef3] bg-[#f8fafc] p-5">
                  <h2 className="text-lg font-semibold text-[#194C66]">
                    Hållplatser
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Här kan du ändra tider och pris per hållplats.
                  </p>

                  {stops.length === 0 ? (
                    <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-gray-500">
                      Inga hållplatser är kopplade till denna avgång.
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-[#e5eef3] text-[#194C66]">
                          <tr>
                            <th className="px-3 py-2 text-left">Ordning</th>
                            <th className="px-3 py-2 text-left">Hållplats</th>
                            <th className="px-3 py-2 text-left">Stad</th>
                            <th className="px-3 py-2 text-left">Tid</th>
                            <th className="px-3 py-2 text-left">Pris</th>
                          </tr>
                        </thead>

                        <tbody>
                          {stops.map((stop, index) => (
                            <tr key={stop.id || index} className="border-b">
                              <td className="px-3 py-2">
                                <input
                                  value={stop.stop_order ?? index + 1}
                                  onChange={(e) =>
                                    updateStop(
                                      index,
                                      "stop_order",
                                      Number(e.target.value || index + 1)
                                    )
                                  }
                                  className="w-[70px] rounded-lg border px-2 py-1 text-sm"
                                  inputMode="numeric"
                                />
                              </td>

                              <td className="px-3 py-2 font-medium text-[#194C66]">
                                {stop.stop_name || "Hållplats"}
                              </td>

                              <td className="px-3 py-2">
                                {stop.city || "—"}
                              </td>

                              <td className="px-3 py-2">
                                <input
                                  type="time"
                                  value={tidyTime(stop.scheduled_time)}
                                  onChange={(e) =>
                                    updateStop(
                                      index,
                                      "scheduled_time",
                                      e.target.value
                                    )
                                  }
                                  className="w-[120px] rounded-lg border px-2 py-1 text-sm"
                                />
                              </td>

                              <td className="px-3 py-2">
                                <input
                                  value={stop.price ?? ""}
                                  onChange={(e) =>
                                    updateStop(index, "price", e.target.value)
                                  }
                                  className="w-[100px] rounded-lg border px-2 py-1 text-sm"
                                  inputMode="decimal"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap justify-between gap-3">
                  <button
                    onClick={removeDeparture}
                    disabled={deleting}
                    className="rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"
                  >
                    {deleting ? "Tar bort..." : "Ta bort avgång"}
                  </button>

                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-full bg-[#194C66] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Sparar..." : "Spara ändringar"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Sammanfattning
                </h2>

                <div className="mt-5 rounded-2xl bg-[#f5f4f0] p-4 text-sm">
                  <p className="font-semibold text-[#194C66]">
                    {departure.departure_location || "Från"} →{" "}
                    {departure.destination_location || "Till"}
                  </p>

                  <p className="mt-2 text-gray-600">
                    {departure.departure_date} kl. {departure.departure_time}
                  </p>

                  <p className="mt-2 font-semibold text-[#194C66]">
                    {departure.price || 0} kr · {departure.capacity || 0} platser
                  </p>

                  <p className="mt-2 text-gray-500">
                    {stops.length} hållplatser kopplade
                  </p>
                </div>
              </div>
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
  children: any;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-[#194C66]/80">{label}</span>
      {children}
    </label>
  );
}
