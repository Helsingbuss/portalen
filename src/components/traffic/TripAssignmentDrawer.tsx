import { useEffect, useMemo, useState } from "react";

type SourceType = "helsingbuss" | "sundra" | "flygbuss";

type DispatchTrip = {
  id: string;
  sourceType: SourceType;
  sourceLabel: string;
  sourceId: string | null;
  date: string | null;
  time: string | null;
  title: string;
  route: string;
  driver: string;
  vehicle: string;
  status: string;
  statusCode: string;
  passengers: number | null;
};

type Driver = {
  id: string;
  name: string;
  status: string;
};

type Vehicle = {
  id: string;
  name: string;
  registration_number: string | null;
  owner_type: "own" | "partner";
  partner_name: string | null;
  seats: number | null;
  status: string;
};

type Assignment = {
  id: string;
  source_type: SourceType;
  source_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  status: string;
  planned_start_at: string | null;
  planned_end_at: string | null;
  notes: string | null;
};

function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function tripStartValue(trip: DispatchTrip) {
  if (!trip.date) return "";
  return `${trip.date}T${trip.time || "08:00"}`;
}

function tripEndValue(trip: DispatchTrip) {
  if (!trip.date) return "";

  const start = new Date(`${trip.date}T${trip.time || "08:00"}`);
  if (Number.isNaN(start.getTime())) return "";

  const hours =
    trip.sourceType === "flygbuss"
      ? 1
      : trip.sourceType === "sundra"
      ? 10
      : 4;

  start.setHours(start.getHours() + hours);

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`;
}

function vehicleLabel(vehicle: Vehicle) {
  const owner = vehicle.owner_type === "partner"
    ? `Partner${vehicle.partner_name ? ` · ${vehicle.partner_name}` : ""}`
    : "Egen buss";

  const seats = vehicle.seats ? ` · ${vehicle.seats} platser` : "";

  return `${vehicle.name} · ${owner}${seats}`;
}

export default function TripAssignmentDrawer({
  trip,
  onClose,
  onSaved,
}: {
  trip: DispatchTrip;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [status, setStatus] = useState("assigned");
  const [startAt, setStartAt] = useState(() => tripStartValue(trip));
  const [endAt, setEndAt] = useState(() => tripEndValue(trip));
  const [notes, setNotes] = useState("");

  const canSave = useMemo(() => {
    return Boolean(trip.sourceId && startAt && endAt);
  }, [trip.sourceId, startAt, endAt]);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      try {
        setLoading(true);

        const [driversRes, vehiclesRes, assignmentRes] = await Promise.all([
          fetch("/api/traffic/drivers"),
          fetch("/api/traffic/vehicles"),
          fetch(`/api/traffic/assignments?source_type=${trip.sourceType}&source_id=${trip.sourceId || ""}`),
        ]);

        const driversJson = await driversRes.json();
        const vehiclesJson = await vehiclesRes.json();
        const assignmentJson = await assignmentRes.json();

        if (!driversRes.ok || !driversJson.ok) throw new Error(driversJson.error || "Kunde inte hämta chaufförer.");
        if (!vehiclesRes.ok || !vehiclesJson.ok) throw new Error(vehiclesJson.error || "Kunde inte hämta fordon.");
        if (!assignmentRes.ok || !assignmentJson.ok) throw new Error(assignmentJson.error || "Kunde inte hämta koppling.");

        if (!alive) return;

        setDrivers(Array.isArray(driversJson.drivers) ? driversJson.drivers : []);
        setVehicles(Array.isArray(vehiclesJson.vehicles) ? vehiclesJson.vehicles : []);

        const assignment = Array.isArray(assignmentJson.assignments)
          ? assignmentJson.assignments[0] as Assignment | undefined
          : undefined;

        if (assignment) {
          setDriverId(assignment.driver_id || "");
          setVehicleId(assignment.vehicle_id || "");
          setStatus(assignment.status || "assigned");
          setStartAt(toDateTimeLocal(assignment.planned_start_at) || tripStartValue(trip));
          setEndAt(toDateTimeLocal(assignment.planned_end_at) || tripEndValue(trip));
          setNotes(assignment.notes || "");
        }
      } catch (error: any) {
        alert(error?.message || "Kunde inte ladda kopplingspanelen.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [trip]);


  async function createDriverQuick() {
    const name = window.prompt("Namn på chaufför:");
    if (!name?.trim()) return;

    const phone = window.prompt("Telefonnummer, valfritt:") || "";
    const email = window.prompt("E-post, valfritt:") || "";

    try {
      const response = await fetch("/api/traffic/drivers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          email,
          status: "available",
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa chaufför.");
      }

      setDrivers((current) =>
        [...current, json.driver].sort((a, b) => a.name.localeCompare(b.name))
      );

      setDriverId(json.driver.id);
    } catch (error: any) {
      alert(error?.message || "Kunde inte skapa chaufför.");
    }
  }

  async function createVehicleQuick() {
    const name = window.prompt("Namn på fordon, exempel Partnerbuss 2:");
    if (!name?.trim()) return;

    const ownerAnswer = (window.prompt("Är det egen buss eller partnerbuss? Skriv: egen eller partner", "partner") || "").toLowerCase();
    const owner_type = ownerAnswer.startsWith("p") ? "partner" : "own";

    const partner_name =
      owner_type === "partner"
        ? window.prompt("Partnerbolag, exempel Norra Skåne Buss:", "Ej vald partner") || "Ej vald partner"
        : "";

    const seatsText = window.prompt("Antal platser, exempel 56:", "56") || "";
    const seats = Number(seatsText);

    const statusText = (window.prompt("Status: tillgänglig, reserverad, verkstad eller otillgänglig", "tillgänglig") || "").toLowerCase();

    const status =
      statusText.includes("verk")
        ? "workshop"
        : statusText.includes("otill")
        ? "unavailable"
        : statusText.includes("res")
        ? "reserved"
        : "available";

    try {
      const response = await fetch("/api/traffic/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          owner_type,
          partner_name,
          vehicle_type: "bus",
          seats: Number.isFinite(seats) ? seats : null,
          status,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa fordon.");
      }

      setVehicles((current) =>
        [...current, json.vehicle].sort((a, b) => a.name.localeCompare(b.name))
      );

      setVehicleId(json.vehicle.id);
    } catch (error: any) {
      alert(error?.message || "Kunde inte skapa fordon.");
    }
  }
  async function saveAssignment() {
    if (!canSave) {
      alert("Start och slut måste anges.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/traffic/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_type: trip.sourceType,
          source_id: trip.sourceId,
          title: trip.title,
          driver_id: driverId || null,
          vehicle_id: vehicleId || null,
          status,
          planned_start_at: startAt,
          planned_end_at: endAt,
          notes,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara koppling.");
      }

      onSaved();
      onClose();
    } catch (error: any) {
      alert(error?.message || "Kunde inte spara koppling.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Stäng"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                Koppla körning
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {trip.title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {trip.date || "Datum saknas"} · {trip.time || "--:--"} · {trip.sourceLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-100 hover:bg-slate-100"
            >
              Stäng
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-sm font-bold text-slate-950">{trip.route}</p>

            <p className="mt-2 text-xs font-semibold text-slate-500">
              {trip.passengers !== null ? `${trip.passengers} resenärer · ` : ""}
              Original-ID: {trip.sourceId || "saknas"}
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
              Hämtar chaufförer och fordon...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-700">Chaufför</span>
                <button
                  type="button"
                  onClick={createDriverQuick}
                  className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-teal-100 hover:bg-teal-100"
                >
                  + Lägg till chaufför
                </button>
              </div>

              <label className="block">
                <select
                  value={driverId}
                  onChange={(event) => setDriverId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-teal-600"
                >
                  <option value="">Ingen chaufför vald</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} · {driver.status}
                    </option>
                  ))}
                </select>

                {drivers.length === 0 && (
                  <p className="mt-2 text-xs font-semibold text-orange-600">
                    Inga chaufförer finns ännu. Vi lägger in chaufförsregister i nästa steg.
                  </p>
                )}
              </label>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-700">Fordon / partnerbuss</span>
                <button
                  type="button"
                  onClick={createVehicleQuick}
                  className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-teal-100 hover:bg-teal-100"
                >
                  + Lägg till fordon
                </button>
              </div>

              <label className="block">
                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-teal-600"
                >
                  <option value="">Inget fordon valt</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicleLabel(vehicle)} · {vehicle.status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-teal-600"
                >
                  <option value="planned">Planerad</option>
                  <option value="assigned">Tilldelad</option>
                  <option value="in_traffic">I trafik</option>
                  <option value="completed">Klar</option>
                  <option value="cancelled">Avbruten</option>
                  <option value="needs_action">Kräver åtgärd</option>
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Start</span>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-teal-600"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Slut</span>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(event) => setEndAt(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-teal-600"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Trafikledningsnotering</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-teal-600"
                  placeholder="Exempel: Partnerbuss reserverad hela perioden. Kontrollera chaufför dagen innan."
                />
              </label>

              <button
                type="button"
                onClick={saveAssignment}
                disabled={saving || !canSave}
                className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Spara koppling"}
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}