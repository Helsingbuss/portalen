// src/pages/admin/priskalkylator.tsx
import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type PriceCategoryKey = "bestallning" | "brollop" | "forening";
type BusTypeKey = "sprinter" | "turistbuss" | "helturistbuss" | "dubbeldackare";
type KmIntervalKey = "0-25" | "26-100" | "101-250" | "251+";

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

type PriceFormValues = Record<
  PriceCategoryKey,
  Record<BusTypeKey, PriceFields>
>;

type PricesApiResponse =
  | { ok: true; prices: PriceFormValues }
  | { ok: false; error: string };

function toNumber(value: string | number | undefined | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(
    String(value)
      .replace(/\s/g, "")
      .replace(",", ".")
  );
  return Number.isFinite(n) ? n : 0;
}

export default function PrisKalkylatorPage() {
  const [prices, setPrices] = useState<PriceFormValues | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [category, setCategory] = useState<PriceCategoryKey>("bestallning");
  const [busType, setBusType] = useState<BusTypeKey>("sprinter");
  const [kmInterval, setKmInterval] = useState<KmIntervalKey>("0-25");

  const [travelScope, setTravelScope] = useState<"sverige" | "utomlands">(
    "sverige"
  );

  // Synergybus provision
  const [synergyEnabled, setSynergyEnabled] = useState(false);
  const [synergyPercent, setSynergyPercent] = useState<7 | 9 | 11>(7);

  // Utresa
  const [outHoursDay, setOutHoursDay] = useState(0);
  const [outHoursEvening, setOutHoursEvening] = useState(0);
  const [outHoursWeekend, setOutHoursWeekend] = useState(0);
  const [outDistanceKm, setOutDistanceKm] = useState(0);
  const [outServiceFee, setOutServiceFee] = useState(0);

  // Returresa (valfri)
  const [hasReturn, setHasReturn] = useState(false);
  const [retHoursDay, setRetHoursDay] = useState(0);
  const [retHoursEvening, setRetHoursEvening] = useState(0);
  const [retHoursWeekend, setRetHoursWeekend] = useState(0);
  const [retDistanceKm, setRetDistanceKm] = useState(0);
  const [retServiceFee, setRetServiceFee] = useState(0);

  const [numBuses, setNumBuses] = useState(1);
  const [internalNotes, setInternalNotes] = useState("");

  // Hämta prislistor
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingPrices(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/admin/prislistor");
        const json: PricesApiResponse = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(
            !json.ok ? ((json as any).error || "API-fel") : `Kunde inte läsa prislistor (status ${res.status})`
          );
        }
        if (!cancelled) setPrices(json.prices);
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || "Kunde inte läsa prislistor.");
        }
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPrice = useMemo<PriceFields | null>(() => {
    if (!prices) return null;
    return prices[category]?.[busType] ?? null;
  }, [prices, category, busType]);

  const kmPrice = useMemo(() => {
    if (!currentPrice) return 0;
    switch (kmInterval) {
      case "0-25":
        return toNumber(currentPrice.km_0_25);
      case "26-100":
        return toNumber(currentPrice.km_26_100);
      case "101-250":
        return toNumber(currentPrice.km_101_250);
      case "251+":
        return toNumber(currentPrice.km_251_plus);
      default:
        return 0;
    }
  }, [currentPrice, kmInterval]);

  const baseFee = useMemo(
    () => toNumber(currentPrice?.grundavgift),
    [currentPrice]
  );
  const hourDay = useMemo(
    () => toNumber(currentPrice?.tim_vardag),
    [currentPrice]
  );
  const hourEvening = useMemo(
    () => toNumber(currentPrice?.tim_kvall),
    [currentPrice]
  );
  const hourWeekend = useMemo(
    () => toNumber(currentPrice?.tim_helg),
    [currentPrice]
  );

  const copyOutToReturn = () => {
    setHasReturn(true);
    setRetHoursDay(outHoursDay);
    setRetHoursEvening(outHoursEvening);
    setRetHoursWeekend(outHoursWeekend);
    setRetDistanceKm(outDistanceKm);
    setRetServiceFee(outServiceFee);
  };

  // Grundpris exkl. moms (utan Synergybus)
  const basePricePerBusExclVat = useMemo(() => {
    const totalHoursDay = outHoursDay + (hasReturn ? retHoursDay : 0);
    const totalHoursEvening = outHoursEvening + (hasReturn ? retHoursEvening : 0);
    const totalHoursWeekend = outHoursWeekend + (hasReturn ? retHoursWeekend : 0);
    const totalDistanceKm = outDistanceKm + (hasReturn ? retDistanceKm : 0);
    const totalService = outServiceFee + (hasReturn ? retServiceFee : 0);

    const timeCost =
      totalHoursDay * hourDay +
      totalHoursEvening * hourEvening +
      totalHoursWeekend * hourWeekend;

    const distanceCost = kmPrice * totalDistanceKm;
    const total = baseFee + timeCost + distanceCost + totalService;

    return total > 0 ? total : 0;
  }, [
    baseFee,
    hourDay,
    hourEvening,
    hourWeekend,
    kmPrice,
    outHoursDay,
    outHoursEvening,
    outHoursWeekend,
    outDistanceKm,
    outServiceFee,
    hasReturn,
    retHoursDay,
    retHoursEvening,
    retHoursWeekend,
    retDistanceKm,
    retServiceFee,
  ]);

  // Synergybus-påslag
  const synergyRate = synergyEnabled ? synergyPercent / 100 : 0;
  const synergyAmountPerBus = Math.round(basePricePerBusExclVat * synergyRate);

  // Pris exkl. moms inkl. Synergybus
  const pricePerBusExclVat = basePricePerBusExclVat + synergyAmountPerBus;

  // Moms bara för Sverige
  const vatRate = 0.06;
  const vatPerBus =
    travelScope === "sverige"
      ? Math.round(pricePerBusExclVat * vatRate)
      : 0;

  const totalPerBus = pricePerBusExclVat + vatPerBus;

  const clampedBuses = Math.min(Math.max(numBuses || 1, 1), 5);
  const totalAllBuses = totalPerBus * clampedBuses;

  const categoryLabel: Record<PriceCategoryKey, string> = {
    bestallning: "Beställningstrafik",
    brollop: "Bröllop",
    forening: "Föreningar & supporterklubbar",
  };

  const busTypeLabel: Record<BusTypeKey, string> = {
    sprinter: "Sprinter (upp till 19 p)",
    turistbuss: "Turistbuss (upp till 39 p)",
    helturistbuss: "Helturistbuss (upp till 57 p)",
    dubbeldackare: "Dubbeldäckare (upp till 81 p)",
  };

  const kmIntervalLabel: Record<KmIntervalKey, string> = {
    "0-25": "0–25 km",
    "26-100": "26–100 km",
    "101-250": "101–250 km",
    "251+": "251+ km",
  };

  const travelScopeLabel: Record<"sverige" | "utomlands", string> = {
    sverige: "Resor inom Sverige",
    utomlands: "Resor utomlands",
  };

  return (
    <>
      <Header />
      <AdminMenu />

      <div className="page">
        <div className="page-inner max-w-6xl mx-auto">
          <div className="page-header">
            <div>
              <h1 className="page-title">Intern priskalkylator</h1>
              <p className="page-subtitle">
                Räkna fram ett rimligt pris baserat på dina prislistor. Inga
                värden sparas – du använder resultatet när du fyller i offert
                eller avtal.
              </p>
            </div>
          </div>

          <div className="layout">
            {/* Vänster del */}
            <div className="layout-main">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Beräkning</h2>
                  <p className="card-description">
                    Välj kategori, busstyp och km-intervall. Priserna hämtas
                    automatiskt från prislistorna.
                  </p>
                </div>
                <div className="card-body">
                  {/* Kategori / busstyp / km */}
                  <div className="grid-3">
                    <div className="field-group">
                      <label className="field-label">Kategori</label>
                      <select
                        className="field-input"
                        value={category}
                        onChange={(e) =>
                          setCategory(e.target.value as PriceCategoryKey)
                        }
                      >
                        <option value="bestallning">Beställningstrafik</option>
                        <option value="brollop">Bröllop</option>
                        <option value="forening">
                          Föreningar &amp; supporterklubbar
                        </option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Busstyp</label>
                      <select
                        className="field-input"
                        value={busType}
                        onChange={(e) =>
                          setBusType(e.target.value as BusTypeKey)
                        }
                      >
                        <option value="sprinter">
                          Sprinter (upp till 19 p)
                        </option>
                        <option value="turistbuss">
                          Turistbuss (upp till 39 p)
                        </option>
                        <option value="helturistbuss">
                          Helturistbuss (upp till 57 p)
                        </option>
                        <option value="dubbeldackare">
                          Dubbeldäckare (upp till 81 p)
                        </option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Km-intervall</label>
                      <select
                        className="field-input"
                        value={kmInterval}
                        onChange={(e) =>
                          setKmInterval(e.target.value as KmIntervalKey)
                        }
                      >
                        <option value="0-25">0–25 km</option>
                        <option value="26-100">26–100 km</option>
                        <option value="101-250">101–250 km</option>
                        <option value="251+">251+ km</option>
                      </select>
                    </div>
                  </div>

                  {/* Område / antal bussar / Synergybus */}
                  <div className="grid-3">
                    <div className="field-group">
                      <label className="field-label">Område</label>
                      <select
                        className="field-input"
                        value={travelScope}
                        onChange={(e) =>
                          setTravelScope(
                            e.target.value as "sverige" | "utomlands"
                          )
                        }
                      >
                        <option value="sverige">Resor inom Sverige</option>
                        <option value="utomlands">Resor utomlands</option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label className="field-label">Antal bussar (1–5)</label>
                      <input
                        className="field-input"
                        type="number"
                        min={1}
                        max={5}
                        value={numBuses}
                        onChange={(e) =>
                          setNumBuses(toNumber(e.target.value) || 1)
                        }
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Synergybus provision</label>
                      <div className="synergy-row">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={synergyEnabled}
                            onChange={(e) =>
                              setSynergyEnabled(e.target.checked)
                            }
                          />
                          Aktivera
                        </label>
                        <select
                          className="field-input synergy-select"
                          disabled={!synergyEnabled}
                          value={synergyPercent}
                          onChange={(e) =>
                            setSynergyPercent(
                              Number(e.target.value) as 7 | 9 | 11
                            )
                          }
                        >
                          <option value={7}>7 %</option>
                          <option value={9}>9 %</option>
                          <option value={11}>11 %</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Pris från prislista */}
                  <div className="grid-4">
                    <div className="field-group">
                      <label className="field-label">Timpris dag (kr/tim)</label>
                      <input
                        className="field-input"
                        type="number"
                        value={hourDay || ""}
                        readOnly
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">
                        Timpris kväll (kr/tim)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        value={hourEvening || ""}
                        readOnly
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">
                        Timpris helg (kr/tim)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        value={hourWeekend || ""}
                        readOnly
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">
                        Grundavgift per buss (kr)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        value={baseFee || ""}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="grid-3">
                    <div className="field-group">
                      <label className="field-label">
                        Km-pris (valt intervall) (kr/km)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        value={kmPrice || ""}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* UTRESA */}
                  <div className="section-header">
                    <h3 className="section-subtitle">Utresa</h3>
                  </div>

                  <div className="grid-3">
                    <div className="field-group">
                      <label className="field-label">Timmar dag</label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={outHoursDay || ""}
                        onChange={(e) =>
                          setOutHoursDay(toNumber(e.target.value))
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Timmar kväll</label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={outHoursEvening || ""}
                        onChange={(e) =>
                          setOutHoursEvening(toNumber(e.target.value))
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Timmar helg</label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={outHoursWeekend || ""}
                        onChange={(e) =>
                          setOutHoursWeekend(toNumber(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid-3">
                    <div className="field-group">
                      <label className="field-label">
                        Avstånd inom intervallet (km)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={outDistanceKm || ""}
                        onChange={(e) =>
                          setOutDistanceKm(toNumber(e.target.value))
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">
                        Serviceavgift (tillägg, kr)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={outServiceFee || ""}
                        onChange={(e) =>
                          setOutServiceFee(toNumber(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  {/* RETURRESA */}
                  <div className="section-header">
                    <h3 className="section-subtitle">
                      Returresa (valfritt – för tur &amp; retur)
                    </h3>
                    <button
                      type="button"
                      className="link-button"
                      onClick={copyOutToReturn}
                    >
                      Kopiera utresa → retur
                    </button>
                  </div>

                  <div className="grid-3">
                    <div className="field-group">
                      <label className="field-label">Timmar dag (retur)</label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={retHoursDay || ""}
                        onChange={(e) => {
                          setHasReturn(true);
                          setRetHoursDay(toNumber(e.target.value));
                        }}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">
                        Timmar kväll (retur)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={retHoursEvening || ""}
                        onChange={(e) => {
                          setHasReturn(true);
                          setRetHoursEvening(toNumber(e.target.value));
                        }}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">
                        Timmar helg (retur)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={retHoursWeekend || ""}
                        onChange={(e) => {
                          setHasReturn(true);
                          setRetHoursWeekend(toNumber(e.target.value));
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid-3">
                    <div className="field-group">
                      <label className="field-label">
                        Avstånd inom intervall (km, retur)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={retDistanceKm || ""}
                        onChange={(e) => {
                          setHasReturn(true);
                          setRetDistanceKm(toNumber(e.target.value));
                        }}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">
                        Serviceavgift (tillägg, kr – retur)
                      </label>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={retServiceFee || ""}
                        onChange={(e) => {
                          setHasReturn(true);
                          setRetServiceFee(toNumber(e.target.value));
                        }}
                      />
                    </div>
                  </div>

                  {/* Interna anteckningar */}
                  <div className="field-group">
                    <label className="field-label">
                      Interna anteckningar (för dig själv)
                    </label>
                    <textarea
                      className="field-input textarea"
                      rows={3}
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Ex. varför du satte ett visst pris, vad som ingår osv."
                    />
                  </div>

                  {loadingPrices && (
                    <p className="info-text">Laddar prislistor…</p>
                  )}
                  {loadError && (
                    <p className="error-text">
                      Kunde inte läsa prislistor: {loadError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Höger – summering */}
            <aside className="layout-aside">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Summering</h2>
                  <p className="card-description">
                    Pris per buss och totalsumma för alla bussar.
                  </p>
                </div>
                <div className="card-body">
                  <div className="summary-block">
                    <div className="summary-row">
                      <span>Grundpris exkl. moms (per buss)</span>
                      <strong>
                        {basePricePerBusExclVat.toLocaleString("sv-SE")} kr
                      </strong>
                    </div>
                    <div className="summary-row">
                      <span>
                        Synergybus provision{" "}
                        {synergyEnabled ? `(${synergyPercent} %)` : ""}
                      </span>
                      <strong>
                        {synergyAmountPerBus.toLocaleString("sv-SE")} kr
                      </strong>
                    </div>
                    <div className="summary-row">
                      <span>Pris exkl. moms inkl. provision (per buss)</span>
                      <strong>
                        {pricePerBusExclVat.toLocaleString("sv-SE")} kr
                      </strong>
                    </div>
                    <div className="summary-row">
                      <span>Moms 6% (per buss)</span>
                      <strong>{vatPerBus.toLocaleString("sv-SE")} kr</strong>
                    </div>
                    <div className="summary-row total">
                      <span>Totalt per buss inkl. moms</span>
                      <strong>
                        {totalPerBus.toLocaleString("sv-SE")} kr
                      </strong>
                    </div>
                  </div>

                  <div className="summary-block">
                    <div className="summary-row">
                      <span>Antal bussar</span>
                      <strong>{clampedBuses}</strong>
                    </div>
                    <div className="summary-row total">
                      <span>Totalsumma för alla bussar</span>
                      <strong>
                        {totalAllBuses.toLocaleString("sv-SE")} kr
                      </strong>
                    </div>
                  </div>

                  <div className="summary-meta">
                    <div>
                      <div className="meta-label">Kategori</div>
                      <div className="meta-value">
                        {categoryLabel[category]}
                      </div>
                    </div>
                    <div>
                      <div className="meta-label">Busstyp</div>
                      <div className="meta-value">
                        {busTypeLabel[busType]}
                      </div>
                    </div>
                    <div>
                      <div className="meta-label">Km-intervall</div>
                      <div className="meta-value">
                        {kmIntervalLabel[kmInterval]}
                      </div>
                    </div>
                    <div>
                      <div className="meta-label">Resupplägg</div>
                      <div className="meta-value">
                        {hasReturn ? "Tur & retur" : "Enkelresa"}
                      </div>
                    </div>
                    <div>
                      <div className="meta-label">Område</div>
                      <div className="meta-value">
                        {travelScopeLabel[travelScope]}
                      </div>
                    </div>
                    <div>
                      <div className="meta-label">Synergybus</div>
                      <div className="meta-value">
                        {synergyEnabled
                          ? `${synergyPercent} % provision inräknad`
                          : "Ej inräknad"}
                      </div>
                    </div>
                  </div>

                  <div className="info-box">
                    Den här kalkylatorn är bara ett{" "}
                    <strong>internt verktyg</strong>. Inga värden sparas eller
                    skickas till kund – du använder den för att hitta ett
                    rimligt pris utifrån dina prislistor och fyller sedan i
                    offerten manuellt.
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .page {
          padding: 80px 24px 28px;
        }

        .page-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 16px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .page-subtitle {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6b7280;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
          gap: 16px;
        }

        @media (max-width: 1024px) {
          .layout {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .layout-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .layout-aside {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .card-header {
          padding: 16px 20px 8px;
          border-bottom: 1px solid #f1f5f9;
        }

        .card-title {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
        }

        .card-description {
          margin: 4px 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .card-body {
          padding: 16px 20px 18px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 16px;
        }

        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px 16px;
        }

        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px 16px;
        }

        @media (max-width: 1024px) {
          .grid-4,
          .grid-3,
          .grid-2 {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .field-group {
          margin-bottom: 8px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #4b5563;
          margin-bottom: 4px;
        }

        .field-input {
          display: block;
          width: 100%;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          font-size: 13px;
          outline: none;
          background: #f9fafb;
        }

        .field-input:focus {
          border-color: #0b7a75;
          box-shadow: 0 0 0 1px rgba(11, 122, 117, 0.15);
          background: #ffffff;
        }

        .field-input.textarea {
          resize: vertical;
          min-height: 70px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          margin-bottom: 4px;
        }

        .section-subtitle {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .link-button {
          border: none;
          background: none;
          padding: 0;
          font-size: 12px;
          color: #0b7a75;
          cursor: pointer;
        }

        .link-button:hover {
          text-decoration: underline;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: #4b5563;
        }

        .checkbox-label input {
          margin-top: 2px;
        }

        .synergy-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .synergy-select {
          max-width: 90px;
        }

        .help-text {
          margin: 4px 0 0;
          font-size: 11px;
          color: #9ca3af;
        }

        .summary-block {
          border-radius: 12px;
          background: #f9fafb;
          padding: 10px 12px;
          margin-bottom: 10px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .summary-row.total {
          font-weight: 600;
        }

        .summary-row.total strong {
          font-size: 14px;
        }

        .summary-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 16px;
          margin: 10px 0 12px;
          font-size: 12px;
        }

        .meta-label {
          color: #9ca3af;
          margin-bottom: 2px;
        }

        .meta-value {
          font-weight: 500;
        }

        .info-box {
          font-size: 11px;
          color: #4b5563;
          background: #e0f2fe;
          border-radius: 10px;
          padding: 8px 10px;
        }

        .info-box strong {
          font-weight: 600;
        }

        .info-text {
          font-size: 12px;
          color: #4b5563;
          margin-top: 8px;
        }

        .error-text {
          font-size: 12px;
          color: #b91c1c;
          margin-top: 8px;
        }
      `}</style>
    </>
  );
}
