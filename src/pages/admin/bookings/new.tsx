// src/pages/admin/bookings/new.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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

// ---- Offert-koppling (options från /api/offers/options)
type OfferOpt = {
  id: string;
  label: string;
  autofill: {
    // kund
    contact_person?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    passengers?: number | null;
    notes?: string | null;

    // utresa/retur (standard)
    out_from?: string | null;
    out_to?: string | null;
    out_date?: string | null;
    out_time?: string | null;

    ret_from?: string | null;
    ret_to?: string | null;
    ret_date?: string | null;
    ret_time?: string | null;

    // NYTT (enligt din lista – landar som metainfo i notes)
    via?: string | null;
    stop?: string | null;
    enkel_tur_retur?: string | null;
    final_destination?: string | null;

    behover_buss?: boolean | null;
    notis_pa_plats?: string | null;
    basplats_pa_destination?: string | null;

    last_day_?: string | null;
    end_time?: string | null; // utresa planerad sluttid
    local_kor?: string | null;
    standby?: number | null;
    parkering?: string | null;

    namn_efternamn?: string | null;
    foretag_forening?: string | null;
    referens_po_nummer?: string | null;
    org_number?: string | null;
    contact_person_ombord?: string | null;

    return_end_time?: string | null;
    return_on_site_minutes?: number | null;
  };
};

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const svValidation = {
  required: "Detta fält är obligatoriskt",
  email: "Ange en giltig e-postadress",
  phone: "Ange ett giltigt telefonnummer (t.ex. +46 70 123 45 67)",
  paxMin1: "Ange minst 1 passagerare",
  onSiteMin0: "Ange 0 eller fler minuter",
  timeInvalid: "Ange tid i format HH:MM (t.ex. 08:00)",
  maxTwoLegs: "Max två rader (tur & retur). Ta bort en rad om du vill lägga till en ny.",
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Tillåt siffror, +, mellanslag och bindestreck; städas till E.164-liknande i submit
const phoneDisplayRe = /^[+0-9\s-]{6,20}$/;

// Tål "0800" -> "08:00", "8:0" -> "08:00", "08:00" -> "08:00"
function tidyTime(v?: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.includes(":")) {
    const [hh, mm = "00"] = s.split(":");
    const HH = String(hh || "00").padStart(2, "0").slice(0, 2);
    const MM = String(mm || "00").padStart(2, "0").slice(0, 2);
    if (isNaN(Number(HH)) || isNaN(Number(MM))) return null;
    return `${HH}:${MM}`;
  }
  if (/^\d{3,4}$/.test(s)) {
    const HH = s.length === 3 ? `0${s[0]}` : s.slice(0, 2);
    const MM = s.slice(-2);
    if (isNaN(Number(HH)) || isNaN(Number(MM))) return null;
    return `${HH}:${MM}`;
  }
  return null;
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

  // Fältfel för draft
  const [legErrors, setLegErrors] = useState<Partial<Record<keyof Leg, string>>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  function validateDraft(): boolean {
    const errs: Partial<Record<keyof Leg, string>> = {};
    if (!draft.date) errs.date = svValidation.required;

    const normStart = tidyTime(draft.start);
    if (!normStart) errs.start = svValidation.timeInvalid;

    if (draft.end) {
      const normEnd = tidyTime(draft.end);
      if (!normEnd) errs.end = svValidation.timeInvalid;
    }

    if (!draft.from.trim()) errs.from = svValidation.required;
    if (!draft.to.trim()) errs.to = svValidation.required;

    const pax = Number(draft.pax ?? 0);
    if (!pax || pax < 1) errs.pax = svValidation.paxMin1;

    const onSite = Number(draft.onSite ?? 0);
    if (onSite < 0) errs.onSite = svValidation.onSiteMin0;

    setLegErrors(errs);
    const ok = Object.keys(errs).length === 0;
    if (!ok) {
      setBannerError("Kontrollera fälten markerade med fel.");
      setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
    return ok;
  }

  const addLeg = () => {
    setBannerError(null);
    if (!validateDraft()) return;
    if (legs.length >= 2) {
      setBannerError(svValidation.maxTwoLegs);
      setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    // normalisera tider i raden som läggs till
    const normStart = tidyTime(draft.start) || draft.start;
    const normEnd = tidyTime(draft.end || "") || draft.end || "";
    setLegs((prev) => [...prev, { ...draft, start: normStart, end: normEnd }]);
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
    setLegErrors({});
  };

  const removeLeg = (idx: number) => {
    setBannerError(null);
    setLegs((prev) => prev.filter((_, i) => i !== idx));
  };

  const flipDraft = () => setDraft((d) => ({ ...d, from: d.to, to: d.from }));

  const createReturnFromFirst = () => {
    setBannerError(null);
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

  // validering steg 2
  const [step2Errors, setStep2Errors] = useState<Partial<Record<"contact"|"email"|"phone", string>>>({});

  function validateStep2(): boolean {
    const e: Partial<Record<"contact"|"email"|"phone", string>> = {};
    if (!contact.trim()) e.contact = svValidation.required;
    if (!email.trim() || !emailRe.test(email.trim())) e.email = svValidation.email;
    if (!phone.trim() || !phoneDisplayRe.test(phone.trim())) e.phone = svValidation.phone;
    setStep2Errors(e);
    if (Object.keys(e).length) {
      setBannerError("Kontrollera kunduppgifterna.");
      setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return false;
    }
    return true;
  }

  // Interna dropdowns
  const [vehicles, setVehicles] = useState<Opt[]>([]);
  const [drivers, setDrivers] = useState<Opt[]>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");

  // --- Offert: sök & autofyll ---
  const [offerSearch, setOfferSearch] = useState("");
  const [offerOpts, setOfferOpts] = useState<OfferOpt[]>([]);
  const [offerLoading, setOfferLoading] = useState(false);
  const [linkedOfferId, setLinkedOfferId] = useState<string | null>(null);
  const offersAbortRef = useRef<AbortController | null>(null);
  const offerDebounceRef = useRef<number | null>(null);

  function normaliseTimeHHMM(v: string | null | undefined) {
    if (!v) return v || undefined;
    return typeof v === "string" && v.length >= 5 ? v.slice(0, 5) : v;
  }

  function buildMetaNote(a: OfferOpt["autofill"]) {
    const rows: string[] = [];

    if (a.enkel_tur_retur) rows.push(`Typ av resa: ${a.enkel_tur_retur}`);
    if (a.behover_buss !== null && a.behover_buss !== undefined) rows.push(`Behöver buss på plats: ${a.behover_buss ? "Ja" : "Nej"}`);
    if (a.notis_pa_plats) rows.push(`Vad ska bussen göra på plats: ${a.notis_pa_plats}`);
    if (a.basplats_pa_destination) rows.push(`Basplats på destination: ${a.basplats_pa_destination}`);
    if (a.last_day_) rows.push(`Sista dagen (på plats): ${a.last_day_}`);
    if (a.local_kor) rows.push(`Lokala körningar: ${a.local_kor}`);
    if (typeof a.standby === "number") rows.push(`Väntetid/standby (timmar): ${a.standby}`);
    if (a.parkering) rows.push(`Parkering & tillstånd: ${a.parkering}`);
    if (a.contact_person_ombord) rows.push(`Kontaktperson ombord: ${a.contact_person_ombord}`);

    if (a.foretag_forening) rows.push(`Företag/Förening: ${a.foretag_forening}`);
    if (a.referens_po_nummer) rows.push(`Referens/PO-nummer: ${a.referens_po_nummer}`);
    if (a.org_number) rows.push(`Organisationsnummer: ${a.org_number}`);

    if (rows.length === 0) return "";
    return `\n\n— Offertdata —\n${rows.join("\n")}`;
  }

  function applyOffer(opt: OfferOpt) {
    const a = opt.autofill;

    setContact(a.contact_person ?? "");
    setEmail(a.contact_email ?? "");
    setPhone(a.contact_phone ?? "");

    // Offertens fria "notes" + en kompakt metasektion för nya fält
    const metaNote = buildMetaNote(a);
    setFreeNotes((a.notes ?? "") + metaNote);

    const first: Leg = {
      date: a.out_date || todayISO(),
      start: normaliseTimeHHMM(a.out_time) || "08:00",
      end: normaliseTimeHHMM(a.end_time) || "",
      onSite: 15, // **ändrat**: håll säker default för utresan
      from: a.out_from || "",
      to: a.out_to || a.final_destination || "",
      via: a.via || "",
      pax: a.passengers ?? undefined,
      onboardContact: a.contact_person_ombord || "",
      notes: a.notes || "",
    };

    const arr: Leg[] = [first];

    // Retur (fyll även returens sluttid och on-site om vi fått det)
    if (a.ret_from || a.ret_to || a.ret_date || a.ret_time) {
      arr.push({
        date: a.ret_date || a.out_date || todayISO(),
        start: normaliseTimeHHMM(a.ret_time) || normaliseTimeHHMM(a.out_time) || "08:00",
        end: normaliseTimeHHMM(a.return_end_time) || "",
        onSite: typeof a.return_on_site_minutes === "number" ? Math.max(0, a.return_on_site_minutes || 0) : 15,
        from: a.ret_from || a.out_to || "",
        to: a.ret_to || a.out_from || "",
        via: "",
        pax: a.passengers ?? first.pax,
        onboardContact: a.contact_person_ombord || "",
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
    setBannerError(null);
  }

  async function doSearchOffers(q: string, signal: AbortSignal) {
    const url = q && q.length >= 1
      ? `/api/offers/options?search=${encodeURIComponent(q)}`
      : `/api/offers/options`; // baseline – senaste 20
    const r = await fetch(url, { signal });
    const j = await r.json().catch(() => ({}));
    setOfferOpts(j?.options ?? []);
  }

  function searchOffers(q: string) {
    setOfferSearch(q);
    setOfferLoading(true);

    if (offerDebounceRef.current) window.clearTimeout(offerDebounceRef.current);
    offerDebounceRef.current = window.setTimeout(async () => {
      if (offersAbortRef.current) offersAbortRef.current.abort();
      const ctrl = new AbortController();
      offersAbortRef.current = ctrl;
      try {
        await doSearchOffers(q, ctrl.signal);
      } catch {
        setOfferOpts([]);
      } finally {
        setOfferLoading(false);
      }
    }, 250);
  }

  useEffect(() => {
    // Hämta fordon & chaufförer (enkla list-API:er)
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

    // Städning av timers/aborts på unmount
    return () => {
      if (offerDebounceRef.current) window.clearTimeout(offerDebounceRef.current);
      if (offersAbortRef.current) offersAbortRef.current.abort();
    };
  }, []);

  // Validering för att byta till steg 2
  const canGoNext = legs.length >= 1 && !!(legs[0].pax ?? 0);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function cleanPhone(p: string) {
    // Ta bort mellanslag och bindestreck
    return p.replace(/[\s-]+/g, "");
  }

  async function handleSubmit() {
    if (submitting) return; // skydda mot dubbelklick
    setSubmitError(null);

    if (!validateStep2()) return;
    if (legs.length < 1) {
      setBannerError("Lägg till minst en körning i steg 1.");
      setStep(1);
      setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }

    setSubmitting(true);

    const a = legs[0];
    const b = legs[1];

    // Normalisera tider i payloaden
    const dep_time = tidyTime(a?.start || "") || a?.start || null;
    const dep_end  = tidyTime(a?.end || "") || a?.end || null;
    const ret_time = b ? (tidyTime(b.start || "") || b.start || null) : null;
    const ret_end  = b ? (tidyTime(b.end || "") || b.end || null) : null;

    if (!dep_time) {
      setSubmitting(false);
      setBannerError("Starttid i utresan är ogiltig.");
      setStep(1);
      setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    if (a?.end && !dep_end) {
      setSubmitting(false);
      setBannerError("Sluttid i utresan är ogiltig.");
      setStep(1);
      setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    if (b?.start && !ret_time) {
      setSubmitting(false);
      setBannerError("Starttid i returen är ogiltig.");
      setStep(1);
      setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    if (b?.end && !ret_end) {
      setSubmitting(false);
      setBannerError("Sluttid i returen är ogiltig.");
      setStep(1);
      setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }

    const payload = {
      // kund
      contact_person: contact.trim(),
      customer_email: email.trim(),
      customer_phone: cleanPhone(phone.trim()),

      // utresa
      passengers: Number(a?.pax ?? 0),
      departure_place: a?.from || null,
      destination: a?.to || null,
      departure_date: a?.date || null,
      departure_time: dep_time,
      end_time: dep_end,
      on_site_minutes: typeof a?.onSite === "number" ? Math.max(0, a.onSite) : null,
      stopover_places: a?.via || null,

      // retur (om finns)
      return_departure: b ? b.from : null,
      return_destination: b ? b.to : null,
      return_date: b ? b.date : null,
      return_time: ret_time,
      return_end_time: ret_end,
      return_on_site_minutes: b ? (typeof b.onSite === "number" ? Math.max(0, b.onSite) : null) : null,

      // interna tilldelningar
      assigned_vehicle_id: vehicleId || null,
      assigned_driver_id: driverId || null,

      // kopplad offert (frivilligt på backend)
      source_offer_id: linkedOfferId || null,

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
        setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
        return;
      }
      const j = await res.json();
      window.location.href = `/admin/bookings/${j.booking.id}`;
    } catch (e: any) {
      setSubmitError(e?.message || "Nätverksfel.");
      setSubmitting(false);
      setTimeout(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
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

              {/* Felbanner Steg 1 */}
              {(bannerError || submitError) && (
                <div ref={bannerRef} className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm" role="alert" aria-live="assertive">
                  {bannerError || submitError}
                </div>
              )}

              {/* --- KOPPLA OFFERT --- */}
              <div className="bg-[#f8fafc] rounded-lg p-4">
                <div className="text-sm text-[#194C66]/70 mb-2">Koppla offert (valfritt)</div>
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Sök offert (nummer, kund, från/till)…"
                  value={offerSearch}
                  onChange={(e) => searchOffers(e.target.value)}
                  onFocus={() => {
                    if (offerOpts.length === 0) searchOffers(offerSearch);
                  }}
                  aria-label="Sök offert att koppla"
                />

                {offerLoading && (
                  <div className="mt-2 text-sm text-[#194C66]/60">Söker…</div>
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
                  <div className="mt-2 text-sm text-[#194C66]/60">Inga träffar.</div>
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
                {/* Vänster */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Datum *</label>
                    <input
                      type="date"
                      min={todayISO()}
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                      aria-invalid={!!legErrors.date}
                    />
                    {legErrors.date && <p className="text-xs text-red-600 mt-1">{legErrors.date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Starttid *</label>
                    <input
                      type="time"
                      value={draft.start}
                      onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addLeg()}
                      className="w-full border rounded px-2 py-1"
                      aria-invalid={!!legErrors.start}
                    />
                    {legErrors.start && <p className="text-xs text-red-600 mt-1">{legErrors.start}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Sluttid (planerad)</label>
                    <input
                      type="time"
                      value={draft.end || ""}
                      onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    />
                    {legErrors.end && <p className="text-xs text-red-600 mt-1">{legErrors.end}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Bussen på plats (min före start)</label>
                    <input
                      type="number"
                      min={0}
                      value={draft.onSite ?? 0}
                      onChange={(e) => setDraft({ ...draft, onSite: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full border rounded px-2 py-1"
                      aria-invalid={!!legErrors.onSite}
                    />
                    {legErrors.onSite && <p className="text-xs text-red-600 mt-1">{legErrors.onSite}</p>}
                  </div>
                </div>

                {/* Mitten */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Från *</label>
                    <input
                      type="text"
                      value={draft.from}
                      onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addLeg()}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Ange en plats"
                      aria-invalid={!!legErrors.from}
                    />
                    {legErrors.from && <p className="text-xs text-red-600 mt-1">{legErrors.from}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Via</label>
                    <input
                      type="text"
                      value={draft.via}
                      onChange={(e) => setDraft({ ...draft, via: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Ex. hållplatser / stopp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Antal passagerare *</label>
                    <input
                      type="number"
                      min={1}
                      value={draft.pax ?? ""}
                      onChange={(e) => setDraft({ ...draft, pax: Math.max(0, Number(e.target.value) || 0) })}
                      onKeyDown={(e) => e.key === "Enter" && addLeg()}
                      className="w-full border rounded px-2 py-1"
                      aria-invalid={!!legErrors.pax}
                    />
                    {legErrors.pax && <p className="text-xs text-red-600 mt-1">{legErrors.pax}</p>}
                  </div>
                </div>

                {/* Höger */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Till *</label>
                    <input
                      type="text"
                      value={draft.to}
                      onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addLeg()}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Ange en plats"
                      aria-invalid={!!legErrors.to}
                    />
                    {legErrors.to && <p className="text-xs text-red-600 mt-1">{legErrors.to}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Kontaktperson ombord (namn/nummer)
                    </label>
                    <input
                      type="text"
                      value={draft.onboardContact}
                      onChange={(e) => setDraft({ ...draft, onboardContact: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#194C66]/80 mb-1">Övrig information</label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full border rounded px-2 py-2 min-h-[90px]"
                />
              </div>

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
                      <th className="text-left px-3 py-2">På plats</th>
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
                        <td className="px-3 py-2">{tidyTime(l.start) || l.start}</td>
                        <td className="px-3 py-2">{tidyTime(l.end || "") || l.end || "—"}</td>
                        <td className="px-3 py-2">{typeof l.onSite === "number" ? `${Math.max(0, l.onSite)} min före` : "—"}</td>
                        <td className="px-3 py-2">{l.from}</td>
                        <td className="px-3 py-2">{l.via}</td>
                        <td className="px-3 py-2">{l.to}</td>
                        <td className="px-3 py-2">{typeof l.pax === "number" ? l.pax : "—"}</td>
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
                  onClick={() => {
                    if (legs.length === 0 && !validateDraft()) return;
                    setStep(2);
                  }}
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
              <div className="rounded-lg bg-[#fff6da] text-[#4b5563] p-4 text-sm">
                <strong className="mr-1">Info:</strong>
                Du skapar en bokning för {legs.length} körning{legs.length > 1 ? "ar" : ""}. Bekräfta uppgifter och spara.
              </div>

              {(bannerError || submitError) && (
                <div ref={bannerRef} className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm" role="alert" aria-live="assertive">
                  {bannerError || submitError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kund */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Beställare *</label>
                    <input
                      value={contact}
                      onChange={(e) => { setContact(e.target.value); setStep2Errors(s => ({...s, contact: ""})); }}
                      className="w-full border rounded px-2 py-1"
                      aria-invalid={!!step2Errors.contact}
                    />
                    {step2Errors.contact && <p className="text-xs text-red-600 mt-1">{step2Errors.contact}</p>}
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">E-post *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setStep2Errors(s => ({...s, email: ""})); }}
                      className="w-full border rounded px-2 py-1"
                      aria-invalid={!!step2Errors.email}
                    />
                    {step2Errors.email && <p className="text-xs text-red-600 mt-1">{step2Errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Telefon *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setStep2Errors(s => ({...s, phone: ""})); }}
                      className="w-full border rounded px-2 py-1"
                      aria-invalid={!!step2Errors.phone}
                    />
                    {step2Errors.phone && <p className="text-xs text-red-600 mt-1">{step2Errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Övrig information</label>
                    <textarea
                      value={freeNotes}
                      onChange={(e) => setFreeNotes(e.target.value)}
                      className="w-full border rounded px-2 py-2 min-h-[120px]"
                    />
                  </div>
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
