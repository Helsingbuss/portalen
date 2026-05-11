import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

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
  created_at?: string | null;

  sundra_bus_maps?: {
    id: string;
    name: string;
    seats_count?: number | null;
  } | null;
};

function statusLabel(status?: string | null) {
  if (status === "active") return "Aktiv";
  if (status === "inactive") return "Inaktiv";
  if (status === "maintenance") return "Service";
  return status || "—";
}

function statusClass(status?: string | null) {
  if (status === "active") return "bg-green-100 text-green-700";
  if (status === "maintenance") return "bg-amber-100 text-amber-700";
  if (status === "inactive") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export default function SundraVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadVehicles() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/vehicles");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta fordon.");
      }

      setVehicles(json.vehicles || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return vehicles;

    return vehicles.filter((v) => {
      return (
        v.name?.toLowerCase().includes(q) ||
        v.registration_number?.toLowerCase().includes(q) ||
        v.operator_name?.toLowerCase().includes(q) ||
        v.sundra_bus_maps?.name?.toLowerCase().includes(q)
      );
    });
  }, [vehicles, search]);

  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      active: vehicles.filter((v) => v.status === "active").length,
      maintenance: vehicles.filter((v) => v.status === "maintenance").length,
      inactive: vehicles.filter((v) => v.status === "inactive").length,
    };
  }, [vehicles]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Fordonslista
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Hantera fordon och koppla dem till rätt platskarta.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadVehicles}
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
              >
                Uppdatera
              </button>

              <Link
                href="/admin/sundra/fordon/new"
                className="rounded-full bg-[#194C66] px-4 py-2 text-sm font-semibold text-white"
              >
                + Lägg till fordon
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat title="Totalt" value={stats.total} />
            <Stat title="Aktiva" value={stats.active} />
            <Stat title="Service" value={stats.maintenance} />
            <Stat title="Inaktiva" value={stats.inactive} />
          </div>

          <section className="rounded-3xl bg-white p-5 shadow">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök fordon, registreringsnummer, operatör eller platskarta..."
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Alla fordon
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">Laddar fordon...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga fordon hittades.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((vehicle) => (
                  <div key={vehicle.id} className="p-5 hover:bg-[#f8fafc]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-[#0f172a]">
                            {vehicle.name}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              vehicle.status
                            )}`}
                          >
                            {statusLabel(vehicle.status)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          Reg.nr: {vehicle.registration_number || "—"} · Operatör:{" "}
                          {vehicle.operator_name || "—"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                          <span className="rounded-full bg-gray-100 px-3 py-1">
                            Typ: {vehicle.vehicle_type || "coach"}
                          </span>

                          <span className="rounded-full bg-gray-100 px-3 py-1">
                            Säten: {vehicle.seats_count || 0}
                          </span>

                          <span className="rounded-full bg-gray-100 px-3 py-1">
                            Platskarta: {vehicle.sundra_bus_maps?.name || "Ingen"}
                          </span>
                        </div>

                        {vehicle.notes && (
                          <p className="mt-3 text-sm text-gray-600">
                            {vehicle.notes}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/admin/sundra/fordon/${vehicle.id}`}
                        className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-[#194C66] hover:bg-[#eef5f9]"
                      >
                        Redigera
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
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
