// src/lib/sendBookingMail.ts
import { sendBookingMail as coreSendBookingMail } from "@/lib/sendMail";

export type SendBookingParams = {
  to: string;                 // kundens e-post
  bookingNumber: string;      // t.ex. BK25xxxx
  mode?: "created" | "updated";
  passengers?: number | null;

  // Din befintliga struktur i create.ts använder "out" { date, time, from, to }
  out?: {
    date?: string | null;
    time?: string | null;
    from?: string | null;
    toPlace?: string | null;
  };

  // fallback-fält om du råkar skicka dem platt
  from?: string | null;
  toPlace?: string | null;
  date?: string | null;
  time?: string | null;

  freeTextHtml?: string;      // valfri extra text
};

export async function sendBookingMail(p: SendBookingParams) {
  // behåll default-beteende: "created" om inget anges
  const mode = p.mode ?? "created";

  // mappa till den nya funktionen som tar positionella argument + details-objekt
  return coreSendBookingMail(
    p.to,
    p.bookingNumber,
    mode,
    {
      passengers: p.passengers ?? null,
      from: p.out?.from ?? p.from ?? null,
      to:   p.out?.to ?? p.toPlace ?? null,
      date: p.out?.date ?? p.date ?? null,
      time: p.out?.time ?? p.time ?? null,
      freeTextHtml: p.freeTextHtml,
    }
  );
}


