import { useEffect, useState } from "react";

type OfferCalculatorProps = {
  offerId: string;
  offerNumber: string;
  customerEmail?: string | null;
};

type TripDomain = "sverige" | "utomlands";

type LegInput = {
  km: number;
  hoursDay: number;
  hoursEvening: number;
  hoursWeekend: number;
};

type PriceCategoryKey = "bestallning" | "brollop" | "forening";
type BusTypeKey = "sprinter" | "turistbuss" | "helturistbuss" | "dubbeldackare";
type KmBandKey = "0_25" | "26_100" | "101_250" | "251_plus";

type PriceFields = {
  grundavgift: string;
  tim_vardag: string;
  tim_kvall: string;
  tim_helg: string;
  km_0_25: string;
  km_26_100: string;
  km_101_250: string;
  km_251_plus: string;
};

type PriceFormValues = Record<PriceCategoryKey, Record<BusTypeKey, PriceFields>>;

function sek(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(rounded);
}

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const normalized = v.replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default function OfferCalculator({
  offerId,
  offerNumber,
  customerEmail,
}: OfferCalculatorProps) {
  // Prislista-data från /api/admin/prislistor
  const [priceTable, setPriceTable] = useState<PriceFormValues | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<PriceCategoryKey>("bestallning");
  const [selectedBusType, setSelectedBusType] =
    useState<BusTypeKey>("turistbuss");
  const [kmBand, setKmBand] = useState<KmBandKey>("26_100");

  // Grundpriser (kan överstyras manuellt i fälten)
  const [kmPrice, setKmPrice] = useState<number>(0);
  const [hourDay, setHourDay] = useState<number>(0);
  const [hourEve, setHourEve] = useState<number>(0);
  const [hourWknd, setHourWknd] = useState<number>(0);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [includeServiceFee, setIncludeServiceFee] = useState<boolean>(true);
  const [serviceFeeMode, setServiceFeeMode] = useState<"perLeg" | "once">(
    "once"
  );
  const [vatRate, setVatRate] = useState<number>(0.06); // 6 % standard

  // Antal bussar & SynergyBus
  const [numBuses, setNumBuses] = useState<number>(1);
  const [useSynergy, setUseSynergy] = useState<boolean>(false);
  const [synergyPercent, setSynergyPercent] = useState<number>(0.07); // 7 %

  // Sträckor
  const [includeReturn, setIncludeReturn] = useState<boolean>(false);
  const [leg1, setLeg1] = useState<LegInput>({
    km: 0,
    hoursDay: 0,
    hoursEvening: 0,
    hoursWeekend: 0,
  });
  const [leg2, setLeg2] = useState<LegInput>({
    km: 0,
    hoursDay: 0,
    hoursEvening: 0,
    hoursWeekend: 0,
  });
  const [leg1Domain, setLeg1Domain] = useState<TripDomain>("sverige");
  const [leg2Domain, setLeg2Domain] = useState<TripDomain>("sverige");

  const [note, setNote] = useState<string>("");

  const [saving, setSaving] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const busesCount = numBuses > 0 ? numBuses : 1;
  const legsCount = 1 + (includeReturn ? 1 : 0);

  // Hämta prislistor vid start
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("/api/admin/prislistor");
        if (!res.ok) {
          console.error("Misslyckades läsa prislistor", res.status);
          return;
        }
        const json = await res.json();
        if (json && json.ok && json.prices) {
          setPriceTable(json.prices as PriceFormValues);
        }
      } catch (e) {
        console.error("Fel vid hämtning av prislistor", e);
      }
    }
    fetchPrices();
  }, []);

  // Knyt Resa: Sverige / Utomlands till moms:
  // Minst en sträcka i Sverige => 6 % moms, annars 0 %.
  useEffect(() => {
    const anySweden =
      leg1Domain === "sverige" ||
      (includeReturn && leg2Domain === "sverige");
    setVatRate(anySweden ? 0.06 : 0);
  }, [leg1Domain, leg2Domain, includeReturn]);

  // Applicera prisprofil när kategori / busstyp / km-band ändras
  useEffect(() => {
    if (!priceTable) return;
    const cat = priceTable[selectedCategory];
    if (!cat) return;
    const profile = cat[selectedBusType];
    if (!profile) return;

    setServiceFee(toNumber(profile.grundavgift));
    setHourDay(toNumber(profile.tim_vardag));
    setHourEve(toNumber(profile.tim_kvall));
    setHourWknd(toNumber(profile.tim_helg));

    let kmValue: string | undefined;
    switch (kmBand) {
      case "0_25":
        kmValue = profile.km_0_25;
        break;
      case "26_100":
        kmValue = profile.km_26_100;
        break;
      case "101_250":
        kmValue = profile.km_101_250;
        break;
      case "251_plus":
        kmValue = profile.km_251_plus;
        break;
    }
    setKmPrice(toNumber(kmValue));
  }, [priceTable, selectedCategory, selectedBusType, kmBand]);

  function legCost(input: LegInput): number {
    const kmCost = input.km * kmPrice;
    const dayCost = input.hoursDay * hourDay;
    const eveCost = input.hoursEvening * hourEve;
    const wkndCost = input.hoursWeekend * hourWknd;
    return kmCost + dayCost + eveCost + wkndCost;
  }

  // Per buss (exkl moms) per sträcka
  const exLeg1 = legCost(leg1);
  const exLeg2 = includeReturn ? legCost(leg2) : 0;

  // ✅ FIX: serviceFeeMode "perLeg" ska faktiskt påverka totalen
  const serviceFeePerBus =
    includeServiceFee
      ? serviceFeeMode === "once"
        ? serviceFee
        : serviceFee * legsCount
      : 0;

  const exVatPerBus = exLeg1 + exLeg2 + serviceFeePerBus;
  const vatPerBus = round2(exVatPerBus * vatRate);
  const totalPerBus = exVatPerBus + vatPerBus;

  // Alla bussar (bas)
  const baseExVatAll = exVatPerBus * busesCount;
  const baseVatAll = round2(baseExVatAll * vatRate);
  const baseTotalAll = baseExVatAll + baseVatAll;

  // Synergy (påslag/provision)
  const synergyRate = useSynergy ? synergyPercent : 0;
  const synergyMultiplier = synergyRate > 0 ? 1 / (1 - synergyRate) : 1;

  const finalExVatAll = round2(baseExVatAll * synergyMultiplier);
  const finalVatAll = round2(finalExVatAll * vatRate);
  const finalTotalAll = finalExVatAll + finalVatAll;

  function copyLeg1ToLeg2() {
    setLeg2(leg1);
    setLeg2Domain(leg1Domain);
    setIncludeReturn(true);
  }

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
        category: selectedCategory,
        busType: selectedBusType,
        kmBand,
        numBuses: busesCount,
        useSynergy,
        synergyPercent,
      },
      leg1: {
        ...leg1,
        domain: leg1Domain,
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

  // ✅ Det här är breakdown-formatet som din quote.ts vill ha
  function buildQuoteBreakdown() {
    // Fördela service fee per leg så att legs summerar till totalen
    const serviceLeg1Ex =
      includeServiceFee && serviceFeeMode === "once"
        ? serviceFee * busesCount
        : includeServiceFee && serviceFeeMode === "perLeg"
          ? serviceFee * busesCount
          : 0;

    const serviceLeg2Ex =
      includeReturn && includeServiceFee && serviceFeeMode === "perLeg"
        ? serviceFee * busesCount
        : 0;

    // Bas per leg (alla bussar)
    const baseLeg1Ex = exLeg1 * busesCount + serviceLeg1Ex;
    const baseLeg2Ex = includeReturn ? exLeg2 * busesCount + serviceLeg2Ex : 0;

    // Synergy: skala samma proportioner
    let leg1Ex = round2(baseLeg1Ex * synergyMultiplier);
    let leg2Ex = includeReturn ? round2(baseLeg2Ex * synergyMultiplier) : 0;

    // Rounding fix så att leg1+leg2 == finalExVatAll
    const sumLegsEx = leg1Ex + leg2Ex;
    const diffEx = round2(finalExVatAll - sumLegsEx);
    leg1Ex = round2(leg1Ex + diffEx);

    let leg1Vat = round2(leg1Ex * vatRate);
    let leg2Vat = includeReturn ? round2(leg2Ex * vatRate) : 0;

    // Rounding fix för moms
    const sumVat = leg1Vat + leg2Vat;
    const diffVat = round2(finalVatAll - sumVat);
    leg1Vat = round2(leg1Vat + diffVat);

    const legs = [
      {
        subtotExVat: leg1Ex,
        vat: leg1Vat,
        total: leg1Ex + leg1Vat,
      },
      ...(includeReturn
        ? [
            {
              subtotExVat: leg2Ex,
              vat: leg2Vat,
              total: leg2Ex + leg2Vat,
            },
          ]
        : []),
    ];

    return {
      grandExVat: finalExVatAll,
      grandVat: finalVatAll,
      grandTotal: finalTotalAll,
      serviceFeeExVat: includeServiceFee ? serviceFee : 0,
      legs,
    };
  }

  function buildQuotePayload(mode: "draft" | "send") {
    return {
      mode,
      input: buildInputPayload(),
      breakdown: buildQuoteBreakdown(),
      // optional override (quote.ts använder detta om du lägger in fixen nedan)
      customerEmail: customerEmail ?? undefined,
    };
  }

  async function saveDraft() {
    setSaving(true);
    setLastError(null);
    try {
      const payload = buildQuotePayload("draft");

      const res = await fetch(`/api/offers/${offerId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Kunde inte spara offertkalkylen (${res.status}): ${text}`
        );
      }

      setLastSavedAt(new Date().toLocaleTimeString("sv-SE"));
    } catch (e: any) {
      console.error("saveDraft error", e);
      setLastError(e?.message || "Något gick fel vid sparandet.");
    } finally {
      setSaving(false);
    }
  }

  async function sendProposal() {
    if (!customerEmail) {
      setLastError("Kundens e-postadress saknas – kan inte skicka förslag.");
      return;
    }

    setSending(true);
    setLastError(null);

    try {
      // ✅ Skicka via samma endpoint som sparar + sätter status=besvarad + mailar
      const payload = buildQuotePayload("send");

      const res = await fetch(`/api/offers/${offerId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Kunde inte skicka prisförslag (${res.status}): ${text}`
        );
      }
    } catch (e: any) {
      console.error("sendProposal error", e);
      setLastError(e?.message || "Något gick fel vid utskick.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#E3EBF2] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#194C66]">
            Offertkalkyl
          </h2>
          <p className="text-xs text-slate-500">
            Kopplad till prislistorna och anpassad för Helsingbuss.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            {offerNumber}
          </span>
          {lastSavedAt && (
            <span className="text-[11px] text-slate-500">
              Senast sparad: {lastSavedAt}
            </span>
          )}
        </div>
      </div>

      {/* Rad 1 – prislista & bussinställningar */}
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,3fr)]">
        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-[#194C66]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Prislista:</span>
            <select
              className="rounded-lg border border-[#D0DCE7] bg-white px-2 py-1 text-xs md:text-sm"
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as PriceCategoryKey)
              }
            >
              <option value="bestallning">Beställningstrafik</option>
              <option value="brollop">Bröllop</option>
              <option value="forening">Föreningar</option>
            </select>
            <select
              className="rounded-lg border border-[#D0DCE7] bg-white px-2 py-1 text-xs md:text-sm"
              value={selectedBusType}
              onChange={(e) =>
                setSelectedBusType(e.target.value as BusTypeKey)
              }
            >
              <option value="sprinter">Sprinter (upp till 19)</option>
              <option value="turistbuss">Turistbuss (upp till 39)</option>
              <option value="helturistbuss">Helturistbuss (upp till 63)</option>
              <option value="dubbeldackare">Dubbeldäckare (upp till 81)</option>
            </select>
            <select
              className="rounded-lg border border-[#D0DCE7] bg-white px-2 py-1 text-xs md:text-sm"
              value={kmBand}
              onChange={(e) => setKmBand(e.target.value as KmBandKey)}
            >
              <option value="0_25">0–25 km</option>
              <option value="26_100">26–100 km</option>
              <option value="101_250">101–250 km</option>
              <option value="251_plus">251+ km</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium">Antal bussar:</span>
            <input
              type="number"
              min={1}
              max={10}
              className="w-16 rounded-lg border border-[#D0DCE7] px-2 py-1 text-xs md:text-sm"
              value={busesCount}
              onChange={(e) =>
                setNumBuses(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">SynergyBus:</span>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                className="h-3 w-3 md:h-4 md:w-4 accent-[#007764]"
                checked={useSynergy}
                onChange={(e) => setUseSynergy(e.target.checked)}
              />
              <span className="text-xs md:text-sm">Aktivera provision</span>
            </label>
            <select
              className="rounded-lg border border-[#D0DCE7] bg-white px-2 py-1 text-xs md:text-sm disabled:opacity-40"
              disabled={!useSynergy}
              value={synergyPercent}
              onChange={(e) => setSynergyPercent(Number(e.target.value))}
            >
              <option value={0.07}>7%</option>
              <option value={0.09}>9%</option>
              <option value={0.11}>11%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rad 2 – prisparametrar */}
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <LabeledNumber
          label="Kilometerpris"
          suffix="kr/km"
          value={kmPrice}
          onChange={setKmPrice}
          min={0}
          step={1}
        />
        <LabeledNumber
          label="Timpris dag (vardag)"
          suffix="kr/tim"
          value={hourDay}
          onChange={setHourDay}
          min={0}
          step={1}
        />
        <LabeledNumber
          label="Timpris kväll"
          suffix="kr/tim"
          value={hourEve}
          onChange={setHourEve}
          min={0}
          step={1}
        />
        <LabeledNumber
          label="Timpris helg"
          suffix="kr/tim"
          value={hourWknd}
          onChange={setHourWknd}
          min={0}
          step={1}
        />
        <LabeledNumber
          label="Serviceavgift / grundavgift"
          suffix="kr"
          value={serviceFee}
          onChange={setServiceFee}
          min={0}
          step={100}
        />
      </div>

      {/* Rad 3 – inställningar */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs md:text-sm text-[#194C66]">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-3 w-3 md:h-4 md:w-4 accent-[#007764]"
            checked={includeServiceFee}
            onChange={(e) => setIncludeServiceFee(e.target.checked)}
          />
          <span>Ta med serviceavgift i beräkningen</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Hur ofta:</span>
          <button
            type="button"
            onClick={() => setServiceFeeMode("once")}
            className={`rounded-full px-3 py-1 text-xs ${
              serviceFeeMode === "once"
                ? "bg-[#007764] text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Per uppdrag
          </button>
          <button
            type="button"
            onClick={() => setServiceFeeMode("perLeg")}
            className={`rounded-full px-3 py-1 text-xs ${
              serviceFeeMode === "perLeg"
                ? "bg-[#007764] text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Per sträcka
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Moms (styrd av resa):</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] md:text-xs text-slate-700">
            {vatRate === 0.06 ? "6% – Sverige" : "0% – Utomlands"}
          </span>
        </div>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-3 w-3 md:h-4 md:w-4 accent-[#007764]"
            checked={includeReturn}
            onChange={(e) => setIncludeReturn(e.target.checked)}
          />
          <span>Inkludera returresa</span>
        </label>

        <button
          type="button"
          onClick={copyLeg1ToLeg2}
          className="rounded-full border border-[#D0DCE7] px-3 py-1 text-xs text-[#194C66] hover:bg-slate-50"
        >
          Kopiera utresa till retur
        </button>
      </div>

      {/* Sträckor */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <LegCard
          title="Utresa"
          leg={leg1}
          domain={leg1Domain}
          onChange={setLeg1}
          onChangeDomain={setLeg1Domain}
        />
        {includeReturn && (
          <LegCard
            title="Returresa"
            leg={leg2}
            domain={leg2Domain}
            onChange={setLeg2}
            onChangeDomain={setLeg2Domain}
          />
        )}
      </div>

      {/* Notering */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-[#194C66]">
          Intern notering / kommentar till priset
        </label>
        <textarea
          className="mt-1 w-full rounded-xl border border-[#D0DCE7] bg-slate-50 px-3 py-2 text-xs md:text-sm text-slate-800 outline-none focus:border-[#007764] focus:bg-white"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="T.ex. 'Pris baserat på 2 bussar, retur samma dag, provision SynergyBus 9 % inkluderad.'"
        />
      </div>

      {/* Summering & knappar */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4 border-t border-[#E3EBF2] pt-4">
        <div className="flex flex-wrap gap-4">
          <KPI label="Pris exkl. moms (alla bussar)" value={finalExVatAll} />
          <KPI label="Moms" value={finalVatAll} />
          <KPI label="Totalt pris inkl. moms" value={finalTotalAll} />
        </div>

        <div className="flex flex-col items-end gap-2 text-xs">
          {lastError && (
            <div className="max-w-xs rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {lastError}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="rounded-full border border-[#D0DCE7] px-4 py-2 text-xs font-medium text-[#194C66] hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? "Sparar…" : "Spara kalkyl"}
            </button>
            <button
              type="button"
              onClick={sendProposal}
              disabled={sending}
              className="rounded-full bg-[#007764] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#006555] disabled:opacity-60"
            >
              {sending ? "Skickar…" : "Skicka prisförslag till kund"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type LabeledNumberProps = {
  label: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

function LabeledNumber({
  label,
  suffix,
  value,
  onChange,
  min,
  max,
  step,
}: LabeledNumberProps) {
  return (
    <label className="flex flex-col gap-1 rounded-xl border border-[#E3EBF2] bg-slate-50 px-3 py-2 text-xs md:text-sm text-[#194C66]">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          className="w-full rounded-lg border border-[#D0DCE7] bg-white px-2 py-1 text-xs md:text-sm text-slate-800 outline-none focus:border-[#007764]"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
        />
        {suffix && (
          <span className="whitespace-nowrap text-[11px] md:text-xs text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

type LegCardProps = {
  title: string;
  leg: LegInput;
  domain: TripDomain;
  onChange: (leg: LegInput) => void;
  onChangeDomain: (domain: TripDomain) => void;
};

function LegCard({
  title,
  leg,
  domain,
  onChange,
  onChangeDomain,
}: LegCardProps) {
  function update<K extends keyof LegInput>(key: K, value: number) {
    onChange({ ...leg, [key]: value });
  }

  return (
    <div className="rounded-2xl border border-[#E3EBF2] bg-slate-50 px-3 py-3 md:px-4 md:py-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#194C66]">{title}</h3>
        <div className="flex items-center gap-2 text-[11px] md:text-xs text-slate-500">
          <span>Resa:</span>
          <button
            type="button"
            onClick={() => onChangeDomain("sverige")}
            className={`rounded-full px-2 py-1 ${
              domain === "sverige"
                ? "bg-[#007764] text-white"
                : "bg-white text-slate-600 border border-[#D0DCE7]"
            } text-[11px] md:text-xs`}
          >
            Sverige
          </button>
          <button
            type="button"
            onClick={() => onChangeDomain("utomlands")}
            className={`rounded-full px-2 py-1 ${
              domain === "utomlands"
                ? "bg-[#007764] text-white"
                : "bg-white text-slate-600 border border-[#D0DCE7]"
            } text-[11px] md:text-xs`}
          >
            Utomlands
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs md:text-sm text-[#194C66]">
        <label className="flex flex-col gap-1">
          <span>Kilometer</span>
          <input
            type="number"
            className="w-full rounded-lg border border-[#D0DCE7] bg-white px-2 py-1 text-xs md:text-sm text-slate-800 outline-none focus:border-[#007764]"
            value={leg.km || ""}
            onChange={(e) => update("km", Number(e.target.value) || 0)}
            min={0}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Timmar dag (vardag)</span>
          <input
            type="number"
            className="w-full rounded-lg border border-[#D0DCE7] bg-white px-2 py-1 text-xs md:text-sm text-slate-800 outline-none focus:border-[#007764]"
            value={leg.hoursDay || ""}
            onChange={(e) => update("hoursDay", Number(e.target.value) || 0)}
            min={0}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Timmar kväll</span>
          <input
            type="number"
            className="w-full rounded-lg border border-[#D0DCE7] bg-white px-2 py-1 text-xs md:text-sm text-slate-800 outline-none focus:border-[#007764]"
            value={leg.hoursEvening || ""}
            onChange={(e) =>
              update("hoursEvening", Number(e.target.value) || 0)
            }
            min={0}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Timmar helg</span>
          <input
            type="number"
            className="w-full rounded-lg border border-[#D0DCE7] bg-white px-2 py-1 text-xs md:text-sm text-slate-800 outline-none focus:border-[#007764]"
            value={leg.hoursWeekend || ""}
            onChange={(e) =>
              update("hoursWeekend", Number(e.target.value) || 0)
            }
            min={0}
          />
        </label>
      </div>
    </div>
  );
}

type KPIProps = {
  label: string;
  value: number;
};

function KPI({ label, value }: KPIProps) {
  return (
    <div className="min-w-[150px] rounded-2xl border border-[#E3EBF2] bg-slate-50 px-3 py-2 md:px-4 md:py-3">
      <div className="text-[11px] md:text-xs font-medium text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm md:text-base font-semibold text-[#194C66]">
        {sek(value)}
      </div>
    </div>
  );
}
