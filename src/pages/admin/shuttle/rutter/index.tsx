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
  start_location?: string | null;
  end_location?: string | null;
  default_price?: number | null;
  estimated_duration_minutes?: number | null;
  operator_name?: string | null;
  color?: string | null;
  description?: string | null;
  status?: string | null;
  is_public?: boolean | null;
  is_featured?: boolean | null;
};

type RouteForm = {
  name: string;
  route_code: string;
  airport_name: string;
  start_city: string;
  end_city: string;
  start_location: string;
  end_location: string;
  default_price: string;
  estimated_duration_minutes: string;
  operator_name: string;
  color: string;
  description: string;
  status: string;
  is_public: boolean;
  is_featured: boolean;
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

function routeToForm(route: ShuttleRoute): RouteForm {
  return {
    name: route.name || "",
    route_code: route.route_code || "",
    airport_name: route.airport_name || "",
    start_city: route.start_city || "",
    end_city: route.end_city || "",
    start_location: route.start_location || "",
    end_location: route.end_location || "",
    default_price: String(route.default_price ?? ""),
    estimated_duration_minutes: String(route.estimated_duration_minutes ?? ""),
    operator_name: route.operator_name || "",
    color: route.color || "#194C66",
    description: route.description || "",
    status: route.status || "active",
    is_public: route.is_public !== false,
    is_featured: route.is_featured === true,
  };
}

export default function ShuttleRoutesPage() {
  const router = useRouter();

  const [routes, setRoutes] = useState<ShuttleRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RouteForm | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadRoutes() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

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

  function startEdit(route: ShuttleRoute) {
    setError("");
    setMessage("");
    setEditingId(route.id);
    setEditForm(routeToForm(route));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function updateEdit(key: keyof RouteForm, value: any) {
    setEditForm((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        [key]: value,
      };
    });
  }

  async function saveEdit(routeId: string) {
    try {
      if (!editForm) return;

      setSavingId(routeId);
      setError("");
      setMessage("");

      if (!editForm.name.trim()) {
        throw new Error("Ange ruttnamn.");
      }

      const res = await fetch("/api/admin/shuttle/routes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: routeId,
          ...editForm,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte spara rutten.");
      }

      setMessage("Rutten är uppdaterad.");
      setEditingId(null);
      setEditForm(null);
      await loadRoutes();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRoute(route: ShuttleRoute) {
    try {
      setError("");
      setMessage("");

      const confirmDelete = window.confirm(
        `Vill du ta bort rutten "${route.name}"?\n\nOm rutten används av linjer eller avgångar kommer den inte tas bort.`
      );

      if (!confirmDelete) return;

      setDeletingId(route.id);

      const res = await fetch(`/api/admin/shuttle/routes?id=${encodeURIComponent(route.id)}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte ta bort rutten.");
      }

      setMessage("Rutten är borttagen.");
      await loadRoutes();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setDeletingId(null);
    }
  }

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
                Hantera flygbussrutter, flygplatser, grundpriser och synlighet.
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

          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

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
                {routes.map((route) => {
                  const isEditing = editingId === route.id && editForm;

                  return (
                    <div key={route.id} className="p-5 hover:bg-[#f8fafc]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <div
                            className="mt-1 h-5 w-5 shrink-0 rounded-full border"
                            style={{ backgroundColor: route.color || "#194C66" }}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-[#0f172a]">
                                {route.name}
                              </h3>

                              {route.route_code && (
                                <span className="rounded-full bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-gray-600">
                                  {route.route_code}
                                </span>
                              )}

                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                {statusLabel(route.status)}
                              </span>
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

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(route)}
                            className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66] hover:bg-[#f8fafc]"
                          >
                            Ändra
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteRoute(route)}
                            disabled={deletingId === route.id}
                            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === route.id ? "Tar bort..." : "Ta bort"}
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-5 rounded-3xl border bg-[#f8fafc] p-5">
                          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#194C66]/70">
                            Redigera rutt
                          </h4>

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <Field label="Ruttnamn">
                              <input
                                value={editForm.name}
                                onChange={(e) => updateEdit("name", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Ruttkod">
                              <input
                                value={editForm.route_code}
                                onChange={(e) => updateEdit("route_code", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Flygplats">
                              <input
                                value={editForm.airport_name}
                                onChange={(e) => updateEdit("airport_name", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Startort">
                              <input
                                value={editForm.start_city}
                                onChange={(e) => updateEdit("start_city", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Slutort">
                              <input
                                value={editForm.end_city}
                                onChange={(e) => updateEdit("end_city", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Operatör">
                              <input
                                value={editForm.operator_name}
                                onChange={(e) => updateEdit("operator_name", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Startplats">
                              <input
                                value={editForm.start_location}
                                onChange={(e) => updateEdit("start_location", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Slutplats">
                              <input
                                value={editForm.end_location}
                                onChange={(e) => updateEdit("end_location", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Grundpris">
                              <input
                                type="number"
                                value={editForm.default_price}
                                onChange={(e) => updateEdit("default_price", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Restid minuter">
                              <input
                                type="number"
                                value={editForm.estimated_duration_minutes}
                                onChange={(e) =>
                                  updateEdit("estimated_duration_minutes", e.target.value)
                                }
                                className="w-full rounded-xl border px-3 py-2"
                              />
                            </Field>

                            <Field label="Färg">
                              <input
                                type="color"
                                value={editForm.color}
                                onChange={(e) => updateEdit("color", e.target.value)}
                                className="h-11 w-full rounded-xl border p-1"
                              />
                            </Field>

                            <Field label="Status">
                              <select
                                value={editForm.status}
                                onChange={(e) => updateEdit("status", e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                              >
                                <option value="active">Aktiv</option>
                                <option value="draft">Utkast</option>
                                <option value="inactive">Inaktiv</option>
                              </select>
                            </Field>

                            <div className="md:col-span-2 xl:col-span-3">
                              <Field label="Beskrivning">
                                <textarea
                                  rows={4}
                                  value={editForm.description}
                                  onChange={(e) => updateEdit("description", e.target.value)}
                                  className="w-full rounded-xl border px-3 py-2"
                                />
                              </Field>
                            </div>

                            <label className="flex items-start gap-3 rounded-xl border bg-white p-3">
                              <input
                                type="checkbox"
                                checked={editForm.is_public}
                                onChange={(e) => updateEdit("is_public", e.target.checked)}
                                className="mt-1"
                              />
                              <span>
                                <span className="block font-semibold text-[#194C66]">
                                  Publik rutt
                                </span>
                                <span className="text-sm text-gray-500">
                                  Kan visas i bokningsflödet.
                                </span>
                              </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-xl border bg-white p-3">
                              <input
                                type="checkbox"
                                checked={editForm.is_featured}
                                onChange={(e) => updateEdit("is_featured", e.target.checked)}
                                className="mt-1"
                              />
                              <span>
                                <span className="block font-semibold text-[#194C66]">
                                  Utvald rutt
                                </span>
                                <span className="text-sm text-gray-500">
                                  Kan lyftas extra.
                                </span>
                              </span>
                            </label>
                          </div>

                          <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-full border bg-white px-5 py-2 text-sm font-semibold text-[#194C66]"
                            >
                              Avbryt
                            </button>

                            <button
                              type="button"
                              onClick={() => saveEdit(route.id)}
                              disabled={savingId === route.id}
                              className="rounded-full bg-[#194C66] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {savingId === route.id ? "Sparar..." : "Spara ändringar"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
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

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}

