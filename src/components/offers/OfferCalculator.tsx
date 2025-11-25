// src/components/offers/OfferCalculator.tsx
import { useEffect, useMemo, useState } from "react";

/** Props som krävs för att kunna skicka */
type Props = {
  offerId: string;        // t.ex. "4b6acc7f-..." (UUID i offers.id)
  offerNumber: string;    // t.ex. "HB25007"
  customerEmail: string;  // kundens e-post
};

function sek(n: number) {
  return n.toLocaleString("sv-SE", { style: "currency", currency: "SEK" });
}

type LegInput = { km: number; hDay: number; hEve: number; hWknd: number };
type TripDomain = "se" | "foreign"; // se = Sverige, foreign = utomlands

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
  const [serviceFeeMode, setServiceFeeMode] = useState<"once" | "perLeg">("once");

  // Moms + anteckning
  const [vatRate, setVatRate] = useState<number>(0.06);
  const [note, setNote] = useState<string>("");

  // Ben (utresa + ev. retur)
  const [includeReturn, setIncludeReturn] = useState<boolean>(false);
  const [leg1, setLeg1] = useState<LegInput>({
    km: 0,
    hDay: 0,
    hEve: 0,
    hWknd: 0,
  });
  const [leg2, setLeg2] = useState<LegInput>({
    km: 0,
    hDay: 0,
    hEve: 0,
    hWknd: 0,
  });

  // Markering Sverige / utomlands per ben (påverkar inte momssiffror än)
  const [leg1Domain, setLeg1Domain] = useState<TripDomain>("se");
  const [leg2Domain, setLeg2Domain] = useState<TripDomain>("se");

  // Debug
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[OfferCalculator] props", { offerId, offerNumber, customerEmail });
  }, [offerId, offerNumber, customerEmail]);

  // Kostnadsfunktion per ben
  const legCost = (L: LegInput) => {
    const base =
      L.km * kmPrice +
      L.hDay * hourDay +
      L.hEve * hourEve +
      L.hWknd * hourWknd;
    const fee =
      includeServiceFee && serviceFeeMode === "perLeg" ? serviceFee : 0;
    return base + fee;
  };

  // Beräkningar
  const exLeg1 = useMemo(
    () =>
      legCost(leg1),
    [leg1, kmPrice, hourDay, hourEve, hourWknd, includeServiceFee, serviceFeeMode, serviceFee]
  );

  const exLeg2 = useMemo(
    () =>
      includeReturn ? legCost(leg2) : 0,
    [includeReturn, leg2, kmPrice, hourDay, hourEve, hourWknd, includeServiceFee, serviceFeeMode, serviceFee]
  );

  const extraOnceFee =
    includeServiceFee && serviceFeeMode === "once" ? serviceFee : 0;

  const exVat = useMemo(
    () => exLeg1 + exLeg2 + extraOnceFee,
    [exLeg1, exLeg2, extraOnceFee]
  );

  const vat = useMemo(
    () => Math.round(exVat * vatRate * 100) / 100,
    [exVat, vatRate]
  );

  const total = useMemo(() => exVat + vat, [exVat, vat]);

  const canSend = Boolean(offerId && offerNumber && customerEmail);

  function copyLeg1ToLeg2() {
    setLeg2(leg1);
    setIncludeReturn(true);
    setLeg2Domain(leg1Domain);
  }

  /* ============= API-hjälpare ============= */

  function buildInputPayload() {
    return {
      pricing: {
        kmPrice,
        hourDay,
        hourEve,
        hourWknd,
        serviceFee,
        includeServiceFee,
        serviceFeeMode,
        vatRate,
      },
      leg1: {
        ...leg1,
        domain: leg1Domain, // Sverige / utland
      },
      leg2: includeReturn
        ? {
            ...leg2,
            domain: leg2Domain,
          }
        : null,
      note,
    };
  }

  function buildBreakdown() {
    const leg1Vat = Math.round(exLeg1 * vatRate * 100) / 100;
    const legs = [
      {
        subtotExVat: exLeg1,
        vat: leg1Vat,
        total: exLeg1 + leg1Vat,
      },
    ] as { subtotExVat: number; vat: number; total: number }[];

    if (includeReturn) {
      const v2 = Math.round(exLeg2 * vatRate * 100) / 100;
      legs.push({ subtotExVat: exLeg2, vat: v2, total: exLeg2 + v2 });
    }

    return {
      grandExVat: exVat,
      grandVat: vat,
      grandTotal: total,
      serviceFeeExVat: includeServiceFee ? serviceFee : 0,
      legs,
    };
  }

  async function saveDraft() {
    if (!offerId) return;

    const input = buildInputPayload();
    const breakdown = buildBreakdown();

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
    alert("Utkast sparat ✅");
  }

  async function sendProposal() {
    if (!canSend) {
      alert("offerId, offerNumber och customerEmail krävs");
      return;
    }

    const input = buildInputPayload();
    const breakdown = buildBreakdown();

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

    // 2) Skicka mail
    {
      const res = await fetch(`/api/offers/send-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          offerNumber,
          customerEmail,
          totals: { exVat, vat, total },
          pricing: {
            kmPrice,
            hourDay,
            hourEve,
            hourWknd,
            serviceFee,
            includeServiceFee,
            serviceFeeMode,
            vatRate,
          },
          input,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Kunde inte skicka mail: ${j?.error || res.status}`);
        return;
      }
    }

    alert("Prisförslag skickat ✅");
  }

  /* ============= RENDER ============= */

  return (
    <div className="space-y-4">
      {/* Rad 1 – grundpriser */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <LabeledNumber
          label="Kilometerpris (kr/km)"
          value={kmPrice}
          onChange={setKmPrice}
        />
        <LabeledNumber
          label="Timpris dag (kr/tim)"
          value={hourDay}
          onChange={setHourDay}
        />
        <LabeledNumber
          label="Timpris kväll (kr/tim)"
          value={hourEve}
          onChange={setHourEve}
        />
        <LabeledNumber
          label="Timpris helg (kr/tim)"
          value={hourWknd}
          onChange={setHourWknd}
        />
        <LabeledNumber
          label="Serviceavgift (kr)"
          value={serviceFee}
          onChange={setServiceFee}
        />
      </div>

      {/* Rad 2 – toggles */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-[#194C66]">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeServiceFee}
            onChange={(e) => setIncludeServiceFee(e.target.checked)}
          />
          Ta med serviceavgift
        </label>

        <label className="inline-flex items-center gap-2">
          Lägg på:
          <select
            className="border rounded px-2 py-1"
            value={serviceFeeMode}
            onChange={(e) =>
              setServiceFeeMode(e.target.value as "once" | "perLeg")
            }
            disabled={!includeServiceFee}
          >
            <option value="once">En gång</option>
            <option value="perLeg">Per ben</option>
          </select>
        </label>

        <div className="ml-0 md:ml-4 flex items-center gap-2">
          <span>Moms:</span>
          <select
            className="border rounded px-2 py-1"
            value={vatRate}
            onChange={(e) => setVatRate(parseFloat(e.target.value))}
          >
            <option value={0.06}>6% (Sverige)</option>
            <option value={0.0}>0% (Utomlands)</option>
          </select>
        </div>

        <label className="inline-flex items-center gap-2 md:ml-6">
          <input
            type="checkbox"
            checked={includeReturn}
            onChange={(e) => setIncludeReturn(e.target.checked)}
          />
          Inkludera retur i prisförslag
        </label>

        <button
          type="button"
          onClick={copyLeg1ToLeg2}
          className="px-3 py-1 rounded border text-sm bg-white hover:bg-[#f3f4f6]"
          title="Kopiera tider/km från utresan till returen"
        >
          Kopiera utresa → retur
        </button>
      </div>

      {/* Ben-kort */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LegCard
          title="Utresa"
          value={leg1}
          onChange={setLeg1}
          exVat={exLeg1}
          vat={Math.round(exLeg1 * vatRate * 100) / 100}
          domain={leg1Domain}
          onDomainChange={setLeg1Domain}
        />
        {includeReturn && (
          <LegCard
            title="Retur"
            value={leg2}
            onChange={setLeg2}
            exVat={exLeg2}
            vat={Math.round(exLeg2 * vatRate * 100) / 100}
            domain={leg2Domain}
            onDomainChange={setLeg2Domain}
          />
        )}
      </div>

      {includeServiceFee && serviceFeeMode === "once" && (
        <div className="text-sm text-[#194C66]/80">
          Serviceavgift en gång:{" "}
          <strong className="text-[#194C66]">{sek(serviceFee)}</strong>{" "}
          (läggs på totalsumman)
        </div>
      )}

      {/* Intern anteckning */}
      <div>
        <label className="block text-sm text-[#194C66]/80 mb-1">
          Intern anteckning (valfritt)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border rounded px-2 py-2 text-sm min-h-[70px]"
          placeholder='T.ex. "Önskar toalett ombord" eller annan notering för prisförslaget'
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
          className="px-4 py-2 rounded-[25px] bg-[#E5EEF3] text-[#194C66] text-sm font-medium hover:bg-[#d7e4ee]"
        >
          Spara utkast
        </button>

        <button
          onClick={sendProposal}
          disabled={!canSend}
          className={`px-4 py-2 rounded-[25px] text-sm font-medium ${
            canSend
              ? "bg-[#111827] text-white hover:bg-black"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
          title={
            canSend
              ? ""
              : "Offert-ID, nummer och e-post måste finnas"
          }
        >
          Skicka prisförslag
        </button>
      </div>
    </div>
  );
}

/* ====== Små komponenter ====== */

function LabeledNumber({
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
        className="w-full border rounded px-2 py-1 text-sm"
      />
    </label>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#f9fafb] rounded-lg p-3">
      <div className="text-xs text-[#194C66]/70">{label}</div>
      <div className="text-lg font-semibold text-[#194C66]">
        {sek(value)}
      </div>
    </div>
  );
}

function LegCard({
  title,
  value,
  onChange,
  exVat,
  vat,
  domain,
  onDomainChange,
}: {
  title: string;
  value: LegInput;
  onChange: (v: LegInput) => void;
  exVat: number;
  vat: number;
  domain: TripDomain;
  onDomainChange: (d: TripDomain) => void;
}) {
  return (
    <div className="border rounded-lg p-3 bg-[#f9fafb]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[#194C66] font-semibold">{title}</div>
        <div className="flex items-center gap-2 text-xs text-[#194C66]/80">
          <span>Resa:</span>
          <select
            className="border rounded px-2 py-1"
            value={domain}
            onChange={(e) =>
              onDomainChange(e.target.value as TripDomain)
            }
          >
            <option value="se">Bussresa inom Sverige</option>
            <option value="foreign">Bussresa utomlands</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <LabeledNumber
          label="Kilometer"
          value={value.km}
          onChange={(v) => onChange({ ...value, km: v })}
        />
        <LabeledNumber
          label="Timmar dag"
          value={value.hDay}
          onChange={(v) => onChange({ ...value, hDay: v })}
        />
        <LabeledNumber
          label="Timmar kväll"
          value={value.hEve}
          onChange={(v) => onChange({ ...value, hEve: v })}
        />
        <LabeledNumber
          label="Timmar helg"
          value={value.hWknd}
          onChange={(v) => onChange({ ...value, hWknd: v })}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <KPI label="Ben exkl. moms" value={exVat} />
        <KPI label="Moms (ben)" value={vat} />
        <KPI label="Ben totalt" value={exVat + vat} />
      </div>
    </div>
  );
}
