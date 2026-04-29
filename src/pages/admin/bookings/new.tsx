// src/pages/admin/bookings/new.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Leg = {
  date: string; // YYYY-MM-DD
  start: string; // HH:MM (starttid)
  end?: string; // HH:MM (planerad sluttid)
  onSite?: number | null; // minuter före start då bussen är på plats
  from: string;
  to: string;
  via: string;
  passengers?: number | null;
  onboardContact?: string;
  notes?: string;
};

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

    // extra fält som hamnar som metainfo i notes
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
  numberMin1: "Ange minst 1 passagerare",
  timeInvalid: "Ange tid i format HH:MM (t.ex. 08:00)",
  onSiteMin0: "Ange 0 eller fler minuter",
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Tillåt siffror, +, mellanslag och bindestreck; städas bort vid submit
const phoneDisplayRe = /^[+0-9\s-]{6,20}$/;

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

function normaliseTimeHHMM(v: string | null | undefined) {
  if (!v) return v || undefined;
  return typeof v === "string" && v.length >= 5 ? v.slice(0, 5) : v;
}

export default function NewBookingAdmin() {
  // Visuell placeholder – BK{YY}{NNNN} genereras i API
  const nextUiId = useMemo(() => `BK25${"00XX"}`, []);

  /* ================= STATE: KÖRNINGAR ================= */

  const [draftLeg, setDraftLeg] = useState<Leg>({
    date: todayISO(),
    start: "08:00",
    end: "",
    onSite: 15,
    from: "",
    to: "",
    via: "",
    passengers: undefined,
    onboardContact: "",
    notes: "",
  });

  const [legs, setLegs] = useState<Leg[]>([]);
  const isRoundTrip = legs.length >= 2;

  const [legErrors, setLegErrors] = useState<
    Partial<Record<keyof Leg, string>>
  >({});

  /* ================= STATE: FEL & SUBMIT ================= */

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ================= STATE: KUND + TILLDELNING ================= */

  const [contact, setContact] = useState(""); // Beställare
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [freeNotes, setFreeNotes] = useState(""); // Övrig info (bokningsnivå)

  const [vehicles, setVehicles] = useState<Opt[]>([]);
  const [drivers, setDrivers] = useState<Opt[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");

  const [step2Errors, setStep2Errors] = useState<
    Partial<Record<"contact" | "email" | "phone", string>>
  >({});

  /* ================= STATE: KOPPLA OFFERT ================= */

  const [offerSearch, setOfferSearch] = useState("");
  const [offerOpts, setOfferOpts] = useState<OfferOpt[]>([]);
  const [offerLoading, setOfferLoading] = useState(false);
  const [linkedOfferIds, setLinkedOfferIds] = useState<string[]>([]);
  const offersAbortRef = useRef<AbortController | null>(null);
  const offerDebounceRef = useRef<number | null>(null);

  /* ================= VALIDERING ================= */

  function validateDraft(): boolean {
    const errs: Partial<Record<keyof Leg, string>> = {};
    const pax = Number(draftLeg.passengers ?? 0);
    const normStart = tidyTime(draftLeg.start);
    const normEnd = draftLeg.end ? tidyTime(draftLeg.end) : null;

    if (!draftLeg.date) errs.date = svValidation.required;
    if (!normStart) errs.start = svValidation.timeInvalid;
    if (draftLeg.end && !normEnd) errs.end = svValidation.timeInvalid;
    if (!draftLeg.from.trim()) errs.from = svValidation.required;
    if (!draftLeg.to.trim()) errs.to = svValidation.required;
    if (!pax || pax < 1) errs.passengers = svValidation.numberMin1;

    const onSiteVal = Number(draftLeg.onSite ?? 0);
    if (onSiteVal < 0) errs.onSite = svValidation.onSiteMin0;

    setLegErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateCustomer(): boolean {
    const errs: Partial<Record<"contact" | "email" | "phone", string>> = {};
    if (!contact.trim()) errs.contact = svValidation.required;
    if (!email.trim() || !emailRe.test(email.trim()))
      errs.email = svValidation.email;
    if (!phone.trim() || !phoneDisplayRe.test(phone.trim()))
      errs.phone = svValidation.phone;
    setStep2Errors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ================= KÖRNINGAR ================= */

  const addLeg = () => {
    if (!validateDraft()) return;

    setSubmitError(null);

    const normStart = tidyTime(draftLeg.start) || draftLeg.start;
    const normEnd = tidyTime(draftLeg.end || "") || draftLeg.end || "";

    setLegs((prev) => [
      ...prev,
      { ...draftLeg, start: normStart, end: normEnd },
    ]);

    setDraftLeg({
      date: todayISO(),
      start: "08:00",
      end: "",
      onSite: draftLeg.onSite ?? 15,
      from: "",
      to: "",
      via: "",
      passengers: draftLeg.passengers,
      onboardContact: draftLeg.onboardContact,
      notes: "",
    });
    setLegErrors({});
  };

  const removeLeg = (idx: number) =>
    setLegs((prev) => prev.filter((_, i) => i !== idx));

  /* ================= OFFERT → METADATA ================= */

  function buildMetaNote(a: OfferOpt["autofill"]) {
    const rows: string[] = [];

    if (a.enkel_tur_retur) rows.push(`Typ av resa: ${a.enkel_tur_retur}`);
    if (a.behover_buss !== null && a.behover_buss !== undefined)
      rows.push(`Behöver buss på plats: ${a.behover_buss ? "Ja" : "Nej"}`);
    if (a.notis_pa_plats)
      rows.push(`Vad ska bussen göra på plats: ${a.notis_pa_plats}`);
    if (a.basplats_pa_destination)
      rows.push(`Basplats på destination: ${a.basplats_pa_destination}`);
    if (a.last_day_) rows.push(`Sista dagen (på plats): ${a.last_day_}`);
    if (a.local_kor) rows.push(`Lokala körningar: ${a.local_kor}`);
    if (typeof a.standby === "number")
      rows.push(`Väntetid/standby (timmar): ${a.standby}`);
    if (a.parkering) rows.push(`Parkering & tillstånd: ${a.parkering}`);
    if (a.contact_person_ombord)
      rows.push(`Kontaktperson ombord: ${a.contact_person_ombord}`);

    if (a.foretag_forening) rows.push(`Företag/Förening: ${a.foretag_forening}`);
    if (a.referens_po_nummer) rows.push(`Referens/PO-nummer: ${a.referens_po_nummer}`);
    if (a.org_number) rows.push(`Organisationsnummer: ${a.org_number}`);

    if (rows.length === 0) return "";
    return `\n\n— Offertdata —\n${rows.join("\n")}`;
  }

  function applyOffer(opt: OfferOpt) {
    const a = opt.autofill;
    const isFirst = linkedOfferIds.length === 0;

    setLinkedOfferIds((prev) => (prev.includes(opt.id) ? prev : [...prev, opt.id]));

    if (isFirst) {
      setContact(a.contact_person ?? "");
      setEmail(a.contact_email ?? "");
      setPhone(a.contact_phone ?? "");

      const metaNote = buildMetaNote(a);
      setFreeNotes((prev) => {
        const base = prev?.trim() ? prev.trim() + "\n\n" : "";
        const fromOffer = (a.notes ?? "") + metaNote;
        return base + fromOffer;
      });

      const first: Leg = {
        date: a.out_date || todayISO(),
        start: normaliseTimeHHMM(a.out_time) || "08:00",
        end: normaliseTimeHHMM(a.end_time) || "",
        onSite: 15,
        from: a.out_from || "",
        to: a.out_to || a.final_destination || "",
        via: a.via || "",
        passengers: a.passengers ?? undefined,
        onboardContact: a.contact_person_ombord || "",
        notes: a.notes || "",
      };

      const arr: Leg[] = [first];

      if (a.ret_from || a.ret_to || a.ret_date || a.ret_time) {
        arr.push({
          date: a.ret_date || a.out_date || todayISO(),
          start:
            normaliseTimeHHMM(a.ret_time) ||
            normaliseTimeHHMM(a.out_time) ||
            "08:00",
          end: normaliseTimeHHMM(a.return_end_time) || "",
          onSite:
            typeof a.return_on_site_minutes === "number"
              ? Math.max(0, a.return_on_site_minutes || 0)
              : 15,
          from: a.ret_from || a.out_to || "",
          to: a.ret_to || a.out_from || "",
          via: "",
          passengers: a.passengers ?? first.passengers,
          onboardContact: a.contact_person_ombord || "",
          notes: a.notes || "",
        });
      }

      setLegs(arr);
      setDraftLeg({
        date: todayISO(),
        start: "08:00",
        end: "",
        onSite: 15,
        from: "",
        to: "",
        via: "",
        passengers: a.passengers ?? undefined,
        onboardContact: "",
        notes: "",
      });
    } else {
      const metaNote = buildMetaNote(a);
      setFreeNotes((prev) => {
        const base = prev || "";
        const header = `\n\n— Extra kopplad offert: ${opt.label} —\n`;
        return base + header + (metaNote || "");
      });
    }

    setOfferSearch("");
    setOfferOpts([]);
    setSubmitError(null);
  }

  async function doSearchOffers(q: string, signal: AbortSignal) {
    const url =
      q && q.length >= 1
        ? `/api/offers/options?search=${encodeURIComponent(q)}`
        : `/api/offers/options`;
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

  /* ================= LADDNING AV FORDON/CHAUFFÖR ================= */

  useEffect(() => {
    (async () => {
      try {
        const v = await fetch("/api/vehicles/options")
          .then((r) => r.json())
          .catch(() => ({ options: [] }));
        const d = await fetch("/api/drivers/options")
          .then((r) => r.json())
          .catch(() => ({ options: [] }));
        setVehicles(v?.options ?? []);
        setDrivers(d?.options ?? []);
      } catch {
        // tyst fel
      }
    })();

    return () => {
      if (offerDebounceRef.current) window.clearTimeout(offerDebounceRef.current);
      if (offersAbortRef.current) offersAbortRef.current.abort();
    };
  }, []);

  /* ================= SUBMIT ================= */

  function cleanPhone(p: string) {
    return p.replace(/[\s-]+/g, "");
  }

  function _trim(v?: string | null) {
    return v == null ? null : v.toString().trim() || null;
  }

  // ✅ Ny: skicka ALLA legs också (många backends för bookings kräver detta)
  function buildLegsPayload(all: Leg[]) {
    return all.map((l) => ({
      date: _trim(l.date),
      start: tidyTime(l.start) || null,
      end: l.end ? tidyTime(l.end) : null,
      onSite:
        typeof l.onSite === "number" ? Math.max(0, l.onSite) : null,
      from: _trim(l.from),
      to: _trim(l.to),
      via: _trim(l.via),
      passengers:
        typeof l.passengers === "number" ? Math.max(1, l.passengers) : null,
      onboardContact: _trim(l.onboardContact || null),
      notes: _trim(l.notes || null),
    }));
  }

  // ✅ Ny: bättre feltext från servern
  async function readServerError(res: Response) {
    const text = await res.text().catch(() => "");
    if (!text) return `HTTP ${res.status}`;

    // försök JSON först
    try {
      const j = JSON.parse(text);
      return j?.error || j?.message || `HTTP ${res.status}`;
    } catch {
      // annars returnera kort text (för att inte spamma UI med HTML)
      const short = text.replace(/\s+/g, " ").trim().slice(0, 240);
      return short || `HTTP ${res.status}`;
    }
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (legs.length === 0) {
      setSubmitError("Lägg till minst en körning innan du skapar bokningen.");
      return;
    }

    if (!validateCustomer()) return;

    const leg1 = legs[0];
    const leg2 = legs[1];

    const dep_time = tidyTime(leg1?.start || "") || leg1?.start || null;
    const dep_end = tidyTime(leg1?.end || "") || leg1?.end || null;

    const ret_time = leg2
      ? tidyTime(leg2.start || "") || leg2.start || null
      : null;
    const ret_end = leg2
      ? tidyTime(leg2.end || "") || leg2.end || null
      : null;

    if (!dep_time) return setSubmitError("Starttid i utresan är ogiltig.");
    if (leg1?.end && !dep_end) return setSubmitError("Sluttid i utresan är ogiltig.");
    if (leg2?.start && !ret_time) return setSubmitError("Starttid i returen är ogiltig.");
    if (leg2?.end && !ret_end) return setSubmitError("Sluttid i returen är ogiltig.");

    setSubmitting(true);

    const passengers = Math.max(1, Number(leg1?.passengers ?? 1) || 1);

    const legsPayload = buildLegsPayload(legs);

    const payload: any = {
      // kund
      contact_person: _trim(contact),
      customer_email: _trim(email),
      customer_phone: cleanPhone(phone.trim()),

      // ✅ NYTT: alla körningar (viktigt om backend skapar booking_legs)
      legs: legsPayload,

      // utresa (legacy)
      passengers,
      departure_place: _trim(leg1?.from),
      destination: _trim(leg1?.to),
      departure_date: _trim(leg1?.date),
      departure_time: dep_time,
      end_time: dep_end,
      on_site_minutes:
        typeof leg1?.onSite === "number" ? Math.max(0, leg1.onSite) : null,
      stopover_places: _trim(leg1?.via),

      // retur (legacy)
      return_departure: _trim(leg2?.from || null),
      return_destination: _trim(leg2?.to || null),
      return_date: _trim(leg2?.date || null),
      return_time: ret_time,
      return_end_time: ret_end,
      return_on_site_minutes: leg2
        ? typeof leg2.onSite === "number"
          ? Math.max(0, leg2.onSite)
          : null
        : null,

      // interna tilldelningar
      assigned_vehicle_id: vehicleId || null,
      assigned_driver_id: driverId || null,

      // kopplade offerter
source_offer_id: linkedOfferIds[0] || null,

// behövs för relation i Supabase
offer_id: linkedOfferIds[0] || null,

// Supabase klarar inte array direkt
linked_offer_ids: linkedOfferIds.length
  ? JSON.stringify(linkedOfferIds)
  : null,

      // övrigt / noteringar
      notes: _trim(freeNotes) || _trim(leg1?.notes) || null,
    };

    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await readServerError(res);
        setSubmitError(
          msg ||
            "Kunde inte skapa bokning. Försök igen eller kontakta administratör."
        );
        setSubmitting(false);
        return;
      }

      const j = await res.json().catch(() => ({} as any));

      // ✅ robust: försök hitta id i flera format
      const bookingId =
        j?.booking?.id ??
        j?.id ??
        j?.booking_id ??
        null;

      if (!bookingId) {
        setSubmitError(
          "Kunde inte läsa svaret (saknar booking.id). Bokningen kan vara skapad – kontrollera bokningslistan."
        );
        setSubmitting(false);
        return;
      }

      window.location.href = `/admin/bookings/${bookingId}`;
    } catch (e: any) {
      setSubmitError(e?.message || "Nätverksfel. Försök igen.");
      setSubmitting(false);
    }
  }

  const canSubmit = legs.length > 0 && !submitting;

  /* ================= RENDER ================= */

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">
              Skapa bokning{" "}
              <span className="text-[#194C66]/60 font-normal">
                ID ({nextUiId})
              </span>
            </h1>
            {isRoundTrip && (
              <span className="px-3 py-1 rounded-full bg-[#e5eef3] text-[#194C66] text-sm">
                Tur &amp; retur
              </span>
            )}
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="bg-white rounded-xl shadow p-4 space-y-4 lg:col-span-2">
              <div className="mb-1">
                <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                  Körningar
                </span>
              </div>

              <div className="bg-[#f8fafc] rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-[#194C66]/80">
                  Koppla offert (valfritt)
                </div>
                <input
                  className="border rounded px-3 py-2 w-full text-sm"
                  placeholder="Sök offert (nummer, kund, från/till)…"
                  value={offerSearch}
                  onChange={(e) => searchOffers(e.target.value)}
                  onFocus={() => {
                    if (offerOpts.length === 0) searchOffers(offerSearch);
                  }}
                  aria-label="Sök offert att koppla"
                />
                {offerLoading && (
                  <div className="mt-1 text-xs text-[#194C66]/60">Söker…</div>
                )}
                {!offerLoading && offerSearch && offerOpts.length === 0 && (
                  <div className="mt-1 text-xs text-[#194C66]/60">Inga träffar.</div>
                )}
                {!offerLoading && offerOpts.length > 0 && (
                  <div className="mt-2 border rounded-lg bg-white max-h-52 overflow-auto">
                    {offerOpts.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => applyOffer(o)}
                        className="block w-full text-left px-3 py-2 hover:bg-[#f5f4f0] text-sm"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
                {linkedOfferIds.length > 0 && (
                  <div className="text-[11px] text-[#194C66]/70 mt-1">
                    Kopplade offerter:{" "}
                    {linkedOfferIds.map((id, idx) => (
                      <span key={id}>
                        {idx > 0 && ", "}
                        <b>{id}</b>
                      </span>
                    ))}
                    <button
                      type="button"
                      className="ml-2 underline"
                      onClick={() => setLinkedOfferIds([])}
                    >
                      rensa
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Datum *
                    </label>
                    <input
                      type="date"
                      value={draftLeg.date}
                      min={todayISO()}
                      onChange={(e) => setDraftLeg({ ...draftLeg, date: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                      aria-invalid={!!legErrors.date}
                    />
                    {legErrors.date && (
                      <p className="text-xs text-red-600 mt-1">{legErrors.date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Starttid *
                    </label>
                    <input
                      type="time"
                      value={draftLeg.start}
                      onChange={(e) => setDraftLeg({ ...draftLeg, start: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                      aria-invalid={!!legErrors.start}
                    />
                    {legErrors.start && (
                      <p className="text-xs text-red-600 mt-1">{legErrors.start}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Sluttid (planerad)
                    </label>
                    <input
                      type="time"
                      value={draftLeg.end || ""}
                      onChange={(e) => setDraftLeg({ ...draftLeg, end: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                    {legErrors.end && (
                      <p className="text-xs text-red-600 mt-1">{legErrors.end}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Bussen på plats (min före start)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={draftLeg.onSite ?? 0}
                      onChange={(e) =>
                        setDraftLeg({
                          ...draftLeg,
                          onSite: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                      aria-invalid={!!legErrors.onSite}
                    />
                    {legErrors.onSite && (
                      <p className="text-xs text-red-600 mt-1">{legErrors.onSite}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Från *
                    </label>
                    <input
                      type="text"
                      value={draftLeg.from}
                      onChange={(e) => setDraftLeg({ ...draftLeg, from: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addLeg()}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Ange en plats"
                      aria-invalid={!!legErrors.from}
                    />
                    {legErrors.from && (
                      <p className="text-xs text-red-600 mt-1">{legErrors.from}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Via
                    </label>
                    <input
                      type="text"
                      value={draftLeg.via}
                      onChange={(e) => setDraftLeg({ ...draftLeg, via: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Ex. hållplatser / stopp"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Antal passagerare *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={draftLeg.passengers ?? ""}
                      onChange={(e) =>
                        setDraftLeg({
                          ...draftLeg,
                          passengers: Number(e.target.value) || 0,
                        })
                      }
                      onKeyDown={(e) => e.key === "Enter" && addLeg()}
                      className="w-full border rounded px-2 py-1 text-sm"
                      aria-invalid={!!legErrors.passengers}
                    />
                    {legErrors.passengers && (
                      <p className="text-xs text-red-600 mt-1">{legErrors.passengers}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Till *
                    </label>
                    <input
                      type="text"
                      value={draftLeg.to}
                      onChange={(e) => setDraftLeg({ ...draftLeg, to: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addLeg()}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Ange en plats"
                      aria-invalid={!!legErrors.to}
                    />
                    {legErrors.to && (
                      <p className="text-xs text-red-600 mt-1">{legErrors.to}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Kontaktperson ombord
                    </label>
                    <input
                      type="text"
                      value={draftLeg.onboardContact}
                      onChange={(e) =>
                        setDraftLeg({
                          ...draftLeg,
                          onboardContact: e.target.value,
                        })
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Namn, nummer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#194C66]/80 mb-1">
                  Övrig information
                </label>
                <textarea
                  value={draftLeg.notes}
                  onChange={(e) => setDraftLeg({ ...draftLeg, notes: e.target.value })}
                  className="w-full border rounded px-2 py-2 min-h-[90px] text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addLeg}
                  className="px-4 py-2 rounded-[25px] bg-[#111827] text-white text-xs sm:text-sm"
                  title="Lägg till körning"
                >
                  + Lägg till rad
                </button>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow p-4 flex flex-col">
              <div className="mb-3">
                <span className="inline-block px-3 py-1 rounded-full bg-[#111827] text-white text-[11px]">
                  Kunduppgifter
                </span>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm text-[#194C66]/80 mb-1">
                    Beställare *
                  </label>
                  <input
                    value={contact}
                    onChange={(e) => {
                      setContact(e.target.value);
                      setStep2Errors((s) => ({ ...s, contact: "" }));
                    }}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Förnamn / Efternamn"
                    aria-invalid={!!step2Errors.contact}
                  />
                  {step2Errors.contact && (
                    <p className="text-xs text-red-600 mt-1">{step2Errors.contact}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-[#194C66]/80 mb-1">
                    E-postadress *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setStep2Errors((s) => ({ ...s, email: "" }));
                    }}
                    className="w-full border rounded px-2 py-1 text-sm"
                    aria-invalid={!!step2Errors.email}
                  />
                  {step2Errors.email && (
                    <p className="text-xs text-red-600 mt-1">{step2Errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-[#194C66]/80 mb-1">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setStep2Errors((s) => ({ ...s, phone: "" }));
                    }}
                    className="w-full border rounded px-2 py-1 text-sm"
                    aria-invalid={!!step2Errors.phone}
                  />
                  {step2Errors.phone && (
                    <p className="text-xs text-red-600 mt-1">{step2Errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-[#194C66]/80 mb-1">
                    Övrig information (intern)
                  </label>
                  <textarea
                    value={freeNotes}
                    onChange={(e) => setFreeNotes(e.target.value)}
                    className="w-full border rounded px-2 py-2 min-h-[90px] text-sm"
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="text-sm font-semibold text-[#194C66]">
                    Tilldelning (internt)
                  </div>

                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Fordon</span>
                    <select
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">— Välj fordon —</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-[#194C66]/80">
                    <span className="mb-1 block">Chaufför</span>
                    <select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">— Välj chaufför —</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="text-[11px] text-[#194C66]/60">
                    Dessa fält sparas bara i admin och visas inte för kund.
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="px-4 py-2 rounded-[25px] bg-[#111827] text-white text-xs sm:text-sm disabled:opacity-50"
                >
                  {submitting ? "Skapar…" : "Skapa bokning"}
                </button>
              </div>
            </section>
          </div>

          <section className="bg-white rounded-xl shadow p-4">
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
                    <th className="text-left px-3 py-2">Kontaktperson</th>
                    <th className="text-right px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {legs.map((l, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-3 py-2">{l.date}</td>
                      <td className="px-3 py-2">{tidyTime(l.start) || l.start}</td>
                      <td className="px-3 py-2">
                        {tidyTime(l.end || "") || l.end || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {typeof l.onSite === "number"
                          ? `${Math.max(0, l.onSite)} min före`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">{l.from}</td>
                      <td className="px-3 py-2">{l.via}</td>
                      <td className="px-3 py-2">{l.to}</td>
                      <td className="px-3 py-2">
                        {typeof l.passengers === "number" ? l.passengers : "—"}
                      </td>
                      <td className="px-3 py-2">{l.onboardContact || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLeg(i)}
                          className="text-[#194C66] underline text-xs"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  ))}
                  {legs.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-[#194C66]/60" colSpan={10}>
                        Inga körningar tillagda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
