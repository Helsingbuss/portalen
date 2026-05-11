import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type BusMap = {
  id: string;
  name: string;
  seats_count?: number | null;
  sundra_bus_map_seats?: Seat[];
};

type Seat = {
  id: string;
  seat_number: string;
  row_number?: number | null;
  seat_column?: string | null;
  seat_price?: number | null;
  is_blocked?: boolean | null;
  is_selectable?: boolean | null;
};

type Vehicle = {
  id: string;
  name: string;
  registration_number?: string | null;
  operator_name?: string | null;
  vehicle_type?: string | null;
  seats_count?: number | null;
  bus_map_id?: string | null;
  status?: string | null;
  notes?: string | null;
};

export default function VehicleDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maps, setMaps] = useState<BusMap[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    registration_number: "",
    operator_name: "",
    vehicle_type: "coach",
    seats_count: "0",
    bus_map_id: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    loadMaps();
  }, []);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    loadVehicle(id);
  }, [id]);

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSavedMessage("");
  }

  async function loadVehicle(vehicleId: string) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/sundra/vehicles/${vehicleId}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta fordon.");
      }

      const v = json.vehicle;

      setVehicle(v);

      setForm({
        name: v.name || "",
        registration_number: v.registration_number || "",
        operator_name: v.operator_name || "",
        vehicle_type: v.vehicle_type || "coach",
        seats_count:
          v.seats_count === null || v.seats_count === undefined
            ? "0"
            : String(v.seats_count),
        bus_map_id: v.bus_map_id || "",
        status: v.status || "active",
        notes: v.notes || "",
      });
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMaps() {
    try {
      setLoadingMaps(true);

      const res = await fetch("/api/admin/sundra/bus-maps");
      const json = await res.json().catch(() => ({}));

      if (res.ok && json?.ok) {
        setMaps(json.bus_maps || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMaps(false);
    }
  }

  async function save() {
    if (!id || typeof id !== "string") return;

    try {
      setSaving(true);
      setError("");
      setSavedMessage("");

      if (!form.name.trim()) {
        throw new Error("Fordonsnamn saknas.");
      }

      const res = await fetch(`/api/admin/sundra/vehicles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          bus_map_id: form.bus_map_id || null,
          seats_count: Number(form.seats_count || 0),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte spara fordon.");
      }

      setVehicle(json.vehicle);
      setSavedMessage("Sparat ✔");
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  async function removeVehicle() {
    if (!id || typeof id !== "string") return;

    const ok = confirm(
      "Är du säker på att du vill ta bort fordonet? Detta går inte att ångra."
    );

    if (!ok) return;

    try {
      setError("");

      const res = await fetch(`/api/admin/sundra/vehicles/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte ta bort fordon.");
      }

      router.push("/admin/sundra/fordon");
    } catch (e: any) {
      setError(e?.message || "Något gick fel vid borttagning.");
    }
  }

  const selectedMap = useMemo(() => {
    return maps.find((m) => m.id === form.bus_map_id) || null;
  }, [maps, form.bus_map_id]);

  const groupedSeats = useMemo(() => {
    const seats = selectedMap?.sundra_bus_map_seats || [];

    return seats.reduce((acc: Record<string, Seat[]>, seat) => {
      const row = String(seat.row_number || 0);
      if (!acc[row]) acc[row] = [];
      acc[row].push(seat);
      return acc;
    }, {});
  }, [selectedMap]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                {loading ? "Laddar fordon..." : form.name || "Fordon"}
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Redigera fordon och koppla rätt platskarta.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/sundra/fordon")}
              className="rounded-xl border bg-white px-4 py-2 text-sm text-[#194C66]"
            >
              Tillbaka
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow">
              Laddar...
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <section className="rounded-3xl bg-white p-6 shadow">
                <h2 className="mb-5 text-lg font-semibold text-[#194C66]">
                  Fordonsinformation
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Fordonsnamn">
                    <input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Registreringsnummer">
                    <input
                      value={form.registration_number}
                      onChange={(e) =>
                        update("registration_number", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Operatör">
                    <input
                      value={form.operator_name}
                      onChange={(e) => update("operator_name", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Busstyp">
                    <select
                      value={form.vehicle_type}
                      onChange={(e) => update("vehicle_type", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="coach">Turistbuss</option>
                      <option value="doubledeck">Dubbeldäckare</option>
                      <option value="sprinter">Sprinter</option>
                    </select>
                  </Field>

                  <Field label="Antal säten">
                    <input
                      type="number"
                      value={form.seats_count}
                      onChange={(e) => update("seats_count", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) => update("status", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="active">Aktiv</option>
                      <option value="maintenance">Service</option>
                      <option value="inactive">Inaktiv</option>
                    </select>
                  </Field>

                  <Field label="Platskarta">
                    <select
                      value={form.bus_map_id}
                      onChange={(e) => {
                        const mapId = e.target.value;
                        update("bus_map_id", mapId);

                        const map = maps.find((m) => m.id === mapId);

                        if (map?.seats_count) {
                          update("seats_count", String(map.seats_count));
                        }
                      }}
                      disabled={loadingMaps}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="">
                        {loadingMaps ? "Laddar..." : "Ingen platskarta vald"}
                      </option>

                      {maps.map((map) => (
                        <option key={map.id} value={map.id}>
                          {map.name} ({map.seats_count || 0} säten)
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Intern notering">
                    <textarea
                      rows={5}
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-2xl bg-[#194C66] px-6 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Sparar..." : "Spara fordon"}
                  </button>

                  <button
                    onClick={removeVehicle}
                    className="rounded-2xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-700 hover:bg-red-50"
                  >
                    Ta bort fordon
                  </button>
                </div>

                {savedMessage && (
                  <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                    {savedMessage}
                  </div>
                )}
              </section>

              <aside className="space-y-6">
                <section className="rounded-3xl bg-white p-6 shadow">
                  <h2 className="text-lg font-semibold text-[#194C66]">
                    Platskarta
                  </h2>

                  {!selectedMap ? (
                    <div className="mt-4 rounded-2xl bg-[#f8fafc] p-4 text-sm text-gray-500">
                      Ingen platskarta kopplad till detta fordon.
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 rounded-2xl bg-[#f8fafc] p-4">
                        <div className="font-semibold text-[#194C66]">
                          {selectedMap.name}
                        </div>

                        <div className="mt-1 text-sm text-gray-500">
                          {selectedMap.seats_count || 0} säten
                        </div>
                      </div>

                      <div className="mt-5 max-h-[520px] overflow-auto rounded-2xl border bg-[#f8fafc] p-4">
                        {Object.keys(groupedSeats).length === 0 ? (
                          <div className="text-sm text-gray-500">
                            Inga säten hittades.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {Object.keys(groupedSeats)
                              .sort((a, b) => Number(a) - Number(b))
                              .map((row) => (
                                <div key={row} className="flex items-center gap-2">
                                  <div className="w-7 text-xs font-semibold text-gray-500">
                                    {row}
                                  </div>

                                  <div className="flex gap-1">
                                    {groupedSeats[row]
                                      .sort((a, b) =>
                                        String(a.seat_column || "").localeCompare(
                                          String(b.seat_column || "")
                                        )
                                      )
                                      .map((seat) => (
                                        <div
                                          key={seat.id}
                                          className={`flex h-10 w-10 flex-col items-center justify-center rounded-lg border text-[10px] ${
                                            seat.is_blocked
                                              ? "border-red-300 bg-red-100 text-red-700"
                                              : Number(seat.seat_price || 0) > 0
                                                ? "border-amber-300 bg-amber-100 text-amber-700"
                                                : "border-[#d7e6ee] bg-white text-[#194C66]"
                                          }`}
                                        >
                                          <span className="font-bold">
                                            {seat.seat_number}
                                          </span>
                                          {Number(seat.seat_price || 0) > 0 && (
                                            <span>{seat.seat_price} kr</span>
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
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
