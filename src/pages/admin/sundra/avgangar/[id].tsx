import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
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
};

type DepartureForm = {
  trip_id: string;
  line_ids: string[];

  vehicle_id: string;
  bus_map_id: string;

  departure_date: string;
  departure_time: string;
  return_date: string;
  return_time: string;

  price: string;
  capacity: string;
  booked_count: string;

  status: string;
  last_booking_date: string;
};

const EMPTY_FORM: DepartureForm = {
  trip_id: "",
  line_ids: [],

  vehicle_id: "",
  bus_map_id: "",

  departure_date: "",
  departure_time: "",
  return_date: "",
  return_time: "",

  price: "",
  capacity: "",
  booked_count: "0",

  status: "open",
  last_booking_date: "",
};

function statusLabel(status: string) {
  switch (status) {
    case "open":
      return "Öppen";
    case "closed":
      return "Stängd";
    case "full":
      return "Fullbokad";
    case "cancelled":
      return "Inställd";
    default:
      return status || "—";
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "open":
      return "bg-green-100 text-green-700";
    case "closed":
      return "bg-gray-100 text-gray-700";
    case "full":
      return "bg-orange-100 text-orange-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function fmtDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function tidyTime(time?: string | null) {
  if (!time) return "—";
  const s = String(time);
  if (s.includes(":")) return s.slice(0, 5);
  if (s.length >= 4) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return s;
}

function money(value?: string | number | null) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "—";

  return n.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

export default function SundraDepartureDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [busMaps, setBusMaps] = useState<BusMap[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [form, setForm] = useState<DepartureForm>(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingLines, setLoadingLines] = useState(true);
  const [loadingBusMaps, setLoadingBusMaps] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    loadTrips();
    loadLines();
    loadBusMaps();
    loadVehicles();
  }, []);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    loadDeparture(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      setLoadingLines(true);
      const res = await fetch("/api/admin/sundra/lines");
      const json = await res.json().catch(() => ({}));

      if (res.ok && json?.ok) {
        setLines(json.lines || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLines(false);
    }
  }

  async function loadBusMaps() {
    try {
      setLoadingBusMaps(true);
      const res = await fetch("/api/admin/sundra/bus-maps");
      const json = await res.json().catch(() => ({}));

      if (res.ok && json?.ok) {
        setBusMaps(
          (json.bus_maps || []).filter((map: BusMap) => map.status !== "inactive")
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBusMaps(false);
    }
  }

  async function loadVehicles() {
    try {
      setLoadingVehicles(true);
      const res = await fetch("/api/admin/sundra/vehicles");
      const json = await res.json().catch(() => ({}));

      if (res.ok && json?.ok) {
        setVehicles(
          (json.vehicles || []).filter(
            (vehicle: Vehicle) => vehicle.status !== "inactive"
          )
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function loadDeparture(departureId: string) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/sundra/departures/${departureId}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta avgången.");
      }

      const departure = json.departure;

      const lineIds =
        departure.sundra_departure_lines?.map((x: any) => x.line_id).filter(Boolean) ||
        (departure.line_id ? [departure.line_id] : []);

      setForm({
        trip_id: departure.trip_id || "",
        line_ids: lineIds,

        vehicle_id: departure.vehicle_id || "",
        bus_map_id: departure.bus_map_id || "",

        departure_date: departure.departure_date || "",
        departure_time: departure.departure_time
          ? String(departure.departure_time).slice(0, 5)
          : "",
        return_date: departure.return_date || "",
        return_time: departure.return_time
          ? String(departure.return_time).slice(0, 5)
          : "",

        price:
          departure.price === null || departure.price === undefined
            ? ""
            : String(departure.price),

        capacity:
          departure.capacity === null || departure.capacity === undefined
            ? ""
            : String(departure.capacity),

        booked_count:
          departure.booked_count === null || departure.booked_count === undefined
            ? "0"
            : String(departure.booked_count),

        status: departure.status || "open",
        last_booking_date: departure.last_booking_date || "",
      });
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  function update(key: keyof DepartureForm, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSavedMessage("");
  }

  function toggleLine(lineId: string) {
    setForm((prev) => {
      const exists = prev.line_ids.includes(lineId);

      return {
        ...prev,
        line_ids: exists
          ? prev.line_ids.filter((currentId) => currentId !== lineId)
          : [...prev.line_ids, lineId],
      };
    });

    setSavedMessage("");
  }

  async function save() {
    if (!id || typeof id !== "string") return;

    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      const res = await fetch(`/api/admin/sundra/departures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          line_ids: form.line_ids || [],
          vehicle_id: form.vehicle_id || null,
          bus_map_id: form.bus_map_id || null,
          price: Number(form.price || 0),
          capacity: Number(form.capacity || 0),
          booked_count: Number(form.booked_count || 0),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte spara avgången.");
      }

      setSavedMessage("Sparat ✔");
      await loadDeparture(id);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  async function removeDeparture() {
    if (!id || typeof id !== "string") return;

    const ok = confirm(
      "Är du säker på att du vill ta bort avgången? Detta går inte att ångra."
    );

    if (!ok) return;

    try {
      setError("");

      const res = await fetch(`/api/admin/sundra/departures/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte ta bort avgången.");
      }

      router.push("/admin/sundra/avgangar");
    } catch (e: any) {
      setError(e?.message || "Något gick fel vid borttagning.");
    }
  }

  const selectedTrip = trips.find((trip) => trip.id === form.trip_id);
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);
  const selectedBusMap = busMaps.find((map) => map.id === form.bus_map_id);

  const selectedLines = lines.filter((line) => form.line_ids.includes(line.id));

  const filteredLines = useMemo(() => {
    if (!form.trip_id) return lines;

    const tripLines = lines.filter((line) => line.trip_id === form.trip_id);
    return tripLines.length > 0 ? tripLines : lines;
  }, [lines, form.trip_id]);

  const capacity = Number(form.capacity || 0);
  const booked = Number(form.booked_count || 0);
  const seatsLeft = Math.max(0, capacity - booked);
  const fillPercent =
    capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;

  const title = selectedTrip?.title || "Avgång";

  const bookingStatusText =
    form.status === "open" && seatsLeft > 0
      ? "Öppen för bokning"
      : form.status === "full" || seatsLeft <= 0
        ? "Fullbokad"
        : form.status === "cancelled"
          ? "Inställd"
          : "Stängd";

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                {loading ? "Laddar avgång..." : title}
              </h1>
              <p className="text-sm text-[#194C66]/60">
                Hantera datum, flera linjer, kapacitet, pris, fordon,
                säteskarta och bokningsstatus.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push("/admin/sundra/avgangar")}
                className="rounded-[25px] border bg-white px-4 py-2 text-sm text-[#194C66] hover:bg-gray-50"
              >
                Tillbaka
              </button>

              {form.trip_id && (
                <button
                  onClick={() => router.push(`/admin/sundra/resor/${form.trip_id}`)}
                  className="rounded-[25px] border bg-white px-4 py-2 text-sm text-[#194C66] hover:bg-gray-50"
                >
                  Öppna resa
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow">
              Laddar avgång...
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-4">
                <StatCard label="Kapacitet" value={`${capacity || 0}`} sub="platser totalt" />
                <StatCard label="Bokade" value={`${booked || 0}`} sub="platser bokade" />
                <StatCard label="Lediga" value={`${seatsLeft}`} sub="platser kvar" />
                <StatCard label="Beläggning" value={`${fillPercent}%`} sub={bookingStatusText} />
              </section>

              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <section className="space-y-5 rounded-xl bg-white p-5 shadow">
                  <div>
                    <h2 className="text-lg font-semibold text-[#194C66]">
                      Avgångsinformation
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Välj en eller flera linjer som ska ingå i samma avgång.
                    </p>
                  </div>

                  <Field label="Resa">
                    <select
                      value={form.trip_id}
                      onChange={(e) => {
                        update("trip_id", e.target.value);
                        update("line_ids", []);
                      }}
                      disabled={loadingTrips}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="">
                        {loadingTrips ? "Laddar resor..." : "Välj resa"}
                      </option>
                      {trips.map((trip) => (
                        <option key={trip.id} value={trip.id}>
                          {trip.title}
                          {trip.destination ? ` – ${trip.destination}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

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
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="">
                        {loadingVehicles ? "Laddar fordon..." : "Inget fordon valt"}
                      </option>

                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.name}
                          {vehicle.registration_number
                            ? ` – ${vehicle.registration_number}`
                            : ""}
                          {vehicle.seats_count
                            ? ` – ${vehicle.seats_count} platser`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {selectedVehicle && (
                      <p className="mt-2 text-xs text-[#194C66]/70">
                        Vald buss: {selectedVehicle.name}
                        {selectedVehicle.registration_number
                          ? ` · ${selectedVehicle.registration_number}`
                          : ""}
                      </p>
                    )}
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
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="">
                        {loadingBusMaps
                          ? "Laddar busskartor..."
                          : "Ingen busskarta vald"}
                      </option>

                      {busMaps.map((map) => (
                        <option key={map.id} value={map.id}>
                          {map.name}
                          {map.seats_count ? ` – ${map.seats_count} platser` : ""}
                        </option>
                      ))}
                    </select>

                    {selectedBusMap && (
                      <p className="mt-2 text-xs text-[#194C66]/70">
                        Vald karta: {selectedBusMap.name} ·{" "}
                        {selectedBusMap.seats_count || 0} platser
                      </p>
                    )}
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Avgångsdatum">
                      <input
                        type="date"
                        value={form.departure_date}
                        onChange={(e) => update("departure_date", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Avgångstid">
                      <input
                        type="time"
                        value={form.departure_time}
                        onChange={(e) => update("departure_time", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Returdatum">
                      <input
                        type="date"
                        value={form.return_date}
                        onChange={(e) => update("return_date", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Returtid">
                      <input
                        type="time"
                        value={form.return_time}
                        onChange={(e) => update("return_time", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Grundpris">
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) => update("price", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Kapacitet / antal platser">
                      <input
                        type="number"
                        value={form.capacity}
                        onChange={(e) => update("capacity", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Bokade platser">
                      <input
                        type="number"
                        value={form.booked_count}
                        onChange={(e) => update("booked_count", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Sista bokningsdag">
                      <input
                        type="date"
                        value={form.last_booking_date}
                        onChange={(e) => update("last_booking_date", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>
                  </div>

                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) => update("status", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="open">Öppen för bokning</option>
                      <option value="closed">Stängd</option>
                      <option value="full">Fullbokad</option>
                      <option value="cancelled">Inställd</option>
                    </select>
                  </Field>
                </section>

                <aside className="h-fit rounded-xl bg-white p-5 shadow">
                  <h2 className="text-lg font-semibold text-[#194C66]">
                    Sammanfattning
                  </h2>

                  <div className="mt-4 rounded-xl border bg-[#f8fafc] p-4">
                    <div className="text-xs uppercase tracking-wide text-[#194C66]/60">
                      {selectedTrip?.destination || "Destination"}
                    </div>

                    <div className="mt-1 text-lg font-semibold text-[#0f172a]">
                      {selectedTrip?.title || "Resa saknas"}
                    </div>

                    <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                      <div className="text-xs text-gray-500">Valda linjer</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedLines.length === 0 ? (
                          <span className="text-gray-500">Inga linjer valda</span>
                        ) : (
                          selectedLines.map((line) => (
                            <span
                              key={line.id}
                              className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]"
                            >
                              {line.name}
                              {line.code ? ` (${line.code})` : ""}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      {fmtDate(form.departure_date)} kl{" "}
                      {tidyTime(form.departure_time)}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      Retur: {fmtDate(form.return_date)} kl{" "}
                      {tidyTime(form.return_time)}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Grundpris</span>
                      <span className="font-semibold text-[#194C66]">
                        {money(form.price)}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Fordon</span>
                      <span className="max-w-[170px] text-right text-sm font-semibold text-[#194C66]">
                        {selectedVehicle?.name || "Inget valt"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Busskarta</span>
                      <span className="max-w-[170px] text-right text-sm font-semibold text-[#194C66]">
                        {selectedBusMap?.name || "Ingen vald"}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>
                          {booked}/{capacity} bokade
                        </span>
                        <span>{fillPercent}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-[#194C66]"
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                          form.status
                        )}`}
                      >
                        {statusLabel(form.status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <Summary label="Lediga platser" value={`${seatsLeft}`} />
                    <Summary
                      label="Sista bokningsdag"
                      value={form.last_booking_date || "—"}
                    />
                    <Summary label="Bokningsläge" value={bookingStatusText} />
                    <Summary label="Antal linjer" value={`${selectedLines.length}`} />
                    <Summary
                      label="Sätesval"
                      value={form.bus_map_id ? "Aktivt" : "Ej aktivt"}
                    />
                  </div>

                  <button
                    onClick={save}
                    disabled={saving || !form.trip_id || !form.departure_date}
                    className="mt-6 w-full rounded-lg bg-[#194C66] px-4 py-3 font-medium text-white hover:bg-[#163b4d] disabled:opacity-50"
                  >
                    {saving ? "Sparar..." : "Spara avgång"}
                  </button>

                  {savedMessage && (
                    <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                      {savedMessage}
                    </div>
                  )}

                  <button
                    onClick={removeDeparture}
                    className="mt-3 w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Ta bort avgång
                  </button>
                </aside>
              </div>

              <section className="rounded-xl bg-white p-5 shadow">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#194C66]">
                      Resenärer
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Här kommer vi senare visa bokningar, passagerare,
                      betalstatus och check-in.
                    </p>
                  </div>

                  <button
                    disabled
                    className="rounded-[25px] border bg-gray-50 px-4 py-2 text-sm text-gray-400"
                  >
                    Kommer snart
                  </button>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="text-sm text-[#194C66]/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#194C66]">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
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

function Summary({ label, value }: { label: any; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-[#0f172a]">{value}</span>
    </div>
  );
}
