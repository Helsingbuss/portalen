// src/components/offers/OfferCalculator.tsx
import { useEffect, useMemo, useState } from "react";

/** Props som krävs för att kunna skicka */
type Props = {
  offerId: string;          // t.ex. "4b6acc7f-..." (UUID i offers.id)
  offerNumber: string;      // t.ex. "HB25007"
  customerEmail: string;    // kundens e-post
};

function sek(n: number) {
  return n.toLocaleString("sv-SE", { style: "currency", currency: "SEK" });
}

export default function OfferCalculator({
  offerId,
  offerNumber,
  customerEmail,
}: Props) {
  // Standardpriser (exkl. moms)
  const [kmPrice, setKmPrice] = useState<number>(9.9);
  const [hourDay, setHourDay] = useState<number>(300);
  const [hourEve, setHourEve] = useState<number>(345);
  const [hourWknd, setHourWknd] = useState<number>(395);
  const [serviceFee, setServiceFee] = useState<number>(1800);
  const [includeServiceFee, setIncludeServiceFee] = useState<boolean>(true);

  // Inmatningar
  const [km, setKm] = useState<number>(0);
  const [hDay, setHday] = useState<number>(0);
  const [hEve, setHeve] = useState<number>(0);
  const [hWknd, setHwknd] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(0.06); // 6% default (Sverige)
  const [note, setNote] = useState<string>("");

  // Liten sanity-check (visar diskret i konsolen så du kan verifiera)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[OfferCalculator] props", { offerId, offerNumber, customerEmail });
  }, [offerId, offerNumber, customerEmail]);

  // Beräkning
  const exVat = useMemo(() => {
    const base =
      km * kmPrice +
      hDay * hourDay +
      hEve * hourEve +
      hWknd * hourWknd;
    return base + (includeServiceFee ? serviceFee : 0);
  }, [km, kmPrice, hDay, hourDay, hEve, hourEve, hWknd, hourWknd, includeServiceFee, serviceFee]);

  const vat = useMemo(() => Math.round(exVat * vatRate * 100) / 100, [exVat, vatRate]);
  const total = useMemo(() => exVat + vat, [exVat, vat]);

  const canSend = Boolean(offerId && offerNumber && customerEmail);

  async function saveDraft() {
    if (!offerId) return;
    const input = {
      pricing: { kmPrice, hourDay, hourEve, hourWknd, serviceFee, includeServiceFee, vatRate },
      input: { km, hDay, hEve, hWknd, note },
    };
    const breakdown = {
      grandExVat: exVat,
      grandVat: vat,
      grandTotal: total,
      serviceFeeExVat: includeServiceFee ? serviceFee : 0,
      legs: [
        // enkelt upplägg: en summerad sträcka (du kan byta till två legs om du vill)
        { subtotExVat: exVat, vat, total },
      ],
    };

    const res = await fetch(`/api/offers/${offerId}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "draft", input, breakdown }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Misslyckades spara utkast: ${j?.error || res.status}`);
      return;
    }
    // eslint-disable-next-line no-alert
    alert("Utkast sparat ✅");
  }

  async function sendProposal() {
    if (!canSend) {
      // eslint-disable-next-line no-alert
      alert("offerId, offerNumber och customerEmail krävs");
      return;
    }

    const input = {
      pricing: { kmPrice, hourDay, hourEve, hourWknd, serviceFee, includeServiceFee, vatRate },
      input: { km, hDay, hEve, hWknd, note },
    };
    const breakdown = {
      grandExVat: exVat,
      grandVat: vat,
      grandTotal: total,
      serviceFeeExVat: includeServiceFee ? serviceFee : 0,
      legs: [{ subtotExVat: exVat, vat, total }],
    };

    // 1) Uppdatera offerten med kalkylen + markera skickad
    {
      const res = await fetch(`/api/offers/${offerId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "send", input, breakdown }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Kunde inte uppdatera offert: ${j?.error || res.status}`);
        return;
      }
    }

    // 2) Skicka mail (API som tar emot fria payloads)
    {
      const res = await fetch(`/api/offers/send-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          offerNumber,
          customerEmail,
          totals: { exVat, vat, total },
          pricing: { kmPrice, hourDay, hourEve, hourWknd, serviceFee, includeServiceFee, vatRate },
          input: { km, hDay, hEve, hWknd, note },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Kunde inte skicka mail: ${j?.error || res.status}`);
        return;
      }
    }

    // eslint-disable-next-line no-alert
    alert("Prisförslag skickat ✅");
  }

  return (
    <div className="space-y-4">
      {/* Översta raden: prisinställningar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <LabeledInput label="Kilometerpris (kr/km)" value={kmPrice} onChange={setKmPrice} />
        <LabeledInput label="Timpris dag (kr/tim)" value={hourDay} onChange={setHourDay} />
        <LabeledInput label="Timpris kväll (kr/tim)" value={hourEve} onChange={setHourEve} />
        <LabeledInput label="Timpris helg (kr/tim)" value={hourWknd} onChange={setHourWknd} />
        <LabeledInput label="Serviceavgift (kr)" value={serviceFee} onChange={setServiceFee} />
      </div>

      <div className="flex items-center gap-3 text-sm text-[#194C66]">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeServiceFee}
            onChange={(e) => setIncludeServiceFee(e.target.checked)}
          />
          Ta med serviceavgift (förvalt på)
        </label>
        <div className="ml-4">
          Moms:
          <select
            className="ml-2 border rounded px-2 py-1"
            value={vatRate}
            onChange={(e) => setVatRate(parseFloat(e.target.value))}
          >
            <option value={0.06}>6% (Sverige)</option>
            <option value={0.0}>0% (Utomlands)</option>
          </select>
        </div>
      </div>

      {/* Inmatning: km + timmar + notering */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <LabeledInput label="Kilometer" value={km} onChange={setKm} />
        <LabeledInput label="Timmar dag" value={hDay} onChange={setHday} />
        <LabeledInput label="Timmar kväll" value={hEve} onChange={setHeve} />
        <LabeledInput label="Timmar helg" value={hWknd} onChange={setHwknd} />
      </div>

      <div>
        <label className="block text-sm text-[#194C66]/80 mb-1">
          Intern anteckning (valfritt)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border rounded px-2 py-2"
          placeholder="T.ex. ”Önskar toalett ombord” eller annan notering för prisförslaget"
        />
      </div>

      {/* Summering */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI label="Pris exkl. moms" value={exVat} />
        <KPI label="Moms" value={vat} />
        <KPI label="Totalsumma" value={total} />
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          onClick={saveDraft}
          className="px-4 py-2 rounded-[25px] bg-[#E5EEF3] text-[#194C66] text-sm font-medium"
        >
          Spara som standard
        </button>

        <button
          onClick={sendProposal}
          disabled={!canSend}
          className={`px-4 py-2 rounded-[25px] text-sm font-medium ${
            canSend ? "bg-[#194C66] text-white" : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
          title={canSend ? "" : "Offert-ID, nummer och e-post måste finnas"}
        >
          Skicka…
        </button>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-sm text-[#194C66]/80">
      <span className="block mb-1">{label}</span>
      <input
        type="number"
        step="1"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full border rounded px-2 py-1"
      />
    </label>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#f9fafb] rounded-lg p-3">
      <div className="text-xs text-[#194C66]/70">{label}</div>
      <div className="text-lg font-semibold text-[#194C66]">{sek(value)}</div>
    </div>
  );
}
