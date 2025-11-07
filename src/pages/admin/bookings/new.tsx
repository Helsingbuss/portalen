import { useEffect, useMemo, useRef, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Leg = {
  date: string;         // YYYY-MM-DD
  start: string;        // HH:MM
  end?: string;         // HH:MM (planerat slut)
  onSite?: number | null; // minuter fÃ¶re start dÃ¥ bussen Ã¤r pÃ¥ plats
  from: string;
  to: string;
  via: string;
  pax?: number | null;
  onboardContact?: string;
  notes?: string;
};

type Step = 1 | 2;

type Opt = { id: string; label: string };

// ---- Offert-koppling (options frÃ¥n /api/offers/options)
type OfferOpt = {
  id: string;
  label: string;
  autofill: {
    contact_person?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    passengers?: number | null;
    notes?: string | null;

    out_from?: string | null;
    out_to?: string | null;
    out_date?: string | null;
    out_time?: string | null;

    ret_from?: string | null;
    ret_to?: string | null;
    ret_date?: string | null;
    ret_time?: string | null;
  };
};

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function NewBookingAdmin() {
  const [step, setStep] = useState<Step>(1);

  // Visuell placeholder â€“ verkligt nummer skapas i API:t (BK{YY}{NNNN})
  const nextUiId = useMemo(() => `BK25${"00XX"}`, []);

  // --- STEG 1: KÃ¶rningar (max 2 rader = Tur & retur) ---
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
      alert("Max tvÃ¥ rader (tur & retur). Ta bort en rad om du vill lÃ¤gga till en ny.");
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

  // --- NYTT: Koppla offert (sÃ¶k & autofyll) ---
  const [offerSearch, setOfferSearch] = useState("");
  const [offerOpts, setOfferOpts] = useState<OfferOpt[]>([]);
  const [offerLoading, setOfferLoading] = useState(false);
  const [linkedOfferId, setLinkedOfferId] = useState<string | null>(null);
  const offersAbortRef = useRef<AbortController | null>(null);

  function normaliseTimeHHMM(v: string | null | undefined) {
    if (!v) return v;
    return typeof v === "string" && v.length >= 5 ? v.slice(0, 5) : v;
  }

  function applyOffer(opt: OfferOpt) {
    const a = opt.autofill;

    setContact(a.contact_person ?? "");
    setEmail(a.contact_email ?? "");
    setPhone(a.contact_phone ?? "");
    setFreeNotes(a.notes ?? "");

    const first: Leg = {
      date: a.out_date || todayISO(),
      start: normaliseTimeHHMM(a.out_time) || "08:00",
      end: "",
      onSite: 15,
      from: a.out_from || "",
      to: a.out_to || "",
      via: "",
      pax: a.passengers ?? undefined,
      onboardContact: "",
      notes: a.notes || "",
    };

    const arr: Leg[] = [first];

    if (a.ret_from || a.ret_to || a.ret_date || a.ret_time) {
      arr.push({
        date: a.ret_date || a.out_date || todayISO(),
        start: normaliseTimeHHMM(a.ret_time) || normaliseTimeHHMM(a.out_time) || "08:00",
        end: "",
        onSite: 15,
        from: a.ret_from || a.out_to || "",
        to: a.ret_to || a.out_from || "",
        via: "",
        pax: a.passengers ?? first.pax,
        onboardContact: "",
        notes: a.notes || "",
      });
    }

    setLegs(arr);
    setDraft({
      date: todayISO(),
      start: "08:00",
      end: "",
      onSite: 15,
      from: "",
      to: "",
      via: "",
      pax: a.passengers ?? undefined,
      onboardContact: "",
      notes: "",
    });

    setOfferSearch("");
    setOfferOpts([]);
    setLinkedOfferId(opt.id);
  }

  async function searchOffers(q: string) {
    setOfferSearch(q);

    try {
      setOfferLoading(true);
      if (offersAbortRef.current) offersAbortRef.current.abort();
      const ctrl = new AbortController();
      offersAbortRef.current = ctrl;

      // baseline nÃ¤r tomt â€“ senaste 20
      const url = q && q.length >= 1
        ? `/api/offers/options?search=${encodeURIComponent(q)}`
        : `/api/offers/options`;

      const r = await fetch(url, { signal: ctrl.signal });
      const j = await r.json();
      setOfferOpts(j?.options ?? []);
    } catch {
      setOfferOpts([]);
    } finally {
      setOfferLoading(false);
    }
  }

  useEffect(() => {
    // HÃ¤mta fordon & chauffÃ¶rer (enkla list-API:er)
    (async () => {
      try {
        const v = await fetch("/api/vehicles/options").then((r) => r.json()).catch(() => ({ options: [] }));
        const d = await fetch("/api/drivers/options").then((r) => r.json()).catch(() => ({ options: [] }));
        setVehicles(v?.options ?? []);
        setDrivers(d?.options ?? []);
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
      setSubmitError("Fyll i BestÃ¤llare, E-post och Telefon.");
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

      // kopplad offert (frivilligt pÃ¥ backend)
      source_offer_id: linkedOfferId || null,

      // Ã¶vrigt
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
      // GÃ¥ till administrativ detaljsida (kan bygga senare)
      window.location.href = `/admin/bookings/${j.booking.id}`;
    } catch (e: any) {
      setSubmitError(e?.message || "NÃ¤tverksfel.");
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
              Steg 1: KÃ¶rningar
            </div>
            <div className={`px-3 py-1 rounded-full ${step === 2 ? "bg-[#194C66] text-white" : "bg-white border text-[#194C66]"}`}>
              Steg 2: Kund & tilldelning
            </div>
          </div>

          {/* STEG 1 */}
          {step === 1 && (
            <div className="bg-white rounded-xl shadow p-4 space-y-4">

              {/* --- NYTT BLOCK: KOPPLA OFFERT --- */}
              <div className="bg-[#f8fafc] rounded-lg p-4">
                <div className="text-sm text-[#194C66]/70 mb-2">Koppla offert (valfritt)</div>
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="SÃ¶k offert (nummer, kund, frÃ¥n/till)â€¦"
                  value={offerSearch}
                  onChange={(e) => searchOffers(e.target.value)}
                  onFocus={() => {
                    if (offerOpts.length === 0) searchOffers(offerSearch);
                  }}
                />

                {offerLoading && (
                  <div className="mt-2 text-sm text-[#194C66]/60">SÃ¶kerâ€¦</div>
                )}

                {!offerLoading && offerOpts.length > 0 && (
                  <div className="mt-2 border rounded-lg bg-white max-h-64 overflow-auto">
                    {offerOpts.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => applyOffer(o)}
                        className="block w-full text-left px-3 py-2 hover:bg-[#f5f4f0]"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}

                {!offerLoading && offerSearch && offerOpts.length === 0 && (
                  <div className="mt-2 text-sm text-[#194C66]/60">Inga trÃ¤ffar.</div>
                )}

                {linkedOfferId && (
                  <div className="text-xs text-[#194C66]/70 mt-2">
                    Kopplad offert: <b>{linkedOfferId}</b>
                    <button
                      className="ml-2 underline"
                      onClick={() => setLinkedOfferId(null)}
                    >
                      koppla bort
                    </button>
                  </div>
                )}
              </div>
              {/* --- SLUT: KOPPLA OFFERT --- */}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* VÃ¤nster */}
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
                    <span className="mb-1 block">Bussen pÃ¥ plats (min fÃ¶re start)</span>
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
                    <span className="mb-1 block">FrÃ¥n *</span>
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
                      placeholder="Ex. hÃ¥llplatser / stopp"
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

                {/* HÃ¶ger */}
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
                <span className="mb-1 block">Ã–vrig information</span>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full border rounded px-2 py-2 min-h-[90px]"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button onClick={addLeg} className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm">
                  + LÃ¤gg till rad
                </button>
                <button
                  type="button"
                  onClick={flipDraft}
                  className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                >
                  VÃ¤nd pÃ¥ kÃ¶rning
                </button>
                {legs.length === 1 && (
                  <button
                    type="button"
                    onClick={createReturnFromFirst}
                    className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                  >
                    Skapa retur (vÃ¤nd strÃ¤cka 1)
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
                      <th className="text-left px-3 py-2">Plats pÃ¥</th>
                      <th className="text-left px-3 py-2">FrÃ¥n</th>
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
                        <td className="px-3 py-2">{l.end || "â€”"}</td>
                        <td className="px-3 py-2">{l.onSite ? `${l.onSite} min fÃ¶re` : "â€”"}</td>
                        <td className="px-3 py-2">{l.from}</td>
                        <td className="px-3 py-2">{l.via}</td>
                        <td className="px-3 py-2">{l.to}</td>
                        <td className="px-3 py-2">{l.pax ?? "â€”"}</td>
                        <td className="px-3 py-2">{l.onboardContact || "â€”"}</td>
                        <td className="px-3 py-2 text-right space-x-3">
                          <button onClick={() => flipRow(i)} className="text-[#194C66] underline">VÃ¤nd</button>
                          <button onClick={() => removeLeg(i)} className="text-[#194C66] underline">Ta bort</button>
                        </td>
                      </tr>
                    ))}
                    {legs.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-[#194C66]/60" colSpan={10}>
                          Inga kÃ¶rningar tillagda Ã¤nnu.
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
                  GÃ¥ vidare
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
                    <span className="mb-1 block">BestÃ¤llare *</span>
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
                    <span className="mb-1 block">Ã–vrig information</span>
                    <textarea
                      value={freeNotes}
                      onChange={(e) => setFreeNotes(e.target.value)}
                      className="w-full border rounded px-2 py-2 min-h-[120px]"
                    />
                  </label>
                </div>

                {/* Intern tilldelning (ej fÃ¶r kund) */}
                <div className="space-y-4">
                  <div className="text-[#194C66] font-semibold">Tilldelning (internt)</div>

                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Fordon</span>
                    <select
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    >
                      <option value="">â€” VÃ¤lj fordon â€”</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">ChauffÃ¶r</span>
                    <select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    >
                      <option value="">â€” VÃ¤lj chauffÃ¶r â€”</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="text-xs text-[#194C66]/60">
                    Dessa fÃ¤lt sparas bara i admin och visas inte fÃ¶r kund.
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                >
                  GÃ¥ tillbaka
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm disabled:opacity-50"
                >
                  {submitting ? "Skaparâ€¦" : "Skapa bokning"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

