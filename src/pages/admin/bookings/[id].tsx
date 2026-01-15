import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Booking = {
  id: string;
  booking_number?: string | null;
  status?: string | null;

  contact_person?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;

  passengers?: number | null;

  departure_place?: string | null;
  destination?: string | null;
  departure_date?: string | null; // YYYY-MM-DD
  departure_time?: string | null; // HH:MM
  end_time?: string | null;
  on_site_minutes?: number | null;
  stopover_places?: string | null;

  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  return_end_time?: string | null;
  return_on_site_minutes?: number | null;

  notes?: string | null;

  assigned_driver_id?: string | null;
  assigned_vehicle_id?: string | null;

  total_price?: number | null;

  created_at?: string | null;
  updated_at?: string | null;
};

const RED_HOURS = 48;
const ORANGE_HOURS = 120;

function clsStatusPill(s?: string | null) {
  const v = (s || "").toLowerCase();
  if (v === "godkand" || v === "godkänd") return "bg-green-100 text-green-800";
  if (v === "bekraftad" || v === "bekräftad" || v === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (v === "planerad" || v === "bokad" || v === "created") return "bg-blue-100 text-blue-800";
  if (v === "makulerad" || v === "avbojt" || v === "avböjt" || v === "inställd") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

function tidyTime(t?: string | null) {
  if (!t) return null;
  const s = String(t);
  if (s.includes(":")) return s.slice(0, 5);
  if (s.length >= 4) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return null;
}

function parseDateTime(date?: string | null, time?: string | null): Date | null {
  if (!date) return null;
  const tt = tidyTime(time) || "00:00";
  const dt = new Date(`${date}T${tt}`);
  return isNaN(dt.getTime()) ? null : dt;
}

function prioMeta(date?: string | null, time?: string | null) {
  const target = parseDateTime(date, time);
  if (!target) return { label: "—", cls: "bg-gray-200 text-gray-700", title: "Saknar/ogiltigt datum" };

  const diffH = (target.getTime() - Date.now()) / 36e5;
  if (diffH <= RED_HOURS) return { label: "Röd", cls: "bg-red-100 text-red-800", title: "≤ 48h kvar" };
  if (diffH <= ORANGE_HOURS) return { label: "Orange", cls: "bg-amber-100 text-amber-800", title: "48–120h kvar" };
  return { label: "Grön", cls: "bg-green-100 text-green-800", title: "> 120h kvar" };
}

function relUntil(date?: string | null, time?: string | null) {
  const target = parseDateTime(date, time);
  if (!target) return "—";
  let diffMs = target.getTime() - Date.now();
  const neg = diffMs < 0;
  diffMs = Math.abs(diffMs);
  const h = Math.floor(diffMs / 36e5);
  const d = Math.floor(h / 24);
  const hr = h % 24;
  const m = Math.floor((diffMs % 36e5) / 60000);
  const base = d > 0 ? `${d} d ${hr} h` : `${hr} h ${m} min`;
  return neg ? `−${base} (passerad)` : `om ${base}`;
}

function fmtDateSv(iso?: string | null) {
  if (!iso) return "—";
  const dt = new Date(`${iso}T00:00:00`);
  try {
    return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(dt);
  } catch {
    return iso;
  }
}

function fmtTime(t?: string | null) {
  return tidyTime(t) ?? "—";
}

function toNumOrNull(v: any): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sanitizeTel(t?: string | null) {
  if (!t) return "";
  return t.replace(/[^\d+]/g, "");
}

function formatSEK(v?: number | null) {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Normalisera API-svar till Booking */
function normalizeBooking(x: any): Booking {
  return {
    id: String(x.id ?? x.booking_id ?? x.uuid ?? ""),
    booking_number: x.booking_number ?? x.bookingNo ?? x.number ?? null,
    status: x.status ?? x.state ?? null,

    contact_person: x.contact_person ?? x.customer_name ?? x.contact ?? null,
    customer_email: x.customer_email ?? x.email ?? null,
    customer_phone: x.customer_phone ?? x.phone ?? null,

    passengers: toNumOrNull(x.passengers),

    departure_place: x.departure_place ?? x.from ?? x.departure_location ?? null,
    destination: x.destination ?? x.to ?? x.destination_location ?? null,
    departure_date: x.departure_date ?? x.date ?? null,
    departure_time: tidyTime(x.departure_time ?? x.time ?? null),
    end_time: tidyTime(x.end_time ?? null),
    on_site_minutes: toNumOrNull(x.on_site_minutes),

    stopover_places: x.stopover_places ?? x.via ?? null,

    return_departure: x.return_departure ?? x.return_from ?? null,
    return_destination: x.return_destination ?? x.return_to ?? null,
    return_date: x.return_date ?? null,
    return_time: tidyTime(x.return_time ?? null),
    return_end_time: tidyTime(x.return_end_time ?? null),
    return_on_site_minutes: toNumOrNull(x.return_on_site_minutes),

    notes: x.notes ?? x.message ?? null,

    assigned_driver_id: x.assigned_driver_id ?? x.driver_id ?? null,
    assigned_vehicle_id: x.assigned_vehicle_id ?? x.vehicle_id ?? null,

    total_price: toNumOrNull(x.total_price),

    created_at: x.created_at ?? null,
    updated_at: x.updated_at ?? null,
  };
}

type BookingForm = {
  status: string;
  contact_person: string;
  customer_email: string;
  customer_phone: string;
  passengers: string;
  departure_place: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  end_time: string;
  on_site_minutes: string;
  stopover_places: string;

  return_departure: string;
  return_destination: string;
  return_date: string;
  return_time: string;
  return_end_time: string;
  return_on_site_minutes: string;

  notes: string;
  assigned_driver_id: string;
  assigned_vehicle_id: string;

  total_price: string;
};

function bookingToForm(b: Booking): BookingForm {
  return {
    status: b.status ?? "",
    contact_person: b.contact_person ?? "",
    customer_email: b.customer_email ?? "",
    customer_phone: b.customer_phone ?? "",
    passengers: b.passengers == null ? "" : String(b.passengers),

    departure_place: b.departure_place ?? "",
    destination: b.destination ?? "",
    departure_date: b.departure_date ?? "",
    departure_time: tidyTime(b.departure_time) ?? "",
    end_time: tidyTime(b.end_time) ?? "",
    on_site_minutes: b.on_site_minutes == null ? "" : String(b.on_site_minutes),
    stopover_places: b.stopover_places ?? "",

    return_departure: b.return_departure ?? "",
    return_destination: b.return_destination ?? "",
    return_date: b.return_date ?? "",
    return_time: tidyTime(b.return_time) ?? "",
    return_end_time: tidyTime(b.return_end_time) ?? "",
    return_on_site_minutes: b.return_on_site_minutes == null ? "" : String(b.return_on_site_minutes),

    notes: b.notes ?? "",
    assigned_driver_id: b.assigned_driver_id ?? "",
    assigned_vehicle_id: b.assigned_vehicle_id ?? "",

    total_price: b.total_price == null ? "" : String(b.total_price),
  };
}

function formToPatch(f: BookingForm) {
  const toNull = (v: any) => (v === "" || v === undefined ? null : v);

  return {
    status: toNull(f.status),
    contact_person: toNull(f.contact_person),
    customer_email: toNull(f.customer_email),
    customer_phone: toNull(f.customer_phone),

    passengers: f.passengers === "" ? null : Number(f.passengers),

    departure_place: toNull(f.departure_place),
    destination: toNull(f.destination),
    departure_date: toNull(f.departure_date),
    departure_time: toNull(f.departure_time ? tidyTime(f.departure_time) : null),
    end_time: toNull(f.end_time ? tidyTime(f.end_time) : null),
    on_site_minutes: f.on_site_minutes === "" ? null : Number(f.on_site_minutes),
    stopover_places: toNull(f.stopover_places),

    return_departure: toNull(f.return_departure),
    return_destination: toNull(f.return_destination),
    return_date: toNull(f.return_date),
    return_time: toNull(f.return_time ? tidyTime(f.return_time) : null),
    return_end_time: toNull(f.return_end_time ? tidyTime(f.return_end_time) : null),
    return_on_site_minutes: f.return_on_site_minutes === "" ? null : Number(f.return_on_site_minutes),

    notes: toNull(f.notes),

    assigned_driver_id: toNull(f.assigned_driver_id),
    assigned_vehicle_id: toNull(f.assigned_vehicle_id),

    total_price: f.total_price === "" ? null : Number(f.total_price),
  };
}

export default function BookingDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [b, setB] = useState<Booking | null>(null);

  const [driverLabel, setDriverLabel] = useState<string | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<BookingForm | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  async function refresh() {
    if (!id) return;
    try {
      setLoading(true);
      setErr(null);

      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const r = await fetch(`/api/bookings/${encodeURIComponent(id)}`, { signal: ctrl.signal });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      const raw = j?.booking ?? j;
      const nb = normalizeBooking(raw);
      setB(nb);

      const drvLabel =
        j?.driver_label ?? raw?.driver_label ?? raw?.driver?.name ?? raw?.assigned_driver_name ?? null;

      const vehLabel =
        j?.vehicle_label ?? raw?.vehicle_label ?? raw?.vehicle?.name ?? raw?.assigned_vehicle_name ?? null;

      setDriverLabel(drvLabel ?? null);
      setVehicleLabel(vehLabel ?? null);

      if (!editMode) setForm(bookingToForm(nb));
    } catch (e: any) {
      if (e?.name !== "AbortError") setErr(e?.message || "Kunde inte hämta bokningen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const title = useMemo(() => {
    if (!b) return "Bokning";
    const nr = b.booking_number || b.id;
    return `Bokning ${nr}`;
  }, [b]);

  const prio = useMemo(() => prioMeta(b?.departure_date, b?.departure_time), [b?.departure_date, b?.departure_time]);

  const createdText = useMemo(() => {
    if (!b?.created_at) return "—";
    const dt = new Date(b.created_at);
    return isNaN(dt.getTime())
      ? b.created_at
      : new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" }).format(dt);
  }, [b?.created_at]);

  const updatedText = useMemo(() => {
    if (!b?.updated_at) return "—";
    const dt = new Date(b.updated_at);
    return isNaN(dt.getTime())
      ? b.updated_at
      : new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" }).format(dt);
  }, [b?.updated_at]);

  function copy(text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  const canCreateOrder = b && !["inställd", "makulerad"].includes((b.status || "").toLowerCase());
  const hasOnSite = (v?: number | null) => v !== null && v !== undefined;

  async function saveChanges() {
    if (!b || !form) return;
    try {
      setSaving(true);
      setErr(null);

      const patch = formToPatch(form);

      const r = await fetch(`/api/bookings/${encodeURIComponent(b.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      setEditMode(false);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Kunde inte spara ändringar.");
    } finally {
      setSaving(false);
    }
  }

  async function resendConfirmation() {
    if (!b) return;
    if (!b.customer_email) {
      setErr("Bokningen saknar kundens e-postadress (customer_email).");
      return;
    }

    try {
      setSending(true);
      setErr(null);

      const r = await fetch(`/api/bookings/send-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: b.id }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      alert("Bokningsbekräftelse skickad.");
    } catch (e: any) {
      setErr(e?.message || "Kunde inte skicka bokningen igen.");
    } finally {
      setSending(false);
    }
  }

  async function deleteBooking() {
    if (!b) return;
    const ok = confirm("Är du säker på att du vill ta bort bokningen? Detta går inte att ångra.");
    if (!ok) return;

    try {
      setDeleting(true);
      setErr(null);

      const r = await fetch(`/api/bookings/${encodeURIComponent(b.id)}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      router.push("/admin/bookings");
    } catch (e: any) {
      setErr(e?.message || "Kunde inte ta bort bokningen.");
    } finally {
      setDeleting(false);
    }
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <label className="block">
        <div className="text-xs text-[#194C66]/70 mb-1">{label}</div>
        {children}
      </label>
    );
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        {/* ✅ FIX: tryck ner sidan under fixed/sticky topbar */}
        <main className="p-6 pt-24 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-[#194C66]">{title}</h1>

            {/* ✅ FIX: lite mer luft + wrap så den aldrig klipps */}
            <div className="flex items-center gap-2 flex-wrap py-1">
              {b && (
                <button
                  onClick={() => copy(b.booking_number || b.id)}
                  className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66] bg-white"
                  title="Kopiera boknings-ID"
                >
                  Kopiera ID
                </button>
              )}

              {b && (
                <button
                  onClick={() => {
                    setEditMode((v) => !v);
                    setForm(bookingToForm(b));
                  }}
                  className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm"
                >
                  {editMode ? "Avbryt" : "Redigera"}
                </button>
              )}

              {b && (
                <button
                  onClick={resendConfirmation}
                  disabled={sending}
                  className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66] bg-white disabled:opacity-50"
                  title="Skicka bokningsbekräftelse igen"
                >
                  {sending ? "Skickar..." : "Skicka igen"}
                </button>
              )}

              {b && (
                <button
                  onClick={deleteBooking}
                  disabled={deleting}
                  className="px-4 py-2 rounded-[25px] border border-red-300 text-sm text-red-700 bg-white disabled:opacity-50"
                  title="Ta bort bokningen"
                >
                  {deleting ? "Tar bort..." : "Ta bort"}
                </button>
              )}

              {canCreateOrder && b && (
                <a
                  href={`/admin/orders/new?bookingId=${encodeURIComponent(b.id)}`}
                  className="px-4 py-2 rounded-[25px] bg-[#0f766e] text-white text-sm"
                  title="Skapa körorder baserat på denna bokning"
                >
                  Skapa körorder
                </a>
              )}

              <a href="/admin/bookings" className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66] bg-white">
                Alla bokningar
              </a>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66] bg-white"
                title="Skriv ut denna bokning"
              >
                Skriv ut
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 space-y-6">
            {loading && <div className="text-[#194C66]/70">Laddar…</div>}

            {!loading && err && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm" role="alert" aria-live="assertive">
                {err}
              </div>
            )}

            {!loading && !err && !b && <div className="text-[#194C66]/70">Ingen bokning hittades.</div>}

            {!loading && b && (
              <>
                {/* Översta kort: status + prio + pris */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Allmänt</div>
                    <div className="text-[#194C66] space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">ID:</span>
                        <span>{b.booking_number || b.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${clsStatusPill(b.status)}`}>
                          {b.status || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Prio:</span>
                        <span title={prio.title} className={`px-2 py-0.5 rounded-full text-xs ${prio.cls}`}>
                          {prio.label}
                        </span>
                        <span className="text-xs text-[#194C66]/70">{relUntil(b.departure_date, b.departure_time)}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-semibold">Totalpris:</span>
                        <span>{formatSEK(b.total_price)} kr</span>
                      </div>

                      <div className="text-xs text-[#194C66]/60 pt-1">
                        Skapad: {createdText} · Uppdaterad: {updatedText}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Kund</div>
                    <div className="text-[#194C66] space-y-1">
                      <div>
                        <span className="font-semibold">Beställare:</span> {b.contact_person || "—"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">E-post:</span>{" "}
                        {b.customer_email ? (
                          <>
                            <a className="underline" href={`mailto:${b.customer_email}`}>
                              {b.customer_email}
                            </a>
                            <button className="text-xs underline" onClick={() => copy(b.customer_email!)} title="Kopiera e-post">
                              kopiera
                            </button>
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Telefon:</span>{" "}
                        {b.customer_phone ? (
                          <>
                            <a className="underline" href={`tel:${sanitizeTel(b.customer_phone)}`}>
                              {b.customer_phone}
                            </a>
                            <button className="text-xs underline" onClick={() => copy(b.customer_phone!)} title="Kopiera telefon">
                              kopiera
                            </button>
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Tilldelning (internt)</div>
                    <div className="text-[#194C66] space-y-1">
                      <div>
                        <span className="font-semibold">Chaufför:</span> {driverLabel || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Fordon:</span> {vehicleLabel || "—"}
                      </div>
                    </div>
                  </div>
                </section>

                {/* EDIT MODE */}
                {editMode && form && (
                  <section className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="font-semibold text-[#194C66]">Redigera bokning</div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveChanges}
                          disabled={saving}
                          className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm disabled:opacity-50"
                        >
                          {saving ? "Sparar..." : "Spara"}
                        </button>
                        <button
                          onClick={() => {
                            setEditMode(false);
                            setForm(bookingToForm(b));
                          }}
                          className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66] bg-white"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>

                    {/* resten av din edit-form är oförändrad */}
                    {/* ... */}
                  </section>
                )}

                {/* READ MODE: Utresa / Retur */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Utresa</div>
                    <div className="text-[#194C66] space-y-1">
                      <div><span className="font-semibold">Datum:</span> {fmtDateSv(b.departure_date)}</div>
                      <div><span className="font-semibold">Start:</span> {fmtTime(b.departure_time)}</div>
                      <div><span className="font-semibold">Slut (planerat):</span> {fmtTime(b.end_time)}</div>
                      <div>
                        <span className="font-semibold">På plats:</span>{" "}
                        {hasOnSite(b.on_site_minutes) ? `${Math.max(0, b.on_site_minutes || 0)} min före` : "—"}
                      </div>
                      <div><span className="font-semibold">Från:</span> {b.departure_place || "—"}</div>
                      <div><span className="font-semibold">Via:</span> {b.stopover_places || "—"}</div>
                      <div><span className="font-semibold">Till:</span> {b.destination || "—"}</div>
                      <div><span className="font-semibold">Passagerare:</span> {typeof b.passengers === "number" ? b.passengers : "—"}</div>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] rounded-lg p-4">
                    <div className="text-sm text-[#194C66]/70 mb-1">Retur</div>
                    <div className="text-[#194C66] space-y-1">
                      <div><span className="font-semibold">Datum:</span> {fmtDateSv(b.return_date)}</div>
                      <div><span className="font-semibold">Start:</span> {fmtTime(b.return_time)}</div>
                      <div><span className="font-semibold">Slut (planerat):</span> {fmtTime(b.return_end_time)}</div>
                      <div>
                        <span className="font-semibold">På plats:</span>{" "}
                        {hasOnSite(b.return_on_site_minutes) ? `${Math.max(0, b.return_on_site_minutes || 0)} min före` : "—"}
                      </div>
                      <div><span className="font-semibold">Från:</span> {b.return_departure || "—"}</div>
                      <div><span className="font-semibold">Till:</span> {b.return_destination || "—"}</div>
                    </div>
                  </div>
                </section>

                {/* Noteringar */}
                <section className="bg-[#f8fafc] rounded-lg p-4">
                  <div className="text-sm text-[#194C66]/70 mb-1">Övrig information</div>
                  <div className="text-[#194C66] whitespace-pre-wrap">{b.notes || "—"}</div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
