import { useEffect, useMemo, useState } from "react";
import {
  getTrafficVehicleStatusClasses,
  getTrafficVehicleStatusLabel,
} from "../../lib/traffic/resources";

type ViewType = "drivers" | "vehicles" | "partners";

type Driver = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  license_notes: string | null;
  notes: string | null;
};

type Vehicle = {
  id: string;
  name: string;
  registration_number: string | null;
  owner_type: "own" | "partner";
  partner_name: string | null;
  vehicle_type: string | null;
  seats: number | null;
  status: string;
  notes: string | null;
};

type Assignment = {
  id: string;
  source_type: "helsingbuss" | "sundra" | "flygbuss";
  source_id: string;
  title: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  status: string;
  planned_start_at: string | null;
  planned_end_at: string | null;
};

type VehicleBlock = {
  id: string;
  vehicle_id: string;
  title: string;
  reason: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

function driverStatusLabel(status: string) {
  switch (status) {
    case "available":
      return "Tillgänglig";
    case "busy":
      return "Upptagen";
    case "off":
      return "Ledig";
    case "sick":
      return "Frånvarande";
    case "inactive":
      return "Inaktiv";
    default:
      return "Okänd";
  }
}

function driverStatusClasses(status: string) {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "busy":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "off":
      return "bg-slate-50 text-slate-600 ring-slate-100";
    case "sick":
      return "bg-orange-50 text-orange-700 ring-orange-100";
    case "inactive":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-100";
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "Tid saknas";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function TrafficResourcesPanel({ view }: { view: ViewType }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [blocks, setBlocks] = useState<VehicleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorText("");

      const [driversRes, vehiclesRes, assignmentsRes, blocksRes] = await Promise.all([
        fetch("/api/traffic/drivers"),
        fetch("/api/traffic/vehicles"),
        fetch("/api/traffic/assignments"),
        fetch("/api/traffic/vehicle-blocks"),
      ]);

      const driversJson = await driversRes.json();
      const vehiclesJson = await vehiclesRes.json();
      const assignmentsJson = await assignmentsRes.json();
      const blocksJson = await blocksRes.json();

      if (!driversRes.ok || !driversJson.ok) throw new Error(driversJson.error || "Kunde inte hämta förare.");
      if (!vehiclesRes.ok || !vehiclesJson.ok) throw new Error(vehiclesJson.error || "Kunde inte hämta fordon.");
      if (!assignmentsRes.ok || !assignmentsJson.ok) throw new Error(assignmentsJson.error || "Kunde inte hämta kopplingar.");
      if (!blocksRes.ok || !blocksJson.ok) throw new Error(blocksJson.error || "Kunde inte hämta blockeringar.");

      setDrivers(Array.isArray(driversJson.drivers) ? driversJson.drivers : []);
      setVehicles(Array.isArray(vehiclesJson.vehicles) ? vehiclesJson.vehicles : []);
      setAssignments(Array.isArray(assignmentsJson.assignments) ? assignmentsJson.assignments : []);
      setBlocks(Array.isArray(blocksJson.blocks) ? blocksJson.blocks : []);
    } catch (error: any) {
      setErrorText(error?.message || "Kunde inte hämta data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const ownVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.owner_type !== "partner"),
    [vehicles]
  );

  const partnerVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.owner_type === "partner"),
    [vehicles]
  );

  async function createDriver() {
    const name = window.prompt("Namn på förare:");
    if (!name?.trim()) return;

    const phone = window.prompt("Telefon, valfritt:") || "";
    const email = window.prompt("E-post, valfritt:") || "";

    const response = await fetch("/api/traffic/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, status: "available" }),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      alert(json.error || "Kunde inte skapa förare.");
      return;
    }

    await loadData();
  }

  async function createVehicle(ownerType: "own" | "partner") {
    const name = window.prompt(ownerType === "partner" ? "Namn på partnerbuss:" : "Namn på fordon:");
    if (!name?.trim()) return;

    const partner_name =
      ownerType === "partner"
        ? window.prompt("Partnerbolag:", "Ej vald partner") || "Ej vald partner"
        : "";

    const seatsText = window.prompt("Antal platser:", "56") || "";
    const seats = Number(seatsText);

    const response = await fetch("/api/traffic/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        owner_type: ownerType,
        partner_name,
        vehicle_type: "bus",
        seats: Number.isFinite(seats) ? seats : null,
        status: "available",
      }),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      alert(json.error || "Kunde inte skapa fordon.");
      return;
    }

    await loadData();
  }

  async function updateDriverStatus(driverId: string, status: string) {
    const response = await fetch("/api/traffic/drivers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: driverId, status }),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      alert(json.error || "Kunde inte uppdatera förare.");
      return;
    }

    await loadData();
  }

  async function updateVehicleStatus(vehicleId: string, status: string) {
    const response = await fetch("/api/traffic/vehicles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: vehicleId, status }),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      alert(json.error || "Kunde inte uppdatera fordon.");
      return;
    }

    await loadData();
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
        Hämtar trafikledningsdata...
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="mt-6 rounded-2xl bg-rose-50 p-6 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
        {errorText}
      </div>
    );
  }

  if (view === "drivers") {
    return (
      <div className="mt-6 space-y-5">
        <ResourceHeader
          title="Förare"
          text="Hantera förare, tillgänglighet, status och kopplade körningar."
          action="+ Lägg till förare"
          onAction={createDriver}
        />

        <div className="grid gap-3 md:grid-cols-4">
          <SummaryCard label="Totalt" value={drivers.length} />
          <SummaryCard label="Tillgängliga" value={drivers.filter((d) => d.status === "available").length} />
          <SummaryCard label="Upptagna" value={drivers.filter((d) => d.status === "busy").length} />
          <SummaryCard label="Frånvarande" value={drivers.filter((d) => ["off", "sick"].includes(d.status)).length} />
        </div>

        <div className="space-y-3">
          {drivers.length === 0 ? (
            <EmptyState text="Inga förare finns ännu. Lägg till första föraren." />
          ) : (
            drivers.map((driver) => {
              const driverAssignments = assignments.filter((item) => item.driver_id === driver.id);

              return (
                <div key={driver.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">{driver.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {driver.phone || "Telefon saknas"} · {driver.email || "E-post saknas"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {driverAssignments.length} kopplade körningar
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${driverStatusClasses(driver.status)}`}>
                        {driverStatusLabel(driver.status)}
                      </span>

                      <select
                        value={driver.status}
                        onChange={(event) => updateDriverStatus(driver.id, event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        <option value="available">Tillgänglig</option>
                        <option value="busy">Upptagen</option>
                        <option value="off">Ledig</option>
                        <option value="sick">Frånvarande</option>
                        <option value="inactive">Inaktiv</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const list = view === "partners" ? partnerVehicles : ownVehicles;

  return (
    <div className="mt-6 space-y-5">
      <ResourceHeader
        title={view === "partners" ? "Partners" : "Fordon"}
        text={
          view === "partners"
            ? "Hantera partnerbussar, partnerbolag, status och reserveringar."
            : "Hantera egna fordon, status, verkstad, otillgänglighet och reserveringar."
        }
        action={view === "partners" ? "+ Lägg till partnerbuss" : "+ Lägg till fordon"}
        onAction={() => createVehicle(view === "partners" ? "partner" : "own")}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Totalt" value={list.length} />
        <SummaryCard label="Tillgängliga" value={list.filter((v) => v.status === "available").length} />
        <SummaryCard label="Reserverade" value={list.filter((v) => v.status === "reserved").length} />
        <SummaryCard label="Verkstad/otillgänglig" value={list.filter((v) => ["workshop", "unavailable"].includes(v.status)).length} />
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <EmptyState text={view === "partners" ? "Inga partnerbussar finns ännu." : "Inga egna fordon finns ännu."} />
        ) : (
          list.map((vehicle) => {
            const vehicleAssignments = assignments.filter((item) => item.vehicle_id === vehicle.id);
            const vehicleBlocks = blocks.filter((item) => item.vehicle_id === vehicle.id);

            return (
              <div key={vehicle.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-bold text-slate-950">{vehicle.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {vehicle.owner_type === "partner" ? vehicle.partner_name || "Partner saknas" : "Eget fordon"}
                      {vehicle.seats ? ` · ${vehicle.seats} platser` : ""}
                      {vehicle.registration_number ? ` · ${vehicle.registration_number}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {vehicleAssignments.length} kopplade körningar · {vehicleBlocks.length} blockeringar
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getTrafficVehicleStatusClasses(vehicle.status as any)}`}>
                      {getTrafficVehicleStatusLabel(vehicle.status as any)}
                    </span>

                    <select
                      value={vehicle.status}
                      onChange={(event) => updateVehicleStatus(vehicle.id, event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option value="available">Tillgänglig</option>
                      <option value="in_traffic">I trafik</option>
                      <option value="reserved">Reserverad</option>
                      <option value="workshop">Verkstad</option>
                      <option value="unavailable">Otillgänglig</option>
                      <option value="inactive">Inaktiv</option>
                    </select>
                  </div>
                </div>

                {vehicleBlocks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {vehicleBlocks.slice(0, 3).map((block) => (
                      <div key={block.id} className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-100">
                        <span className="font-bold text-slate-950">{block.title}</span>
                        <span> · {formatDateTime(block.start_at)} – {formatDateTime(block.end_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ResourceHeader({
  title,
  text,
  action,
  onAction,
}: {
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{text}</p>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="w-fit rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
        >
          {action}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
      {text}
    </div>
  );
}