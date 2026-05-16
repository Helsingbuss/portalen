import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Route = {
  id: string;
  name?: string | null;
  route_code?: string | null;
};

type Stop = {
  id: string;
  name: string;
  city?: string | null;
};

type LineStop = {
  id: string;
  line_id: string;
  stop_id: string;
  stop_order?: number | null;
  departure_time?: string | null;
  arrival_time?: string | null;
  price?: number | null;
  is_active?: boolean | null;
  shuttle_stops?: Stop | null;
};

type Line = {
  id: string;
  route_id?: string | null;
  name: string;
  code?: string | null;
  start_city?: string | null;
  end_city?: string | null;
  color?: string | null;
  description?: string | null;
  status?: string | null;
  shuttle_routes?: Route | null;
  shuttle_line_stops?: LineStop[];
};

const EMPTY_LINE = {
  route_id: "",
  name: "",
  code: "",
  start_city: "",
  end_city: "",
  color: "#194C66",
  description: "",
  status: "active",
};

const EMPTY_LINK = {
  line_id: "",
  stop_id: "",
  stop_order: "",
  departure_time: "",
  arrival_time: "",
  price: "",
  is_active: true,
};

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function tidyTime(value?: string | null) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

export default function ShuttleLinesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [lines, setLines] = useState<Line[]>([]);

  const [lineForm, setLineForm] = useState(EMPTY_LINE);
  const [linkForm, setLinkForm] = useState(EMPTY_LINK);

  const [loading, setLoading] = useState(true);
  const [savingLine, setSavingLine] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [routesRes, stopsRes, linesRes] = await Promise.all([
        fetch("/api/admin/shuttle/routes"),
        fetch("/api/admin/shuttle/stops"),
        fetch("/api/admin/shuttle/lines"),
      ]);

      const routesJson = await routesRes.json().catch(() => ({}));
      const stopsJson = await stopsRes.json().catch(() => ({}));
      const linesJson = await linesRes.json().catch(() => ({}));

      setRoutes(routesJson.routes || []);
      setStops(stopsJson.stops || []);
      setLines(linesJson.lines || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateLine(key: string, value: any) {
    setLineForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateLink(key: string, value: any) {
    setLinkForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createLine() {
    try {
      setSavingLine(true);
      setError("");

      if (!lineForm.name.trim()) {
        throw new Error("Linjenamn saknas.");
      }

      const res = await fetch("/api/admin/shuttle/lines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lineForm),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa linje.");
      }

      setLineForm(EMPTY_LINE);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSavingLine(false);
    }
  }

  async function linkStopToLine() {
    try {
      setSavingLink(true);
      setError("");

      if (!linkForm.line_id || !linkForm.stop_id) {
        throw new Error("Välj linje och hållplats.");
      }

      const res = await fetch("/api/admin/shuttle/lines", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "link_stop_to_line",
          ...linkForm,
          stop_order: Number(linkForm.stop_order || 0),
          price: Number(linkForm.price || 0),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte koppla hållplats.");
      }

      setLinkForm((prev) => ({
        ...EMPTY_LINK,
        line_id: prev.line_id,
      }));

      await loadData();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSavingLink(false);
    }
  }

  async function updateLineStop(lineStop: LineStop, patch: Partial<LineStop>) {
    try {
      const next = {
        ...lineStop,
        ...patch,
      };

      const res = await fetch("/api/admin/shuttle/lines", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_line_stop",
          id: next.id,
          stop_order: Number(next.stop_order || 0),
          departure_time: next.departure_time || null,
          arrival_time: next.arrival_time || null,
          price: Number(next.price || 0),
          is_active: next.is_active !== false,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte uppdatera hållplats.");
      }

      await loadData();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    }
  }

  async function removeLineStop(id: string) {
    if (!confirm("Ta bort hållplatsen från linjen?")) return;

    try {
      const res = await fetch(`/api/admin/shuttle/lines?id=${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte ta bort koppling.");
      }

      await loadData();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    }
  }

  const stats = useMemo(() => {
    return {
      lines: lines.length,
      linkedStops: lines.reduce(
        (sum, line) => sum + Number(line.shuttle_line_stops?.length || 0),
        0
      ),
    };
  }, [lines]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Airport Shuttle – Linjer
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa linjer och koppla hållplatser, tider och priser.
              </p>
            </div>

            <button
              onClick={loadData}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Stat title="Linjer" value={stats.lines} />
            <Stat title="Kopplade hållplatser" value={stats.linkedStops} />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <aside className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Skapa linje
                </h2>

                <div className="mt-5 space-y-4">
                  <Field label="Rutt">
                    <select
                      value={lineForm.route_id}
                      onChange={(e) => updateLine("route_id", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="">Välj rutt</option>
                      {routes.map((route) => (
                        <option key={route.id} value={route.id}>
                          {route.name}
                          {route.route_code ? ` (${route.route_code})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Linjenamn">
                    <input
                      value={lineForm.name}
                      onChange={(e) => updateLine("name", e.target.value)}
                      placeholder="Linje Helsingborg Airport"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Linjekod">
                    <input
                      value={lineForm.code}
                      onChange={(e) => updateLine("code", e.target.value)}
                      placeholder="AIR-1"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Startort">
                      <input
                        value={lineForm.start_city}
                        onChange={(e) => updateLine("start_city", e.target.value)}
                        placeholder="Helsingborg"
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </Field>

                    <Field label="Slutort">
                      <input
                        value={lineForm.end_city}
                        onChange={(e) => updateLine("end_city", e.target.value)}
                        placeholder="Flygplatsen"
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </Field>
                  </div>

                  <Field label="Färg">
                    <input
                      type="color"
                      value={lineForm.color}
                      onChange={(e) => updateLine("color", e.target.value)}
                      className="h-12 w-full rounded-xl border p-1"
                    />
                  </Field>

                  <Field label="Beskrivning">
                    <textarea
                      rows={3}
                      value={lineForm.description}
                      onChange={(e) => updateLine("description", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <button
                    onClick={createLine}
                    disabled={savingLine}
                    className="w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {savingLine ? "Sparar..." : "Skapa linje"}
                  </button>
                </div>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Koppla hållplats till linje
                </h2>

                <div className="mt-5 space-y-4">
                  <Field label="Linje">
                    <select
                      value={linkForm.line_id}
                      onChange={(e) => updateLink("line_id", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="">Välj linje</option>
                      {lines.map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.name}
                          {line.code ? ` (${line.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Hållplats">
                    <select
                      value={linkForm.stop_id}
                      onChange={(e) => updateLink("stop_id", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="">Välj hållplats</option>
                      {stops.map((stop) => (
                        <option key={stop.id} value={stop.id}>
                          {stop.name}
                          {stop.city ? ` – ${stop.city}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Ordning">
                      <input
                        type="number"
                        value={linkForm.stop_order}
                        onChange={(e) => updateLink("stop_order", e.target.value)}
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </Field>

                    <Field label="Avgångstid">
                      <input
                        type="time"
                        value={linkForm.departure_time}
                        onChange={(e) => updateLink("departure_time", e.target.value)}
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Ankomsttid">
                      <input
                        type="time"
                        value={linkForm.arrival_time}
                        onChange={(e) => updateLink("arrival_time", e.target.value)}
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </Field>

                    <Field label="Pris">
                      <input
                        type="number"
                        value={linkForm.price}
                        onChange={(e) => updateLink("price", e.target.value)}
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </Field>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={linkForm.is_active}
                      onChange={(e) => updateLink("is_active", e.target.checked)}
                    />
                    Aktiv på linjen
                  </label>

                  <button
                    onClick={linkStopToLine}
                    disabled={savingLink}
                    className="w-full rounded-2xl bg-[#00866f] px-4 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {savingLink ? "Kopplar..." : "Koppla hållplats"}
                  </button>
                </div>
              </section>
            </aside>

            <section className="rounded-3xl bg-white shadow">
              <div className="border-b p-5">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Linjer med hållplatser
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-gray-500">Laddar...</div>
              ) : lines.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  Inga linjer skapade ännu.
                </div>
              ) : (
                <div className="divide-y">
                  {lines.map((line) => (
                    <div key={line.id} className="p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: line.color || "#194C66" }}
                        />
                        <div>
                          <h3 className="font-semibold text-[#0f172a]">
                            {line.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {line.shuttle_routes?.name || "Ingen rutt"} ·{" "}
                            {line.code || "Ingen kod"}
                          </p>
                        </div>
                      </div>

                      {!line.shuttle_line_stops?.length ? (
                        <div className="rounded-2xl border bg-[#f8fafc] p-4 text-sm text-gray-500">
                          Inga hållplatser kopplade ännu.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border">
                          <table className="w-full min-w-[820px] text-left text-sm">
                            <thead className="bg-[#f8fafc] text-xs text-gray-500">
                              <tr>
                                <th className="px-3 py-2">Ordning</th>
                                <th className="px-3 py-2">Hållplats</th>
                                <th className="px-3 py-2">Avgång</th>
                                <th className="px-3 py-2">Ankomst</th>
                                <th className="px-3 py-2">Pris</th>
                                <th className="px-3 py-2">Aktiv</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {line.shuttle_line_stops.map((ls) => (
                                <tr key={ls.id}>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      defaultValue={ls.stop_order || 0}
                                      onBlur={(e) =>
                                        updateLineStop(ls, {
                                          stop_order: Number(e.target.value || 0),
                                        })
                                      }
                                      className="w-20 rounded-lg border px-2 py-1"
                                    />
                                  </td>

                                  <td className="px-3 py-2">
                                    <div className="font-medium">
                                      {ls.shuttle_stops?.name || "—"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {ls.shuttle_stops?.city || ""}
                                    </div>
                                  </td>

                                  <td className="px-3 py-2">
                                    <input
                                      type="time"
                                      defaultValue={tidyTime(ls.departure_time)}
                                      onBlur={(e) =>
                                        updateLineStop(ls, {
                                          departure_time: e.target.value,
                                        })
                                      }
                                      className="rounded-lg border px-2 py-1"
                                    />
                                  </td>

                                  <td className="px-3 py-2">
                                    <input
                                      type="time"
                                      defaultValue={tidyTime(ls.arrival_time)}
                                      onBlur={(e) =>
                                        updateLineStop(ls, {
                                          arrival_time: e.target.value,
                                        })
                                      }
                                      className="rounded-lg border px-2 py-1"
                                    />
                                  </td>

                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      defaultValue={Number(ls.price || 0)}
                                      onBlur={(e) =>
                                        updateLineStop(ls, {
                                          price: Number(e.target.value || 0),
                                        })
                                      }
                                      className="w-28 rounded-lg border px-2 py-1"
                                    />
                                    <div className="mt-1 text-xs text-[#194C66]">
                                      {money(ls.price)}
                                    </div>
                                  </td>

                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      defaultChecked={ls.is_active !== false}
                                      onChange={(e) =>
                                        updateLineStop(ls, {
                                          is_active: e.target.checked,
                                        })
                                      }
                                    />
                                  </td>

                                  <td className="px-3 py-2 text-right">
                                    <button
                                      onClick={() => removeLineStop(ls.id)}
                                      className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                                    >
                                      Ta bort
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-[#194C66]">{label}</div>
      {children}
    </label>
  );
}
