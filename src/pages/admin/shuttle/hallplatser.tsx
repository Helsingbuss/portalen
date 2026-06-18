import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Stop = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  stop_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  sort_order?: number | null;
  status?: string | null;
  is_active?: boolean | null;
};

type StopForm = {
  name: string;
  city: string;
  address: string;
  stop_code: string;
  latitude: string;
  longitude: string;
  description: string;
  sort_order: string;
  status: string;
  is_active: boolean;
};

const EMPTY_STOP: StopForm = {
  name: "",
  city: "",
  address: "",
  stop_code: "",
  latitude: "",
  longitude: "",
  description: "",
  sort_order: "",
  status: "active",
  is_active: true,
};

function statusLabel(status?: string | null, isActive?: boolean | null) {
  if (isActive === false) return "Inaktiv";
  if (status === "active") return "Aktiv";
  if (status === "draft") return "Utkast";
  if (status === "inactive") return "Inaktiv";

  return status || "Aktiv";
}

function stopToForm(stop: Stop): StopForm {
  return {
    name: stop.name || "",
    city: stop.city || "",
    address: stop.address || "",
    stop_code: stop.stop_code || "",
    latitude: stop.latitude === null || stop.latitude === undefined ? "" : String(stop.latitude),
    longitude: stop.longitude === null || stop.longitude === undefined ? "" : String(stop.longitude),
    description: stop.description || "",
    sort_order: stop.sort_order === null || stop.sort_order === undefined ? "" : String(stop.sort_order),
    status: stop.status || "active",
    is_active: stop.is_active !== false,
  };
}

export default function ShuttleStopsPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [form, setForm] = useState<StopForm>(EMPTY_STOP);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StopForm | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadStops() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/shuttle/stops");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta hållplatser.");
      }

      setStops(json.stops || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStops();
  }, []);

  const stats = useMemo(() => {
    return {
      total: stops.length,
      active: stops.filter((stop) => stop.is_active !== false && stop.status !== "inactive").length,
    };
  }, [stops]);

  function updateForm(key: keyof StopForm, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateEditForm(key: keyof StopForm, value: any) {
    setEditForm((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        [key]: value,
      };
    });
  }

  async function createStop() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!form.name.trim()) {
        throw new Error("Ange namn på hållplatsen.");
      }

      const res = await fetch("/api/admin/shuttle/stops", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa hållplats.");
      }

      setForm(EMPTY_STOP);
      setMessage("Hållplatsen är skapad.");
      await loadStops();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(stop: Stop) {
    setError("");
    setMessage("");
    setEditingId(stop.id);
    setEditForm(stopToForm(stop));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit(stopId: string) {
    try {
      if (!editForm) return;

      setSavingEditId(stopId);
      setError("");
      setMessage("");

      if (!editForm.name.trim()) {
        throw new Error("Ange namn på hållplatsen.");
      }

      const res = await fetch("/api/admin/shuttle/stops", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: stopId,
          ...editForm,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte spara hållplatsen.");
      }

      setEditingId(null);
      setEditForm(null);
      setMessage("Hållplatsen är uppdaterad.");
      await loadStops();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSavingEditId(null);
    }
  }

  async function deleteStop(stop: Stop) {
    const confirmDelete = window.confirm(
      `Vill du ta bort hållplatsen "${stop.name}"?\n\nOm hållplatsen används av en linje eller avgång kommer den inte tas bort.`
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(stop.id);
      setError("");
      setMessage("");

      const res = await fetch(`/api/admin/shuttle/stops?id=${encodeURIComponent(stop.id)}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte ta bort hållplatsen.");
      }

      if (editingId === stop.id) {
        setEditingId(null);
        setEditForm(null);
      }

      setMessage("Hållplatsen är borttagen.");
      await loadStops();
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

        <main className="mx-auto w-full max-w-7xl space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Airport Shuttle – Hållplatser
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa, redigera och hantera hållplatser för flygbusstrafiken.
              </p>
            </div>

            <button
              type="button"
              onClick={loadStops}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Stat title="Hållplatser" value={stats.total} />
            <Stat title="Aktiva" value={stats.active} />
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

          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <aside className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Skapa hållplats
              </h2>

              <div className="mt-5 space-y-4">
                <Field label="Hållplatsnamn">
                  <input
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="Helsingborg C"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Ort">
                  <input
                    value={form.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                    placeholder="Helsingborg"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Adress">
                  <input
                    value={form.address}
                    onChange={(e) => updateForm("address", e.target.value)}
                    placeholder="Järnvägsgatan 22"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Hållplatskod">
                    <input
                      value={form.stop_code}
                      onChange={(e) => updateForm("stop_code", e.target.value)}
                      placeholder="HBG-C"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Ordning">
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => updateForm("sort_order", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Latitude">
                    <input
                      value={form.latitude}
                      onChange={(e) => updateForm("latitude", e.target.value)}
                      placeholder="56.0465"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Longitude">
                    <input
                      value={form.longitude}
                      onChange={(e) => updateForm("longitude", e.target.value)}
                      placeholder="12.6945"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => updateForm("status", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="active">Aktiv</option>
                    <option value="draft">Utkast</option>
                    <option value="inactive">Inaktiv</option>
                  </select>
                </Field>

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => updateForm("is_active", e.target.checked)}
                  />
                  Aktiv hållplats
                </label>

                <Field label="Beskrivning">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <button
                  type="button"
                  onClick={createStop}
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Skapa hållplats"}
                </button>
              </div>
            </aside>

            <section className="overflow-hidden rounded-3xl bg-white shadow">
              <div className="border-b p-5">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Hållplatslista
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-gray-500">Laddar hållplatser...</div>
              ) : stops.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  Inga hållplatser skapade ännu.
                </div>
              ) : (
                <div className="divide-y">
                  {stops.map((stop) => {
                    const isEditing = editingId === stop.id && editForm;

                    return (
                      <div key={stop.id} className="p-5 hover:bg-[#f8fafc]">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-[#0f172a]">
                                {stop.name}
                              </h3>

                              {stop.stop_code && (
                                <span className="rounded-full bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-gray-600">
                                  {stop.stop_code}
                                </span>
                              )}

                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                {statusLabel(stop.status, stop.is_active)}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-gray-500">
                              {stop.city || "—"} {stop.address ? `· ${stop.address}` : ""}
                            </p>

                            <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                              <div>
                                <span className="font-semibold">Ordning:</span>{" "}
                                {stop.sort_order ?? "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Lat:</span>{" "}
                                {stop.latitude ?? "—"}
                              </div>
                              <div>
                                <span className="font-semibold">Lng:</span>{" "}
                                {stop.longitude ?? "—"}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(stop)}
                              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66] hover:bg-[#f8fafc]"
                            >
                              Redigera
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteStop(stop)}
                              disabled={deletingId === stop.id}
                              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              {deletingId === stop.id ? "Tar bort..." : "Ta bort"}
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="mt-5 rounded-3xl border bg-[#f8fafc] p-5">
                            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#194C66]/70">
                              Redigera hållplats
                            </h4>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                              <Field label="Hållplatsnamn">
                                <input
                                  value={editForm.name}
                                  onChange={(e) => updateEditForm("name", e.target.value)}
                                  className="w-full rounded-xl border px-3 py-2"
                                />
                              </Field>

                              <Field label="Ort">
                                <input
                                  value={editForm.city}
                                  onChange={(e) => updateEditForm("city", e.target.value)}
                                  className="w-full rounded-xl border px-3 py-2"
                                />
                              </Field>

                              <Field label="Adress">
                                <input
                                  value={editForm.address}
                                  onChange={(e) => updateEditForm("address", e.target.value)}
                                  className="w-full rounded-xl border px-3 py-2"
                                />
                              </Field>

                              <Field label="Hållplatskod">
                                <input
                                  value={editForm.stop_code}
                                  onChange={(e) => updateEditForm("stop_code", e.target.value)}
                                  className="w-full rounded-xl border px-3 py-2"
                                />
                              </Field>

                              <Field label="Ordning">
                                <input
                                  type="number"
                                  value={editForm.sort_order}
                                  onChange={(e) => updateEditForm("sort_order", e.target.value)}
                                  className="w-full rounded-xl border px-3 py-2"
                                />
                              </Field>

                              <Field label="Status">
                                <select
                                  value={editForm.status}
                                  onChange={(e) => updateEditForm("status", e.target.value)}
                                  className="w-full rounded-xl border px-3 py-2"
                                >
                                  <option value="active">Aktiv</option>
                                  <option value="draft">Utkast</option>
                                  <option value="inactive">Inaktiv</option>
                                </select>
                              </Field>

                              <Field label="Latitude">
                                <input
                                  value={editForm.latitude}
                                  onChange={(e) => updateEditForm("latitude", e.target.value)}
                                  className="w-full rounded-xl border px-3 py-2"
                                />
                              </Field>

                              <Field label="Longitude">
                                <input
                                  value={editForm.longitude}
                                  onChange={(e) => updateEditForm("longitude", e.target.value)}
                                  className="w-full rounded-xl border px-3 py-2"
                                />
                              </Field>

                              <label className="flex items-center gap-2 rounded-xl border bg-white p-3 text-sm text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={editForm.is_active}
                                  onChange={(e) => updateEditForm("is_active", e.target.checked)}
                                />
                                Aktiv hållplats
                              </label>

                              <div className="md:col-span-2 xl:col-span-3">
                                <Field label="Beskrivning">
                                  <textarea
                                    rows={3}
                                    value={editForm.description}
                                    onChange={(e) => updateEditForm("description", e.target.value)}
                                    className="w-full rounded-xl border px-3 py-2"
                                  />
                                </Field>
                              </div>
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
                                onClick={() => saveEdit(stop.id)}
                                disabled={savingEditId === stop.id}
                                className="rounded-full bg-[#194C66] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                              >
                                {savingEditId === stop.id ? "Sparar..." : "Spara ändringar"}
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

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}