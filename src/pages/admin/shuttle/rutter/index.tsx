import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type ShuttleRoute = {
  id: string;
  name: string;
  route_code?: string | null;
  airport_name?: string | null;
  start_city?: string | null;
  end_city?: string | null;
  default_price?: number | null;
  estimated_duration_minutes?: number | null;
  operator_name?: string | null;
  color?: string | null;
  status?: string | null;
  is_public?: boolean | null;
  is_featured?: boolean | null;
};

function statusLabel(status?: string | null) {
  if (status === "active") return "Aktiv";
  if (status === "draft") return "Utkast";
  if (status === "inactive") return "Inaktiv";
  return status || "—";
}

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

export default function ShuttleRoutesPage() {
  const router = useRouter();

  const [routes, setRoutes] = useState<ShuttleRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRoutes() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/shuttle/routes");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta rutter.");
      }

      setRoutes(json.routes || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoutes();
  }, []);

  const stats = useMemo(() => {
    return {
      total: routes.length,
      active: routes.filter((r) => r.status === "active").length,
      public: routes.filter((r) => r.is_public).length,
    };
  }, [routes]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Airport Shuttle – Rutter
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Hantera flygbussrutter, flygplatser och grundpriser.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadRoutes}
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
              >
                Uppdatera
              </button>

              <button
                onClick={() => router.push("/admin/shuttle/rutter/new")}
                className="rounded-full bg-[#194C66] px-4 py-2 text-sm font-semibold text-white"
              >
                Skapa rutt
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Stat title="Totala rutter" value={stats.total} />
            <Stat title="Aktiva" value={stats.active} />
            <Stat title="Publika" value={stats.public} />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Ruttlista
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">Laddar rutter...</div>
            ) : routes.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga rutter skapade ännu.
              </div>
            ) : (
              <div className="divide-y">
                {routes.map((route) => (
                  <div key={route.id} className="p-5 hover:bg-[#f8fafc]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className="mt-1 h-5 w-5 rounded-full border"
                          style={{ backgroundColor: route.color || "#194C66" }}
                        />

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-[#0f172a]">
                              {route.name}
                            </h3>

                            {route.route_code && (
                              <span className="rounded-full bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-gray-600">
                                {route.route_code}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-gray-500">
                            {route.start_city || "—"} → {route.end_city || "—"}
                          </p>

                          <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-4">
                            <div>
                              <span className="font-semibold">Flygplats:</span>{" "}
                              {route.airport_name || "—"}
                            </div>
                            <div>
                              <span className="font-semibold">Pris:</span>{" "}
                              {money(route.default_price)}
                            </div>
                            <div>
                              <span className="font-semibold">Restid:</span>{" "}
                              {route.estimated_duration_minutes || 0} min
                            </div>
                            <div>
                              <span className="font-semibold">Operatör:</span>{" "}
                              {route.operator_name || "—"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        {statusLabel(route.status)}
                      </span>
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
