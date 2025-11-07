import { sendBookingMail as coreSendBookingMail } from "@/lib/sendMail";

export type SendBookingParams = {
  to: string;
  bookingNumber: string;
  mode?: "created" | "updated";
  passengers?: number | null;
  out?: { date?: string | null; time?: string | null; from?: string | null; to?: string | null; };
  from?: string | null;
  to?: string | null;
  date?: string | null;
  time?: string | null;
  freeTextHtml?: string;
};

export async function sendBookingMail(p: SendBookingParams) {
  const mode = p.mode ?? "created";
  return coreSendBookingMail(
    p.to,
    p.bookingNumber,
    mode,
    {
      passengers: p.passengers ?? null,
      from: p.out?.from ?? p.from ?? null,
      to:   p.out?.to   ?? p.to   ?? null,
      date: p.out?.date ?? p.date ?? null,
      time: p.out?.time ?? p.time ?? null,
      freeTextHtml: p.freeTextHtml,
    }
  );
}
