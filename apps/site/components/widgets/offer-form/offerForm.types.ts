export type CustomerType = "privat" | "foretag" | "forening";
export type TripType = "oneway" | "roundtrip";

export type HeardFrom =
  | ""
  | "google"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "rekommendation"
  | "tidigare_kund"
  | "annan";

export type OfferFormStep = 1 | 2 | 3;

export type OfferFormFacilities = {
  wc: boolean;
  eluttag_usb: boolean;
  film_presentation: boolean;
  tillganglighet: boolean;
  bagage_extra: boolean;
};

export type OfferFormState = {
  // Steg 1
  fromAddress: string;
  toAddress: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  passengers: number | "";
  tripType: TripType;
  useBusOnSite: boolean;

  // Tur/Retur extra
  returnSwapRoute: boolean; // “vänd rutt?”
  returnFromAddress: string;
  returnToAddress: string;

  // Steg 2
  customerType: CustomerType;
  name: string;
  phone: string;
  email: string;
  onboardContact: string; // “kontaktperson ombord”

  orgName: string;
  orgNr: string;

  resPlan: string;

  facilities: OfferFormFacilities;
  accessibilityNotes: string;

  heardFrom: HeardFrom;
  newsletter: boolean;
};

export type OfferSubmitPayload = {
  source: "site_widget";
  state: OfferFormState;
  meta: {
    userAgent?: string;
    timezone?: string;
    url?: string;
  };
};

export type OfferSubmitResponse =
  | { ok: true; offerNo: string }
  | { ok: false; message: string; code?: string };
