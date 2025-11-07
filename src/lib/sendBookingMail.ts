// src/lib/sendBookingMail.ts
// Facade som alignar med nya sendMail.ts-API:t

import {
  sendBookingMail as coreSendBookingMail,
  customerBaseUrl,
} from "./sendMail";

export type SendBookingParams = {
  to: string;                       // kundens e-post
  bookingNumber: string;            // BK25xxxx
  mode: "created" | "updated";      // skapad / uppdaterad
  details?: {
    passengers?: number | null;
    from?: string | null;
    to?: string | null;
    date?: string | null;
    time?: string | null;
    freeTextHtml?: string;          // valfri egen text som HTML
  };
};

/**
 * Skicka bokningsmail via det nya gemensamma maillagret (sendMail.ts)
 */
export async function sendBookingMail(p: SendBookingParams) {
  return coreSendBookingMail(p.to, p.bookingNumber, p.mode, p.details);
}

// Exportera vidare så ev. gamla imports funkar
export { customerBaseUrl };
