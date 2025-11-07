// src/lib/pricing.ts
export type LegInput = {
  isDomestic: boolean;   // true = Sverige (6% moms), false = utland (0%)
  km: number;            // antal kilometer
  hoursDay: number;      // antal timmar dag
  hoursEvening: number;  // antal timmar kvÃ¤ll
  hoursWeekend: number;  // antal timmar helg
  discount: number;      // rabatt i SEK (exkl moms)
};

export type QuoteInput = {
  serviceFee: number;    // serviceavgift exkl moms
  legs: LegInput[];      // 1 (enkel) eller 2 (tur & retur)
};

// *** ENKEL PRISLISTA (byt ut mot din riktiga nÃ¤r du vill) ***
export const PRICE = {
  perKm: 9.90,            // SEK / km
  perHourDay: 300,      // SEK / h
  perHourEvening: 345,  // SEK / h
  perHourWeekend: 395,  // SEK / h
  vatDomestic: 0.06,    // 6% moms i Sverige
  vatForeign: 0.0,      // 0% utland
};

export type QuoteBreakdown = {
  legs: Array<{
    subtotExVat: number;
    vat: number;
    total: number;
  }>;
  serviceFeeExVat: number;
  serviceFeeVat: number;      // 0% (Ã¤ndra hÃ¤r om du vill momsÃ¤tta service)
  serviceFeeTotal: number;
  grandExVat: number;
  grandVat: number;
  grandTotal: number;
};

// Ren, bestÃ¤md kalkyl (inga side effects)
export function calcLegExVat(leg: LegInput): number {
  const km = Math.max(0, leg.km);
  const d  = Math.max(0, leg.hoursDay);
  const e  = Math.max(0, leg.hoursEvening);
  const w  = Math.max(0, leg.hoursWeekend);

  const kmCost   = km * PRICE.perKm;
  const dayCost  = d  * PRICE.perHourDay;
  const eveCost  = e  * PRICE.perHourEvening;
  const wkdCost  = w  * PRICE.perHourWeekend;

  const brutto   = kmCost + dayCost + eveCost + wkdCost;
  const rabatt   = Math.max(0, leg.discount || 0);
  return Math.max(0, brutto - rabatt); // exkl moms
}

export function calcQuote(input: QuoteInput): QuoteBreakdown {
  const legs = input.legs.map((leg) => {
    const ex = calcLegExVat(leg);
    const vatRate = leg.isDomestic ? PRICE.vatDomestic : PRICE.vatForeign;
    const vat = ex * vatRate;
    return {
      subtotExVat: round(ex),
      vat: round(vat),
      total: round(ex + vat),
    };
  });

  const serviceFeeExVat = Math.max(0, input.serviceFee || 0);
  const serviceFeeVat   = 0; // sÃ¤tt t.ex. 0.25 om service ska ha 25% moms
  const serviceFeeTotal = round(serviceFeeExVat + serviceFeeVat);

  const legsEx = legs.reduce((a, b) => a + b.subtotExVat, 0);
  const legsVat = legs.reduce((a, b) => a + b.vat, 0);

  const grandExVat = round(legsEx + serviceFeeExVat);
  const grandVat   = round(legsVat + serviceFeeVat);
  const grandTotal = round(grandExVat + grandVat);

  return {
    legs,
    serviceFeeExVat: round(serviceFeeExVat),
    serviceFeeVat: round(serviceFeeVat),
    serviceFeeTotal,
    grandExVat,
    grandVat,
    grandTotal,
  };
}

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

