// src/pages/admin/sundra/resor/[id]/avgangar.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/sundra/Topbar";
import { Sidebar } from "@/components/sundra/Sidebar";
import type { TripRecord } from "@/lib/sundra/trips/types";
import { tripRepo, type DepartureRecord, type OperatorRecord } from "@/lib/sundra/trips/repo.client";

function toStopsArray(input: string): string[] {
  return input
    .split(/[,;\n]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminTripDeparturesPage() {
  const router = useRouter();
  const idRaw = router.query.id;
  const tripId = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [rows, setRows] = useState<DepartureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ny avgång-form
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newSeats, setNewSeats] = useState<number | "">(54);
  const [newOperatorId, setNewOperatorId] = useState<string>("");
  const [newStops, setNewStops] = useState<string>("");

  // inline edit state
  const [editing, setEditing] = useState<Record<string, Partial<DepartureRecord>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const operatorMap = useMemo(() => {
    const m = new Map<string, OperatorRecord>();
    operators.forEach((o) => m.set(o.id, o));
    return m;
  }, [operators]);

  useEffect(() => {
    if (!tripId) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [t, deps, ops] = await Promise.all([
          tripRepo.getTripById(tripId),
          tripRepo.listDepartures(tripId),
          tripRepo.listOperators().catch(() => [] as OperatorRecord[]),
        ]);

        if (!alive) return;

        setTrip(t ?? null);
        setRows(deps ?? []);
        setOperators(ops ?? []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Kunde inte läsa avgångar.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tripId]);

  function startEdit(dep: DepartureRecord) {
    setEditing((prev) => ({
      ...prev,
      [dep.id]: {
        depart_date: dep.depart_date,
        dep_time: dep.dep_time,
        seats_total: dep.seats_total,
        operator_id: (dep.operator_id ?? null) as any,
        operator_name: dep.operator_name ?? null,
        line_name: dep.line_name ?? null,
        stops: dep.stops ?? null,
      },
    }));
  }

  function patchEdit(depId: string, patch: Partial<DepartureRecord>) {
    setEditing((prev) => ({
      ...prev,
      [depId]: { ...(prev[depId] ?? {}), ...patch },
    }));
  }

  function cancelEdit(depId: string) {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[depId];
      return next;
    });
  }

  async function refreshDepartures() {
    if (!tripId) return;
    const deps = await tripRepo.listDepartures(tripId);
    setRows(deps ?? []);
  }

  async function createDeparture() {
    if (!tripId) return;

    try {
      setErr(null);

      const op = newOperatorId ? operatorMap.get(newOperatorId) : null;
      const operator_name = op?.name ?? null;

      const payload = {
        depart_date: newDate.trim(),
        dep_time: newTime.trim() ? newTime.trim().slice(0, 5) : null,
        seats_total: newSeats === "" ? null : Number(newSeats),
        operator_id: newOperatorId ? newOperatorId : null,
        operator_name,
        line_name: operator_name, // så du kan visa snabbt även utan join
        stops: newStops.trim() ? (toStopsArray(newStops) as any) : null,
      };

      await tripRepo.createDeparture(tripId, payload);

      setNewDate("");
      setNewTime("");
      setNewStops("");

      await refreshDepartures();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte skapa avgång.");
    }
  }

  async function saveRow(dep: DepartureRecord) {
    const depId = dep.id;
    const ed = editing[depId];
    if (!ed) return;

    try {
      setErr(null);
      setSavingId(depId);

      const opId = (ed.operator_id as any) ? String(ed.operator_id) : "";
      const op = opId ? operatorMap.get(opId) : null;
      const operator_name = op?.name ?? (ed.operator_name ?? null);

      const patch = {
        depart_date: String(ed.depart_date ?? dep.depart_date).slice(0, 10),
        dep_time: ed.dep_time ? String(ed.dep_time).slice(0, 5) : null,
        seats_total: ed.seats_total == null ? 0 : Number(ed.seats_total),
        operator_id: opId ? opId : null,
        operator_name,
        line_name: operator_name ?? (ed.line_name ?? null),
        stops: ed.stops ?? null,
      };

      const saved = await tripRepo.updateDeparture(depId, patch);

      setRows((prev) => prev.map((r) => (r.id === depId ? saved : r)));
      cancelEdit(depId);
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte spara avgång.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRow(depId: string) {
    const ok = window.confirm("Ta bort denna avgång? (Kan inte ångras)");
    if (!ok) return;

    try {
      setErr(null);
      setDeletingId(depId);
      await tripRepo.deleteDeparture(depId);
      setRows((prev) => prev.filter((r) => r.id !== depId));
      cancelEdit(depId);
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte ta bort avgång.");
    } finally {
      setDeletingId(null);
    }
  }

  const title = (trip as any)?.title ?? "Resa";

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6 md:pl-[18rem]">
          <div className="mx-auto max-w-[1100px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-500">Admin • Avgångar</div>
                <h1 className="mt-1 text-xl font-semibold text-gray-900">{title}</h1>
                <div className="mt-1 text-sm text-gray-600">
                  Lägg in datum, tid, operatör och antal platser. Avgångar visas senare på <span className="font-semibold">Boka</span>-sidan & i sök.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/admin/sundra/resor"
                  className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                >
                  ← Till resor
                </Link>

                {tripId ? (
                  <Link
                    href={`/admin/sundra/resor/_preview/${tripId}`}
                    className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    Förhandsgranska
                  </Link>
                ) : null}
              </div>
            </div>

            {err ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">Laddar…</div>
            ) : (
              <>
                {/* Skapa ny avgång */}
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-gray-900">Ny avgång</div>

                  <div className="mt-4 grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-gray-600">Datum</label>
                      <input
                        type="date"
                        className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600">Tid</label>
                      <input
                        type="time"
                        className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-semibold text-gray-600">Operatör (vem kör)</label>
                      <select
                        className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                        value={newOperatorId}
                        onChange={(e) => setNewOperatorId(e.target.value)}
                      >
                        <option value="">— Välj operatör —</option>
                        {operators.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-gray-600">Antal platser</label>
                      <input
                        type="number"
                        className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                        value={newSeats}
                        onChange={(e) => setNewSeats(e.target.value === "" ? "" : Number(e.target.value))}
                        min={0}
                      />
                    </div>

                    <div className="md:col-span-9">
                      <label className="block text-xs font-semibold text-gray-600">
                        Hållplatser (komma-separerat, valfritt)
                      </label>
                      <input
                        className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                        value={newStops}
                        onChange={(e) => setNewStops(e.target.value)}
                        placeholder="Helsingborg, Ängelholm, Halmstad…"
                      />
                    </div>

                    <div className="md:col-span-3 flex items-end">
                      <button
                        type="button"
                        onClick={createDeparture}
                        disabled={!tripId || !newDate.trim()}
                        className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        + Lägg till
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista avgångar */}
                <div className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Datum</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Tid</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Operatör</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Hållplatser</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Platser</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Kvar</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Åtgärd</th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                              Inga avgångar ännu.
                            </td>
                          </tr>
                        ) : (
                          rows.map((r) => {
                            const ed = editing[r.id];
                            const isEdit = !!ed;

                            const seatsTotal = Number((isEdit ? ed.seats_total : r.seats_total) ?? 0);
                            const reserved = Number(r.seats_reserved ?? 0);
                            const left = Math.max(0, seatsTotal - reserved);

                            const opId = String((isEdit ? (ed.operator_id as any) : (r.operator_id as any)) ?? "");
                            const opName =
                              (isEdit ? ed.operator_name : r.operator_name) ??
                              (opId ? operatorMap.get(opId)?.name : null) ??
                              r.line_name ??
                              "—";

                            const stopsArr = (isEdit ? (ed.stops as any) : (r.stops as any)) ?? null;
                            const stopsText = Array.isArray(stopsArr) ? stopsArr.join(", ") : "";

                            return (
                              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                                <td className="px-4 py-3">
                                  {isEdit ? (
                                    <input
                                      type="date"
                                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                                      value={String(ed.depart_date ?? "").slice(0, 10)}
                                      onChange={(e) => patchEdit(r.id, { depart_date: e.target.value })}
                                    />
                                  ) : (
                                    <span className="font-semibold text-gray-900">
                                      {new Date(r.depart_date).toLocaleDateString("sv-SE", {
                                        year: "numeric",
                                        month: "short",
                                        day: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {isEdit ? (
                                    <input
                                      type="time"
                                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                                      value={ed.dep_time ?? ""}
                                      onChange={(e) => patchEdit(r.id, { dep_time: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-gray-800">{r.dep_time ?? "—"}</span>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {isEdit ? (
                                    <select
                                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                                      value={opId}
                                      onChange={(e) => {
                                        const nextId = e.target.value;
                                        const op = nextId ? operatorMap.get(nextId) : null;
                                        patchEdit(r.id, {
                                          operator_id: nextId || null,
                                          operator_name: op?.name ?? null,
                                          line_name: op?.name ?? null,
                                        });
                                      }}
                                    >
                                      <option value="">—</option>
                                      {operators.map((o) => (
                                        <option key={o.id} value={o.id}>
                                          {o.name}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-gray-900 font-semibold">{opName}</span>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {isEdit ? (
                                    <input
                                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                                      value={stopsText}
                                      onChange={(e) => patchEdit(r.id, { stops: toStopsArray(e.target.value) as any })}
                                      placeholder="Helsingborg, Ängelholm…"
                                    />
                                  ) : (
                                    <span className="text-gray-700">{stopsText || "—"}</span>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right">
                                  {isEdit ? (
                                    <input
                                      type="number"
                                      className="w-28 rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900 text-right"
                                      value={String(ed.seats_total ?? 0)}
                                      min={0}
                                      onChange={(e) => patchEdit(r.id, { seats_total: Number(e.target.value) })}
                                    />
                                  ) : (
                                    <span className="font-semibold text-gray-900">{seatsTotal}</span>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right">
                                  <span className="font-semibold text-gray-900">{left}</span>
                                </td>

                                <td className="px-4 py-3 text-right">
                                  {!isEdit ? (
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => startEdit(r)}
                                        className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                                      >
                                        Redigera
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteRow(r.id)}
                                        disabled={deletingId === r.id}
                                        className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                                      >
                                        {deletingId === r.id ? "Tar bort…" : "Ta bort"}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => cancelEdit(r.id)}
                                        className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                                      >
                                        Avbryt
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => saveRow(r)}
                                        disabled={savingId === r.id}
                                        className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                      >
                                        {savingId === r.id ? "Sparar…" : "Spara"}
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


