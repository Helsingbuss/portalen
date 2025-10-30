// src/pages/admin/offers/new.tsx
import { useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Leg = {
  date: string;         // YYYY-MM-DD
  time: string;         // HH:MM
  from: string;
  to: string;
  via: string;
  passengers?: number | null;
  onboardContact?: string;
  notes?: string;
};

type Step = 1 | 2;

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function NewOfferAdmin() {
  const [step, setStep] = useState<Step>(1);

  // Visuell placeholder – det riktiga numret skapas i API:et
  const nextUiId = useMemo(() => `HB25${"00XX"}`, []);

  // Steg 1 – körningar (mappar max 2 rader till tur/retur)
  const [draftLeg, setDraftLeg] = useState<Leg>({
    date: todayISO(),
    time: "08:00",
    from: "",
    to: "",
    via: "",
    passengers: undefined,
    onboardContact: "",
    notes: "",
  });
  const [legs, setLegs] = useState<Leg[]>([]);
  const isRoundTrip = legs.length >= 2;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addLeg = () => {
    if (!draftLeg.from || !draftLeg.to || !draftLeg.date || !draftLeg.time) return;
    if (legs.length >= 2) {
      setSubmitError("Max två rader (tur & retur). Ta bort en rad om du vill lägga till en ny.");
      return;
    }
    setSubmitError(null);
    setLegs((prev) => [...prev, draftLeg]);
    setDraftLeg({
      date: todayISO(),
      time: "08:00",
      from: "",
      to: "",
      via: "",
      passengers: draftLeg.passengers,
      onboardContact: draftLeg.onboardContact,
      notes: "",
    });
  };

  const removeLeg = (idx: number) =>
    setLegs((prev) => prev.filter((_, i) => i !== idx));

  // Vänd pågående formulärrad (Från/Till)
  const flipDraft = () => setDraftLeg((d) => ({ ...d, from: d.to, to: d.from }));

  // Skapa retur automatiskt av första raden
  const createReturnFromFirst = () => {
    if (legs.length !== 1) return;
    const a = legs[0];
    const ret: Leg = {
      date: a.date,
      time: a.time,
      from: a.to,
      to: a.from,
      via: "",
      passengers: a.passengers ?? undefined,
      onboardContact: a.onboardContact ?? "",
      notes: "",
    };
    setLegs((prev) => [...prev, ret]);
  };

  // Vänd en redan tillagd rad
  const flipRow = (i: number) =>
    setLegs((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, from: l.to, to: l.from } : l))
    );

  // Steg 2 – kunduppgifter
  const [customerReference, setCustomerReference] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [freeNotes, setFreeNotes] = useState("");

  // Krav för att gå vidare: minst 1 körning och passagerare angivet
  const canGoNext = legs.length >= 1 && !!(legs[0].passengers ?? 0);

  async function handleSubmit() {
    setSubmitError(null);

    // ⭐ Obligatoriska fält i steg 2
    const needRef = customerReference.trim();
    const needEmail = email.trim();
    const needPhone = phone.trim();
    if (!needRef || !needEmail || !needPhone) {
      setSubmitError("Fyll i Referens (beställarens namn), E-post och Telefon.");
      return;
    }

    setSubmitting(true);

    const leg1 = legs[0];
    const leg2 = legs[1]; // retur (valfri)

    const options: string[] = [];
    if (leg1?.onboardContact) options.push(`Kontakt ombord: ${leg1.onboardContact}`);

    const payload = {
      // kontakt (sparas konsekvent i DB)
      contact_person: needRef,
      customer_email: needEmail,
      customer_phone: needPhone,

      // övrigt kund (valfritt att spara parallellt)
      customer_name: needRef,
      customer_type: "privat",
      invoice_ref: invoiceRef || null,

      // primär sträcka
      passengers: Number(leg1?.passengers ?? 0),
      departure_place: leg1?.from || null,
      destination: leg1?.to || null,
      departure_date: leg1?.date || null,
      departure_time: leg1?.time || null,
      stopover_places: leg1?.via || null,

      // retur
      return_departure: leg2 ? leg2.from : null,
      return_destination: leg2 ? leg2.to : null,
      return_date: leg2 ? leg2.date : null,
      return_time: leg2 ? leg2.time : null,

      // ❌ Skickar INTE round_trip/trip_type (kolumner saknas i DB)
      // round_trip: !!leg2,
      // trip_type: "sverige",

      // övrigt
      options,
      plans_description: null,
      final_destination: null,
      end_date: null,
      end_time: null,
      association: null,
      org_number: null,
      notes: freeNotes || leg1?.notes || null,
    };

    try {
      const res = await fetch("/api/offert/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        const msg: string =
          j?.error ||
          "Kunde inte skapa offert. Försök igen eller kontakta administratör.";

        if (msg.toLowerCase().includes("next_offer_serial")) {
          setSubmitError(
            "Kunde inte generera offertnummer (saknas DB-funktion next_offer_serial)."
          );
        } else {
          setSubmitError(msg);
        }
        setSubmitting(false);
        return;
      }

      const j = await res.json();
      window.location.href = `/admin/offers/${j.offer.id}`;
    } catch (e: any) {
      setSubmitError(e?.message || "Nätverksfel. Försök igen.");
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
              Skapa offertförfrågan{" "}
              <span className="text-[#194C66]/60 font-normal">ID ({nextUiId})</span>
            </h1>
            {isRoundTrip && (
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
              Steg 2: Kunduppgifter
            </div>
          </div>

          {/* STEG 1 */}
          {step === 1 && (
            <div className="bg-white rounded-xl shadow p-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vänster kolumn */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Avresa *</label>
                    <input
                      type="date"
                      value={draftLeg.date}
                      onChange={(e) => setDraftLeg({ ...draftLeg, date: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Kl. *</label>
                    <input
                      type="time"
                      value={draftLeg.time}
                      onChange={(e) => setDraftLeg({ ...draftLeg, time: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Antal passagerare *</label>
                    <input
                      type="number"
                      min={1}
                      value={draftLeg.passengers ?? ""}
                      onChange={(e) => setDraftLeg({ ...draftLeg, passengers: Number(e.target.value) || 0 })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                </div>

                {/* Mitten kolumn */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Från *</label>
                    <input
                      type="text"
                      value={draftLeg.from}
                      onChange={(e) => setDraftLeg({ ...draftLeg, from: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Ange en plats"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Via</label>
                    <input
                      type="text"
                      value={draftLeg.via}
                      onChange={(e) => setDraftLeg({ ...draftLeg, via: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Ex. hållplatser / stopp"
                    />
                  </div>
                </div>

                {/* Höger kolumn */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Till *</label>
                    <input
                      type="text"
                      value={draftLeg.to}
                      onChange={(e) => setDraftLeg({ ...draftLeg, to: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Ange en plats"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Kontaktperson ombord (namn och nummer)
                    </label>
                    <input
                      type="text"
                      value={draftLeg.onboardContact}
                      onChange={(e) => setDraftLeg({ ...draftLeg, onboardContact: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#194C66]/80 mb-1">Övrig information</label>
                <textarea
                  value={draftLeg.notes}
                  onChange={(e) => setDraftLeg({ ...draftLeg, notes: e.target.value })}
                  className="w-full border rounded px-2 py-2 min-h-[90px]"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={addLeg}
                  className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm"
                >
                  + Lägg till rad
                </button>

                <button
                  type="button"
                  onClick={flipDraft}
                  className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                  title="Byt plats på Från/Till i formuläret"
                >
                  Vänd på körning
                </button>

                {legs.length === 1 && (
                  <button
                    type="button"
                    onClick={createReturnFromFirst}
                    className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                    title="Skapar retur genom att vända sträcka 1"
                  >
                    Skapa retur (vänd sträcka 1)
                  </button>
                )}
              </div>

              {/* Tabell med körningar */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#e5eef3] text-[#194C66]">
                    <tr>
                      <th className="text-left px-3 py-2">Avresa</th>
                      <th className="text-left px-3 py-2">Kl.</th>
                      <th className="text-left px-3 py-2">Från</th>
                      <th className="text-left px-3 py-2">Via</th>
                      <th className="text-left px-3 py-2">Till</th>
                      <th className="text-left px-3 py-2">Passagerare</th>
                      <th className="text-left px-3 py-2">Kontaktperson</th>
                      <th className="text-right px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {legs.map((l, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-3 py-2">{l.date}</td>
                        <td className="px-3 py-2">{l.time}</td>
                        <td className="px-3 py-2">{l.from}</td>
                        <td className="px-3 py-2">{l.via}</td>
                        <td className="px-3 py-2">{l.to}</td>
                        <td className="px-3 py-2">{l.passengers ?? "—"}</td>
                        <td className="px-3 py-2">{l.onboardContact || "—"}</td>
                        <td className="px-3 py-2 text-right space-x-3">
                          <button
                            onClick={() => flipRow(i)}
                            className="text-[#194C66] underline"
                            title="Vänd Från/Till på denna rad"
                          >
                            Vänd
                          </button>
                          <button
                            onClick={() => removeLeg(i)}
                            className="text-[#194C66] underline"
                          >
                            Ta bort
                          </button>
                        </td>
                      </tr>
                    ))}
                    {legs.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-[#194C66]/60" colSpan={8}>
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
                  Gå vidare med offertförfrågan
                </button>
              </div>
            </div>
          )}

          {/* STEG 2 */}
          {step === 2 && (
            <div className="bg-white rounded-xl shadow p-4 space-y-6">
              <div className="rounded-lg bg-[#fff6da] text-[#4b5563] p-4 text-sm">
                <strong className="mr-1">Info:</strong>
                Du har begärt en offert för {legs.length} körning{legs.length > 1 ? "ar" : ""}.
                Bekräfta uppgifter och skicka in förfrågan.
              </div>

              {/* Felbanner */}
              {submitError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Referens *</label>
                    <input
                      value={customerReference}
                      onChange={(e) => setCustomerReference(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">E-postadress *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Telefon *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">
                      Fakturareferens/Ansvarskod
                    </label>
                    <input
                      value={invoiceRef}
                      onChange={(e) => setInvoiceRef(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#194C66]/80 mb-1">Övrig information</label>
                    <textarea
                      value={freeNotes}
                      onChange={(e) => setFreeNotes(e.target.value)}
                      className="w-full border rounded px-2 py-2 min-h-[160px]"
                    />
                  </div>
                  <div>
                    <button className="px-4 py-2 rounded border text-sm text-[#194C66]">
                      Bifoga fil
                    </button>
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
                  {submitting ? "Skickar…" : "Skicka in offertförfrågan"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
