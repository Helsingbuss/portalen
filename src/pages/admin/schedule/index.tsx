// src/pages/admin/schedule/index.tsx
import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type DriverOpt = { id: string; label: string; active?: boolean };
type VehicleOpt = { id: string; label: string; regno?: string | null; active?: boolean };

type Row = {
  id: string;
  start_at: string;        // ISO
  end_at: string;          // ISO
  from: string | null;     // OBS: matchar kolumnnamnet "from"
  to: string | null;       // OBS: matchar kolumnnamnet "to"
  status: "draft" | "published" | string;
  driver_id: string | null;
  vehicle_id: string | null;
  internal_note?: string | null;
  // conflict_count är inte implementerat i API:t ännu; defaulta till 0
  conflict_count?: number;
};

function cls(...xs: (string | null | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

export default function SchedulePage() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(ymd(today));
  const [to, setTo] = useState(ymd(new Date(Date.now() + 7 * 86400000)));

  const [drivers, setDrivers] = useState<DriverOpt[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [editId, setEditId] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState(ymd(today));
  const [timeStart, setTimeStart] = useState("08:00");
  const [dateEnd, setDateEnd] = useState(ymd(today));
  const [timeEnd, setTimeEnd] = useState("12:00");
  const [fromPlace, setFromPlace] = useState("");
  const [toPlace, setToPlace] = useState("");
  const [driverId, setDriverId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [note, setNote] = useState("");

  // Ladda resurser (chaufförer/fordon)
  async function loadResources() {
    try {
      const res = await fetch("/api/schedule/resources");
      const j = await res.json();
      setDrivers(j?.drivers ?? []);
      setVehicles(j?.vehicles ?? []);
    } catch {
      setDrivers([]);
      setVehicles([]);
    }
  }

  // Ladda schemarader
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRows((j?.rows ?? []).map((r: any) => ({ conflict_count: 0, ...r })));
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta schema");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadResources(); }, []);
  useEffect(() => { load(); }, [from, to]);

  function resetForm() {
    setEditId(null);
    setDateStart(ymd(today));
    setTimeStart("08:00");
    setDateEnd(ymd(today));
    setTimeEnd("12:00");
    setFromPlace("");
    setToPlace("");
    setDriverId("");
    setVehicleId("");
    setStatus("draft");
    setNote("");
  }

  function editRow(r: Row) {
    // Vi fortsätter stödja redigera-UI:t, men API:t saknar PATCH just nu
    setEditId(r.id);
    setDateStart(r.start_at.slice(0, 10));
    setTimeStart(r.start_at.slice(11, 16));
    setDateEnd(r.end_at.slice(0, 10));
    setTimeEnd(r.end_at.slice(11, 16));
    setFromPlace(r.from || "");
    setToPlace(r.to || "");
    setDriverId(r.driver_id || "");
    setVehicleId(r.vehicle_id || "");
    setStatus((r.status as "draft" | "published") ?? "draft");
    setNote(r.internal_note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Matcha API:t: /api/schedule POST (vi skickar date_*/time_* + from/to + internal_note)
      const payload = {
        date_start: dateStart,
        time_start: timeStart,
        date_end: dateEnd,
        time_end: timeEnd,
        from: fromPlace || null,
        to: toPlace || null,
        driver_id: driverId || null,
        vehicle_id: vehicleId || null,
        status,
        internal_note: note || null,
        // editId skickas inte nu eftersom API:t saknar PATCH (kommer i nästa steg)
      };

      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }

      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.message || "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }

  // Hjälp att få namn för chaufför/fordon i tabellen
  function getDriverLabel(id?: string | null) {
    if (!id) return "—";
    return drivers.find(d => d.id === id)?.label ?? "—";
  }
  function getVehicleLabel(id?: string | null) {
    if (!id) return "—";
    return vehicles.find(v => v.id === id)?.label ?? "—";
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="p-6 space-y-6">
          {/* Rubrik + luft */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">Schemaläggning</h1>
          </div>
          <div className="mt-2" />

          {/* Filterkort */}
          <div className="bg-white rounded-xl shadow p-4">
            <form
              onSubmit={(e) => { e.preventDefault(); load(); }}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="text-sm text-[#194C66]/80">
                Från
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 border rounded px-2 py-1 text-sm"
                />
              </label>
              <label className="text-sm text-[#194C66]/80">
                Till
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 border rounded px-2 py-1 text-sm"
                />
              </label>
              <button
                type="submit"
                className="h-8 px-3 rounded bg-[#194C66] text-white text-sm"
              >
                Visa
              </button>
            </form>
          </div>

          {/* Felbanner */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              {error}
            </div>
          )}

          {/* Form-kort */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-[#194C66] font-semibold mb-3">
              {editId ? "Redigera schemarad" : "Ny schemarad"}
            </div>

            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <label className="text-sm text-[#194C66]/80">
                Datum start
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>
              <label className="text-sm text-[#194C66]/80">
                Tid start
                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>
              <label className="text-sm text-[#194C66]/80">
                Datum slut
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>
              <label className="text-sm text-[#194C66]/80">
                Tid slut
                <input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>

              <label className="text-sm text-[#194C66]/80 md:col-span-2">
                Från
                <input
                  value={fromPlace}
                  onChange={(e) => setFromPlace(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1"
                  placeholder="Startadress/plats"
                />
              </label>
              <label className="text-sm text-[#194C66]/80 md:col-span-2">
                Till
                <input
                  value={toPlace}
                  onChange={(e) => setToPlace(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1"
                  placeholder="Slutadress/plats"
                />
              </label>

              <label className="text-sm text-[#194C66]/80">
                Chaufför
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1"
                >
                  <option value="">— Välj —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-[#194C66]/80">
                Fordon
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1"
                >
                  <option value="">— Välj —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}{v.regno ? ` (${v.regno})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-[#194C66]/80">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1 w-full border rounded px-2 py-1"
                >
                  <option value="draft">Utkast</option>
                  <option value="published">Publicerad</option>
                </select>
              </label>

              <label className="text-sm text-[#194C66]/80 md:col-span-3">
                Intern notering
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1"
                  placeholder="Valfritt"
                />
              </label>

              <div className="md:col-span-4 flex items-center justify-end gap-3">
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                  >
                    Avbryt
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className={cls(
                    "px-4 py-2 rounded-[25px] text-sm",
                    saving ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-[#194C66] text-white"
                  )}
                >
                  {saving ? "Sparar…" : (editId ? "Spara (skapar ny rad)" : "Lägg till")}
                </button>
              </div>
            </form>
          </div>

          {/* Lista-kort */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[130px]" />
                <col className="w-[90px]" />
                <col className="w-[130px]" />
                <col className="w-[90px]" />
                <col className="w-[180px]" />
                <col className="w-[180px]" />
                <col className="w-[180px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-sm text-[#194C66]/70 select-none">
                  <th className="px-4 py-2 font-bold">Datum</th>
                  <th className="px-4 py-2 font-bold">Start</th>
                  <th className="px-4 py-2 font-bold">Datum (slut)</th>
                  <th className="px-4 py-2 font-bold">Slut</th>
                  <th className="px-4 py-2 font-bold">Från</th>
                  <th className="px-4 py-2 font-bold">Till</th>
                  <th className="px-4 py-2 font-bold">Chaufför</th>
                  <th className="px-4 py-2 font-bold">Fordon</th>
                  <th className="px-4 py-2 font-bold">Status</th>
                  <th className="px-4 py-2 font-bold text-right"> </th>
                </tr>
              </thead>
              <tbody className="text-[15px] text-[#194C66]">
                {loading && (
                  <tr><td colSpan={10} className="px-4 py-6 text-center text-[#194C66]/60">Laddar…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-6 text-center text-[#194C66]/60">Inget i perioden.</td></tr>
                )}
                {!loading && rows.map((r) => {
                  const ds = r.start_at.slice(0, 10);
                  const ts = r.start_at.slice(11, 16);
                  const de = r.end_at.slice(0, 10);
                  const te = r.end_at.slice(11, 16);
                  return (
                    <tr key={r.id} className="border-b last:border-b-0 border-[#E5E7EB]/80 hover:bg-[#194C66]/5">
                      <td className="px-4 py-3 whitespace-nowrap">{ds}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{ts}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{de}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{te}</td>
                      <td className="px-4 py-3">{r.from || "—"}</td>
                      <td className="px-4 py-3">{r.to || "—"}</td>
                      <td className="px-4 py-3">{getDriverLabel(r.driver_id)}</td>
                      <td className="px-4 py-3">{getVehicleLabel(r.vehicle_id)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cls(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs",
                            r.status === "published" ? "bg-[#e5eef3] text-[#194C66]" : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {r.status === "published" ? "Publicerad" : "Utkast"}
                        </span>
                        {(r.conflict_count ?? 0) > 0 && (
                          <span className="ml-2 text-xs text-red-600">⚠ {r.conflict_count} konflikt</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => editRow(r)}
                            className="inline-flex items-center h-9 px-4 rounded-full text-white text-sm"
                            style={{ backgroundColor: "#194C66" }}
                          >
                            Redigera
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pb-4" />
        </main>
      </div>
    </>
  );
}
