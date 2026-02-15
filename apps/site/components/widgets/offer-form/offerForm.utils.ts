import type { OfferFormState } from "./offerForm.types";

export function createDefaultState(): OfferFormState {
  return {
    fromAddress: "",
    toAddress: "",
    date: "",
    time: "",
    passengers: "",
    tripType: "oneway",
    useBusOnSite: false,

    returnSwapRoute: true,
    returnFromAddress: "",
    returnToAddress: "",

    customerType: "privat",
    name: "",
    phone: "",
    email: "",
    onboardContact: "",

    orgName: "",
    orgNr: "",

    resPlan: "",

    facilities: {
      wc: false,
      eluttag_usb: false,
      film_presentation: false,
      tillganglighet: false,
      bagage_extra: false,
    },
    accessibilityNotes: "",

    heardFrom: "",
    newsletter: false,
  };
}

export function computeReturnRoute(state: OfferFormState): { rf: string; rt: string } {
  // Om “vänd rutt?” = ja, skapa retur baserat på turens adresser
  if (state.tripType === "roundtrip" && state.returnSwapRoute) {
    return { rf: state.toAddress, rt: state.fromAddress };
  }
  // annars använd manuella retur-fält
  return { rf: state.returnFromAddress, rt: state.returnToAddress };
}

export function safeTrim(s: string): string {
  return (s ?? "").trim();
}

export function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
