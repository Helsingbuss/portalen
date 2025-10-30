// src/pages/admin/bookings/new.tsx
import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Leg = {
  date: string;         // YYYY-MM-DD
  start: string;        // HH:MM
  end?: string;         // HH:MM (planerat slut)
  onSite?: number | null; // minuter före start då bussen är på plats
  from: string;
  to: string;
  via: string;
  pax?: number | null;
  onboardContact?: string;
  notes?: string;
};

type Step = 1 | 2;

type Opt = { id: string; label: string };

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function NewBookingAdmin() {
  const [step, setStep] = useState<Step>(1);

  // Visuell placeholder – verkligt nummer skapas i API:t (BK{YY}{NNNN})
  const nextUiId = useMemo(() => `BK25${"00XX"}`, []);

  // --- STEG 1: Körningar (max 2 rader = Tur & retur) ---
  const [draft, setDraft] = useState<Leg>({
    date: todayISO(),
    start: "08:00",
    end: "",
    onSite: 15,
    from: "",
    to: "",
    via: "",
    pax: undefined,
    onboardContact: "",
    notes: "",
  });

  const [legs, setLegs] = useState<Leg[]>([]);
  const roundTrip = legs.length >= 2;

  const addLeg = () => {
    if (!draft.from || !draft.to || !draft.date || !draft.start) return;
    if (legs.length >= 2) {
      alert("Max två rader (tur & retur). Ta bort en rad om du vill lägga till en ny.");
      return;
    }
    setLegs((prev) => [...prev, draft]);
    setDraft({
      date: todayISO(),
      start: "08:00",
      end: "",
      onSite: draft.onSite ?? 15,
      from: "",
      to: "",
      via: "",
      pax: draft.pax,
      onboardContact: draft.onboardContact,
      notes: "",
    });
  };

  const removeLeg = (idx: number) => setLegs((prev) => prev.filter((_, i) => i !== idx));
  const flipDraft = () => setDraft((d) => ({ ...d, from: d.to, to: d.from }));

  const createReturnFromFirst = () => {
    if (legs.length !== 1) return;
    const a = legs[0];
    const ret: Leg = {
      date: a.date,
      start: a.start,
      end: a.end,
      onSite: a.onSite ?? 15,
      from: a.to,
      to: a.from,
      via: "",
      pax: a.pax,
      onboardContact: a.onboardContact,
      notes: "",
    };
    setLegs((prev) => [...prev, ret]);
  };

  const flipRow = (i: number) =>
    setLegs((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, from: l.to, to: l.from } : l))
    );

  // --- STEG 2: Kund + interna tilldelningar ---
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [freeNotes, setFreeNotes] = useState("");

  // Interna dropdowns
  const [vehicles, setVehicles] = useState<Opt[]>([]);
  const [drivers, setDrivers] = useState<Opt[]>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");

  useEffect(() => {
    // Hämta fordon & chaufförer (enkla list-API:er)
    (async () => {
      try {
        const v = await fetch("/api/vehicles/list").then((r) => r.json()).catch(() => ({ rows: [] }));
        const d = await fetch("/api/drivers/list").then((r) => r.json()).catch(() => ({ rows: [] }));
        setVehicles((v?.rows ?? []).map((x: any) => ({ id: String(x.id), label: x.label })));
        setDrivers((d?.rows ?? []).map((x: any) => ({ id: String(x.id), label: x.label })));
      } catch {
        // tyst
      }
    })();
  }, []);

  // Validering
  const canGoNext = legs.length >= 1 && !!(legs[0].pax ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitError(null);
    if (!contact.trim() || !email.trim() || !phone.trim()) {
      setSubmitError("Fyll i Beställare, E-post och Telefon.");
      return;
    }
    setSubmitting(true);

    const a = legs[0];
    const b = legs[1];

    const payload = {
      // kund
      contact_person: contact.trim(),
      customer_email: email.trim(),
      customer_phone: phone.trim(),

      // utresa
      passengers: Number(a?.pax ?? 0),
      departure_place: a?.from || null,
      destination: a?.to || null,
      departure_date: a?.date || null,
      departure_time: a?.start || null,
      end_time: a?.end || null,
      on_site_minutes: a?.onSite ?? null,
      stopover_places: a?.via || null,

      // retur (om finns)
      return_departure: b ? b.from : null,
      return_destination: b ? b.to : null,
      return_date: b ? b.date : null,
      return_time: b ? b.start : null,
      return_end_time: b ? b.end : null,
      return_on_site_minutes: b ? b.onSite ?? null : null,

      // interna tilldelningar
      assigned_vehicle_id: vehicleId || null,
      assigned_driver_id: driverId || null,

      // övrigt
      notes: freeNotes || a?.notes || null,
    };

    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        setSubmitError(j?.error || "Kunde inte skapa bokning.");
        setSubmitting(false);
        return;
      }
      const j = await res.json();
      // Gå till administrativ detaljsida (kan bygga senare)
      window.location.href = `/admin/bookings/${j.booking.id}`;
    } catch (e: any) {
      setSubmitError(e?.message || "Nätverksfel.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">
              Skapa bokning{" "}
              <span className="text-[#194C66]/60 font-normal">ID ({nextUiId})</span>
            </h1>
            {roundTrip && (
              <span className="px-3 py-1 rounded-full bg-[#e5eef3] text-[#194C66] text-sm">
                Tur & retur
              </span>
            )}
          </div>

          {/* Stegindikator */}
          <div className="flex gap-2 text-sm">
            <div className={`px-3 py-1 rounded-full ${step === 1 ? "bg-[#194C66] text-white" : "bg-white border text-[#194C66]"}`}>
              Steg 1: Körningar
            </div>
            <div className={`px-3 py-1 rounded-full ${step === 2 ? "bg-[#194C66] text-white" : "bg-white border text-[#194C66]"}`}>
              Steg 2: Kund & tilldelning
            </div>
          </div>

          {/* STEG 1 */}
          {step === 1 && (
            <div className="bg-white rounded-xl shadow p-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vänster */}
                <div className="space-y-4">
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Datum *</span>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Starttid *</span>
                    <input
                      type="time"
                      value={draft.start}
                      onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Sluttid (planerad)</span>
                    <input
                      type="time"
                      value={draft.end || ""}
                      onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Bussen på plats (min före start)</span>
                    <input
                      type="number"
                      min={0}
                      value={draft.onSite ?? 0}
                      onChange={(e) => setDraft({ ...draft, onSite: Number(e.target.value) || 0 })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </label>
                </div>

                {/* Mitten */}
                <div className="space-y-4">
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Från *</span>
                    <input
                      type="text"
                      value={draft.from}
                      onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Ange en plats"
                    />
                  </label>
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Via</span>
                    <input
                      type="text"
                      value={draft.via}
                      onChange={(e) => setDraft({ ...draft, via: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Ex. hållplatser / stopp"
                    />
                  </label>
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Antal passagerare *</span>
                    <input
                      type="number"
                      min={1}
                      value={draft.pax ?? ""}
                      onChange={(e) => setDraft({ ...draft, pax: Number(e.target.value) || 0 })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </label>
                </div>

                {/* Höger */}
                <div className="space-y-4">
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Till *</span>
                    <input
                      type="text"
                      value={draft.to}
                      onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Ange en plats"
                    />
                  </label>
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Kontaktperson ombord (namn/nummer)</span>
                    <input
                      type="text"
                      value={draft.onboardContact}
                      onChange={(e) => setDraft({ ...draft, onboardContact: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </label>
                </div>
              </div>

              <label className="block text-sm text-[#194C66]/80">
                <span className="mb-1 block">Övrig information</span>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full border rounded px-2 py-2 min-h-[90px]"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button onClick={addLeg} className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm">
                  + Lägg till rad
                </button>
                <button
                  type="button"
                  onClick={flipDraft}
                  className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                >
                  Vänd på körning
                </button>
                {legs.length === 1 && (
                  <button
                    type="button"
                    onClick={createReturnFromFirst}
                    className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                  >
                    Skapa retur (vänd sträcka 1)
                  </button>
                )}
              </div>

              {/* Tabell */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#e5eef3] text-[#194C66]">
                    <tr>
                      <th className="text-left px-3 py-2">Datum</th>
                      <th className="text-left px-3 py-2">Start</th>
                      <th className="text-left px-3 py-2">Slut</th>
                      <th className="text-left px-3 py-2">Plats på</th>
                      <th className="text-left px-3 py-2">Från</th>
                      <th className="text-left px-3 py-2">Via</th>
                      <th className="text-left px-3 py-2">Till</th>
                      <th className="text-left px-3 py-2">Passagerare</th>
                      <th className="text-left px-3 py-2">Kontakt</th>
                      <th className="text-right px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {legs.map((l, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-3 py-2">{l.date}</td>
                        <td className="px-3 py-2">{l.start}</td>
                        <td className="px-3 py-2">{l.end || "—"}</td>
                        <td className="px-3 py-2">{l.onSite ? `${l.onSite} min före` : "—"}</td>
                        <td className="px-3 py-2">{l.from}</td>
                        <td className="px-3 py-2">{l.via}</td>
                        <td className="px-3 py-2">{l.to}</td>
                        <td className="px-3 py-2">{l.pax ?? "—"}</td>
                        <td className="px-3 py-2">{l.onboardContact || "—"}</td>
                        <td className="px-3 py-2 text-right space-x-3">
                          <button onClick={() => flipRow(i)} className="text-[#194C66] underline">Vänd</button>
                          <button onClick={() => removeLeg(i)} className="text-[#194C66] underline">Ta bort</button>
                        </td>
                      </tr>
                    ))}
                    {legs.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-[#194C66]/60" colSpan={10}>
                          Inga körningar tillagda ännu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  disabled={!canGoNext}
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm disabled:opacity-50"
                >
                  Gå vidare
                </button>
              </div>
            </div>
          )}

          {/* STEG 2 */}
          {step === 2 && (
            <div className="bg-white rounded-xl shadow p-4 space-y-6">
              {submitError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kund */}
                <div className="space-y-4">
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Beställare *</span>
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">E-post *</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Telefon *</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </label>
                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Övrig information</span>
                    <textarea
                      value={freeNotes}
                      onChange={(e) => setFreeNotes(e.target.value)}
                      className="w-full border rounded px-2 py-2 min-h-[120px]"
                    />
                  </label>
                </div>

                {/* Intern tilldelning (ej för kund) */}
                <div className="space-y-4">
                  <div className="text-[#194C66] font-semibold">Tilldelning (internt)</div>

                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Fordon</span>
                    <select
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    >
                      <option value="">— Välj fordon —</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Chaufför</span>
                    <select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    >
                      <option value="">— Välj chaufför —</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="text-xs text-[#194C66]/60">
                    Dessa fält sparas bara i admin och visas inte för kund.
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                >
                  Gå tillbaka
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm disabled:opacity-50"
                >
                  {submitting ? "Skapar…" : "Skapa bokning"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
