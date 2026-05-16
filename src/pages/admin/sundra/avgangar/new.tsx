import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Trip = {
  id: string;
  title?: string;
  destination?: string;
};

type Line = {
  id: string;
  name?: string | null;
  code?: string | null;
  color?: string | null;
  status?: string | null;
  trip_id?: string | null;
  start_city?: string | null;
  end_city?: string | null;
};

type BusMap = {
  id: string;
  name: string;
  seats_count?: number | null;
  bus_type?: string | null;
  status?: string | null;
};

type Vehicle = {
  id: string;
  name: string;
  registration_number?: string | null;
  operator_name?: string | null;
  seats_count?: number | null;
  bus_map_id?: string | null;
  status?: string | null;
  sundra_bus_maps?: {
    id: string;
    name: string;
    seats_count?: number | null;
  } | null;
};

export default function NewDeparturePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingLines, setLoadingLines] = useState(true);
  const [loadingBusMaps, setLoadingBusMaps] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [error, setError] = useState("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [busMaps, setBusMaps] = useState<BusMap[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [form, setForm] = useState({
    trip_id: "",
    line_ids: [] as string[],

    vehicle_id: "",
    bus_map_id: "",

    departure_date: "",
    departure_time: "",

    return_date: "",
    return_time: "",

    price: "",
    capacity: "50",

    booking_deadline: "",

    departure_location: "",
    destination_location: "",

    status: "open",

    notes: "",
  });

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function toggleLine(lineId: string) {
    setForm((prev) => {
      const exists = prev.line_ids.includes(lineId);

      return {
        ...prev,
        line_ids: exists
          ? prev.line_ids.filter((id) => id !== lineId)
          : [...prev.line_ids, lineId],
      };
    });
  }

  async function loadTrips() {
    try {
      setLoadingTrips(true);

      const res = await fetch("/api/admin/sundra/trips");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta resor.");
      }

      setTrips(json.trips || []);
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta resor.");
    } finally {
      setLoadingTrips(false);
    }
  }

  async function loadLines() {
    try {
      setLoadingLines(true);

      const res = await fetch("/api/admin/sundra/lines");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta linjer.");
      }

      setLines(json.lines || []);
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta linjer.");
    } finally {
      setLoadingLines(false);
    }
  }

  async function loadBusMaps() {
    try {
      setLoadingBusMaps(true);

      const res = await fetch("/api/admin/sundra/bus-maps");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta busskartor.");
      }

      setBusMaps(
        (json.bus_maps || []).filter(
          (map: BusMap) => map.status !== "inactive"
        )
      );
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta busskartor.");
    } finally {
      setLoadingBusMaps(false);
    }
  }

  async function loadVehicles() {
    try {
      setLoadingVehicles(true);

      const res = await fetch("/api/admin/sundra/vehicles");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta fordon.");
      }

      setVehicles(
        (json.vehicles || []).filter(
          (vehicle: Vehicle) => vehicle.status !== "inactive"
        )
      );
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta fordon.");
    } finally {
      setLoadingVehicles(false);
    }
  }

  useEffect(() => {
    loadTrips();
    loadLines();
    loadBusMaps();
    loadVehicles();
  }, []);

  async function save() {
    try {
      setSaving(true);
      setError("");

      if (!form.trip_id) {
        throw new Error("Välj en resa.");
      }

      if (!form.departure_date) {
        throw new Error("Välj avgångsdatum.");
      }

      const res = await fetch("/api/admin/sundra/departures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          line_ids: form.line_ids || [],
          vehicle_id: form.vehicle_id || null,
          bus_map_id: form.bus_map_id || null,
          price: Number(form.price || 0),
          capacity: Number(form.capacity || 0),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa avgång.");
      }

      router.push(`/admin/sundra/avgangar/${json.departure.id}`);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  const selectedVehicle = vehicles.find(
    (vehicle) => vehicle.id === form.vehicle_id
  );

  const selectedBusMap = busMaps.find((map) => map.id === form.bus_map_id);

  const selectedLines = lines.filter((line) => form.line_ids.includes(line.id));

  const filteredLines = useMemo(() => {
    if (!form.trip_id) return lines;

    const tripLines = lines.filter((line) => line.trip_id === form.trip_id);

    return tripLines.length > 0 ? tripLines : lines;
  }, [lines, form.trip_id]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Skapa avgång
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa ny avgång och koppla flera linjer till samma resa.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/sundra/avgangar")}
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

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="mb-5 text-lg font-semibold text-[#194C66]">
                Avgångsinformation
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Resa">
                  <select
                    value={form.trip_id}
                    onChange={(e) => {
                      update("trip_id", e.target.value);
                      update("line_ids", []);
                    }}
                    className="w-full rounded-xl border px-3 py-2"
                    disabled={loadingTrips}
                  >
                    <option value="">
                      {loadingTrips ? "Laddar resor..." : "Välj resa"}
                    </option>

                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                        {trip.destination ? ` • ${trip.destination}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="open">Öppen för bokning</option>
                    <option value="closed">Stängd</option>
                    <option value="full">Fullbokad</option>
                    <option value="cancelled">Inställd</option>
                    <option value="draft">Utkast</option>
                  </select>
                </Field>

                <div className="md:col-span-2">
                  <Field label="Linjer">
                    <div className="space-y-2 rounded-xl border bg-white p-3">
                      {loadingLines ? (
                        <div className="text-sm text-gray-500">
                          Laddar linjer...
                        </div>
                      ) : filteredLines.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          Inga linjer hittades.
                        </div>
                      ) : (
                        filteredLines.map((line) => {
                          const checked = form.line_ids.includes(line.id);

                          return (
                            <label
                              key={line.id}
                              className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-3 transition ${
                                checked
                                  ? "border-[#194C66] bg-[#eef5f9]"
                                  : "hover:bg-[#f8fafc]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleLine(line.id)}
                                  className="h-4 w-4"
                                />

                                <div>
                                  <div className="font-medium text-[#0f172a]">
                                    {line.name}
                                  </div>

                                  <div className="text-xs text-gray-500">
                                    {line.start_city || "—"} →{" "}
                                    {line.end_city || "—"}
                                  </div>
                                </div>
                              </div>

                              {line.code && (
                                <span className="rounded-full bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-gray-600">
                                  {line.code}
                                </span>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>

                    <p className="mt-2 text-xs text-[#194C66]/70">
                      Du kan välja flera linjer, exempelvis Malmö, Blekinge och
                      Helsingborg på samma avgång.
                    </p>
                  </Field>
                </div>

                <Field label="Avgångsdatum">
                  <input
                    type="date"
                    value={form.departure_date}
                    onChange={(e) => update("departure_date", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Avgångstid">
                  <input
                    type="time"
                    value={form.departure_time}
                    onChange={(e) => update("departure_time", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Returdatum">
                  <input
                    type="date"
                    value={form.return_date}
                    onChange={(e) => update("return_date", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Returtid">
                  <input
                    type="time"
                    value={form.return_time}
                    onChange={(e) => update("return_time", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Fordon">
                  <select
                    value={form.vehicle_id}
                    onChange={(e) => {
                      const vehicleId = e.target.value;
                      update("vehicle_id", vehicleId);

                      const vehicle = vehicles.find((v) => v.id === vehicleId);

                      if (vehicle?.bus_map_id) {
                        update("bus_map_id", vehicle.bus_map_id);
                      }

                      if (vehicle?.seats_count) {
                        update("capacity", String(vehicle.seats_count));
                      }
                    }}
                    disabled={loadingVehicles}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="">
                      {loadingVehicles ? "Laddar fordon..." : "Inget fordon valt"}
                    </option>

                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                        {vehicle.registration_number
                          ? ` • ${vehicle.registration_number}`
                          : ""}
                        {vehicle.seats_count
                          ? ` • ${vehicle.seats_count} platser`
                          : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Busskarta / säteskarta">
                  <select
                    value={form.bus_map_id}
                    onChange={(e) => {
                      const busMapId = e.target.value;
                      update("bus_map_id", busMapId);

                      const map = busMaps.find((m) => m.id === busMapId);

                      if (map?.seats_count) {
                        update("capacity", String(map.seats_count));
                      }
                    }}
                    disabled={loadingBusMaps}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="">
                      {loadingBusMaps
                        ? "Laddar busskartor..."
                        : "Ingen busskarta vald"}
                    </option>

                    {busMaps.map((map) => (
                      <option key={map.id} value={map.id}>
                        {map.name}
                        {map.seats_count ? ` • ${map.seats_count} platser` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Grundpris">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Kapacitet">
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => update("capacity", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Sista bokningsdag">
                  <input
                    type="date"
                    value={form.booking_deadline}
                    onChange={(e) => update("booking_deadline", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Från / samlingsplats">
                  <input
                    value={form.departure_location}
                    onChange={(e) => update("departure_location", e.target.value)}
                    placeholder="Ex. Helsingborg C"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Destination / slutplats">
                  <input
                    value={form.destination_location}
                    onChange={(e) =>
                      update("destination_location", e.target.value)
                    }
                    placeholder="Ex. Gekås Ullared"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Anteckningar">
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Sammanfattning
              </h2>

              <div className="mt-5 space-y-4 text-sm">
                <Summary label="Valda linjer" value={`${selectedLines.length}`} />

                <div className="rounded-xl bg-[#f8fafc] p-3">
                  {selectedLines.length === 0 ? (
                    <div className="text-gray-500">Inga linjer valda</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedLines.map((line) => (
                        <span
                          key={line.id}
                          className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]"
                        >
                          {line.name}
                          {line.code ? ` (${line.code})` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Summary
                  label="Fordon"
                  value={selectedVehicle?.name || "Inget valt"}
                />

                <Summary
                  label="Busskarta"
                  value={selectedBusMap?.name || "Ingen vald"}
                />

                <Summary label="Kapacitet" value={form.capacity || "0"} />

                <Summary
                  label="Avgång"
                  value={
                    form.departure_date
                      ? `${form.departure_date} ${form.departure_time || ""}`
                      : "Ej valt"
                  }
                />
              </div>

              <button
                onClick={save}
                disabled={saving || !form.trip_id || !form.departure_date}
                className="mt-6 w-full rounded-xl bg-[#194C66] px-4 py-3 font-semibold text-white hover:bg-[#16384d] disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Skapa avgång"}
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

function Summary({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-[#0f172a]">{value}</span>
    </div>
  );
}
