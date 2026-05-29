import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { Check, Copy, CalendarDays, MapPin, Users, Wallet, Download, Printer, Ticket, ShieldCheck, Clock3, BusFront, Flag, Undo2, UserRound, Armchair, BadgeCheck, Mail, Phone, CreditCard, ContactRound, Info as InfoIcon, QrCode, Luggage, CigaretteOff, Timer, MapPinned, Headphones, ExternalLink, MessageCircle } from "lucide-react";

type Passenger = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  passenger_type?: string | null;
  date_of_birth?: string | null;
  special_requests?: string | null;
  seat_number?: string | null;
};

type Booking = {
  id: string;
  booking_number?: string | null;
  status?: string | null;
  payment_status?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  passengers_count?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  notes?: string | null;
  sundra_trips?: {
    id: string;
    title?: string | null;
    slug?: string | null;
    destination?: string | null;
    image_url?: string | null;
    currency?: string | null;
  } | null;
  sundra_line_stops?: {
    id?: string | null;
    stop_name?: string | null;
    stop_city?: string | null;
    departure_time?: string | null;
    price?: number | null;
    order_index?: number | null;
  } | null;
  pickup_stop_name?: string | null;
  pickup_stop_city?: string | null;
  pickup_time?: string | null;
  pickup_place?: string | null;
  selected_stop_name?: string | null;
  selected_pickup_stop?: string | null;
  sundra_departures?: {
    id: string;
    departure_date?: string | null;
    departure_time?: string | null;
    return_date?: string | null;
    return_time?: string | null;
    price?: number | null;
  } | null;
  sundra_booking_passengers?: Passenger[];
};

function money(value?: number | null, currency = "SEK") {
  if (value == null) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function passengerTypeLabel(type?: string | null) {
  const value = String(type || "").toLowerCase();

  if (value === "adult" || value === "vuxen") return "Vuxen";
  if (value === "child" || value === "barn") return "Barn";
  if (value === "youth" || value === "ungdom") return "Ungdom";
  if (value === "student") return "Student";
  if (value === "senior") return "Senior";

  return type || "Resenär";
}

function paymentLabel(status?: string | null) {
  switch (status) {
    case "paid":
      return "Betald";
    case "pending":
    case "pending_payment":
      return "Inväntar betalning";
    case "unpaid":
      return "Obetald";
    case "cancelled":
      return "Avbruten";
    default:
      return status || "—";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700";
    case "pending":
    case "pending_payment":
    case "unpaid":
      return "bg-amber-100 text-amber-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function MyBookingPage() {
  const router = useRouter();
  const { bookingNumber } = router.query;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedBooking, setCopiedBooking] = useState(false);

  useEffect(() => {
    if (!bookingNumber || typeof bookingNumber !== "string") return;
    loadBooking(bookingNumber);
  }, [bookingNumber]);

  async function loadBooking(number: string) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/public/sundra/bookings/by-number/${encodeURIComponent(number)}`
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta bokningen.");
      }

      setBooking(json.booking);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eef8fb_0,#f8fafc_42%,#f4f6f8_100%)] p-6 text-[#0f172a]">
        <div className="mx-auto w-full max-w-[1180px] rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          Laddar bokning...
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eef8fb_0,#f8fafc_42%,#f4f6f8_100%)] p-6 text-[#0f172a]">
        <div className="mx-auto w-full max-w-[1180px] rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <h1 className="text-xl font-semibold text-red-700">
            {error || "Bokningen hittades inte."}
          </h1>

          <button
            onClick={() => router.push("/vara-resor")}
            className="mt-5 rounded-full bg-[#194C66] px-5 py-3 text-sm font-semibold text-white"
          >
            Tillbaka till resor
          </button>
        </div>
      </div>
    );
  }

  const bookingAny = booking as any;
  const trip = booking.sundra_trips;
  const departure = booking.sundra_departures;
  const departureAny = departure as any;
  const pickupStop = booking.sundra_line_stops;
  const pickupName =
    pickupStop?.stop_name ||
    booking.pickup_stop_name ||
    booking.pickup_place ||
    booking.selected_stop_name ||
    booking.selected_pickup_stop ||
    null;
  const pickupCity = pickupStop?.stop_city || booking.pickup_stop_city || null;
  const pickupTime =
    pickupStop?.departure_time ||
    booking.pickup_time ||
    departure?.departure_time ||
    null;
  const pickupText = pickupName
    ? `${pickupName}${pickupCity ? `, ${pickupCity}` : ""}${pickupTime ? ` kl. ${fmtTime(pickupTime)}` : ""}`
    : "Ej angivet";
  const passengers = booking.sundra_booking_passengers || [];
  const currency = booking.currency || trip?.currency || "SEK";
  const ticketUrl = `/api/public/sundra/bookings/${booking.id}/ticket`;


  const ticketSeatLabel =
    passengers
      .map((p: any) => p.seat_number || p.seat || p.seat_label)
      .filter(Boolean)
      .join(", ") || "Ej valt";

  const ticketPickupLabel =
    pickupText && pickupText !== "Ej angivet"
      ? pickupText
      : pickupName || pickupCity || booking.pickup_stop_name || booking.pickup_place || "Ej angivet";

  const ticketStatusIsPaid = booking.payment_status === "paid";

  const helpMapQuery =
    pickupText && pickupText !== "Ej angivet"
      ? pickupText
      : pickupName || pickupCity || "Helsingborg";

  const helpMapUrl =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(helpMapQuery);

  const helpEmailUrl =
    "mailto:info@helsingbuss.se?subject=" +
    encodeURIComponent("Fråga om bokning " + (booking.booking_number || ""));


  const customerNameLabel = booking.customer_name || "Ej angivet";
  const customerEmailLabel = booking.customer_email || "Ej angivet";
  const customerPhoneLabel = booking.customer_phone || "Ej angivet";
  const customerPaymentLabel = paymentLabel(booking.payment_status);


  const timelinePickupTitle = pickupName || "Upphämtningsplats";
  const timelinePickupSub =
    pickupCity || booking.pickup_stop_city || "Se information i bokningen";

  const timelineMeetingText =
    pickupTime
      ? fmtDate(departure?.departure_date) + " kl. " + fmtTime(pickupTime)
      : "Var på plats i god tid";

  const timelineDepartureText =
    fmtDate(departure?.departure_date) + " kl. " + fmtTime(departure?.departure_time);

  const timelineReturnText =
    fmtDate(departure?.return_date) + " kl. " + fmtTime(departure?.return_time);

  const timelineDestinationTitle =
    trip?.destination || departureAny?.destination_location || "Destination";

  const timelineDestinationSub =
    departureAny?.destination_address || departureAny?.arrival_place || "Resans destination";


  async function handleCopyBookingNumber() {
    try {
      await navigator.clipboard.writeText(String(booking.booking_number || ""));
      setCopiedBooking(true);
      setTimeout(() => setCopiedBooking(false), 1800);
    } catch (error) {
      console.error("Kunde inte kopiera bokningsnummer", error);
    }
  }

  const heroPassengerCount =
    Number(booking.passengers_count || passengers.length || 1) || 1;

  const heroPassengerLabel =
    heroPassengerCount === 1 ? "1 st" : heroPassengerCount + " st";

  const bookingCalculatedTotal =
    (Number(bookingAny.subtotal || 0) || 0) +
    (Number(bookingAny.options_total || 0) || 0) +
    (Number(bookingAny.room_total || 0) || 0) +
    (Number(bookingAny.seat_extra_total || 0) || 0) -
    (Number(bookingAny.discount_amount || 0) || 0);

  const bookingFallbackUnitPrice =
    Number(departureAny?.price || 0) ||
    Number((trip as any)?.price_from || 0) ||
    0;

  const heroTotalAmount =
    Number(booking.total_amount || 0) ||
    bookingCalculatedTotal ||
    bookingFallbackUnitPrice * Math.max(heroPassengerCount, 1) ||
    0;

  const heroTotalPrice =
    heroTotalAmount > 0
      ? heroTotalAmount.toLocaleString("sv-SE") + " " + (currency === "SEK" ? "kr" : currency)
      : "0 kr";

  const heroDestination =
    trip?.destination || departureAny?.destination_location || "Destination";

  const heroTitle = trip?.title || "Din Sundra-resa";

  const heroDepartureText =
    fmtDate(departure?.departure_date) + " kl. " + fmtTime(departure?.departure_time);

  const heroReturnText =
    fmtDate(departure?.return_date) + " kl. " + fmtTime(departure?.return_time);

  const heroStatusText = paymentLabel(booking.payment_status);

  const heroIsPaid = booking.payment_status === "paid";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eef8fb_0,#f8fafc_42%,#f4f6f8_100%)] text-[#0f172a]">
      <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-6">
          <div className="inline-flex items-center rounded-full border border-[#cfe7ee] bg-white/80 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.18em] text-[#00645d] shadow-sm">
            Sundra resor
          </div>

          <h1 className="mt-3 text-[34px] font-black tracking-[-0.04em] text-[#0f2f46] sm:text-[42px]">
            Min bokning
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
            Här hittar du alla detaljer om din bokade resa, din biljett, upphämtning och viktig information inför avresa.
          </p>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="grid min-h-[265px] lg:grid-cols-[330px_minmax(0,1fr)]">
            <div className="relative min-h-[235px] overflow-hidden bg-[#0f2f46] lg:min-h-full">
              {trip?.image_url ? (
                <Image
                  src={trip.image_url}
                  alt={heroTitle}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full min-h-[235px] items-center justify-center bg-gradient-to-br from-[#0f2f46] to-[#00645d] text-sm font-bold text-white">
                  Sundra by Helsingbuss
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#061826]/45 via-transparent to-transparent" />
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-[#063547] via-[#0b4256] to-[#07283a] p-6 text-white sm:p-8">
              <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#6fd6ca]/20 blur-3xl" />
              <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-[#ffffff]/10 blur-3xl" />

              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div
                  className={
                    heroIsPaid
                      ? "inline-flex items-center gap-2 rounded-full bg-[#2fbf71] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-950/20"
                      : "inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-800"
                  }
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {heroStatusText}
                </div>

                <div className="flex items-center gap-2 text-right text-xs text-white/75">
                  <div>
                    <span>Bokningsnummer </span>
                    <span className="font-semibold text-white">
                      {booking.booking_number || "—"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyBookingNumber}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                    title="Kopiera bokningsnummer"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {copiedBooking && (
                <div className="relative mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white/95">
                  Bokningsnummer kopierat
                </div>
              )}

              <div className="relative mt-8 max-w-2xl">
                <h2 className="text-[28px] font-bold leading-[1.18] tracking-[-0.025em] text-white sm:text-[34px]">
                  {heroTitle}
                </h2>
              </div>

              <div className="relative mt-7 h-px bg-white/12" />

              <div className="relative mt-6 grid gap-5 text-white sm:grid-cols-2 xl:grid-cols-5">
                <div className="flex min-w-0 items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/75" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Destination
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold leading-5 text-white">
                      {heroDestination}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-white/75" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Avresa
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-5 text-white">
                      {heroDepartureText}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-white/75" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Retur
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-5 text-white">
                      {heroReturnText}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-white/75" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Resenärer
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-5 text-white">
                      {heroPassengerLabel}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 items-start gap-3">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-white/75" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Totalpris
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-5 text-white">
                      {heroTotalPrice}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="order-2 space-y-6 lg:order-1">
            <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em] text-[#0f2f46]">
                    Reseinformation
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Här ser du resans viktigaste tider och platser.
                  </p>
                </div>

                <div className="rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-semibold text-[#00645d]">
                  Din resa steg för steg
                </div>
              </div>

              <div className="mt-8 overflow-hidden">
                <div className="grid gap-5 md:grid-cols-5">
                  <div className="relative rounded-2xl bg-[#f8fbfc] p-4">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#cfe7ee] bg-white text-[#0f6b73] shadow-sm">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Upphämtning
                    </div>
                    <div className="mt-2 text-sm font-bold text-[#0f2f46]">
                      {timelinePickupTitle}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {timelinePickupSub}
                    </div>
                  </div>

                  <div className="relative rounded-2xl bg-[#f8fbfc] p-4">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#cfe7ee] bg-white text-[#0f6b73] shadow-sm">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Samlingstid
                    </div>
                    <div className="mt-2 text-sm font-bold text-[#0f2f46]">
                      {timelineMeetingText}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Var på plats i god tid.
                    </div>
                  </div>

                  <div className="relative rounded-2xl bg-[#f8fbfc] p-4">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#cfe7ee] bg-white text-[#0f6b73] shadow-sm">
                      <BusFront className="h-5 w-5" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Avgång
                    </div>
                    <div className="mt-2 text-sm font-bold text-[#0f2f46]">
                      {timelineDepartureText}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Bussen avgår enligt tidtabell.
                    </div>
                  </div>

                  <div className="relative rounded-2xl bg-[#f8fbfc] p-4">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#cfe7ee] bg-white text-[#0f6b73] shadow-sm">
                      <Flag className="h-5 w-5" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Destination
                    </div>
                    <div className="mt-2 text-sm font-bold text-[#0f2f46]">
                      {timelineDestinationTitle}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {timelineDestinationSub}
                    </div>
                  </div>

                  <div className="relative rounded-2xl bg-[#f8fbfc] p-4">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#cfe7ee] bg-white text-[#0f6b73] shadow-sm">
                      <Undo2 className="h-5 w-5" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Retur
                    </div>
                    <div className="mt-2 text-sm font-bold text-[#0f2f46]">
                      {timelineReturnText}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Beräknad hemresa.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em] text-[#0f2f46]">
                    Beställare & kontakt
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Kontaktuppgifter för bokningen och betalstatus.
                  </p>
                </div>

                <div className="rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-semibold text-[#00645d]">
                  Bokningskontakt
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[18px] border border-slate-100 bg-[#f8fbfc] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                      <ContactRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Namn
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-[#0f2f46]">
                        {customerNameLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-100 bg-[#f8fbfc] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                      <Mail className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        E-post
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-[#0f2f46]">
                        {customerEmailLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-100 bg-[#f8fbfc] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                      <Phone className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Telefon
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-[#0f2f46]">
                        {customerPhoneLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-100 bg-[#f8fbfc] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                      <CreditCard className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Betalstatus
                      </div>
                      <div className="mt-1">
                        <span
                          className={
                            ticketStatusIsPaid
                              ? "inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                              : "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                          }
                        >
                          {ticketStatusIsPaid && <Check className="h-3.5 w-3.5" />}
                          {customerPaymentLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em] text-[#0f2f46]">
                    Resenärer
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Här visas alla personer som ingår i bokningen.
                  </p>
                </div>

                <div className="rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-semibold text-[#00645d]">
                  {heroPassengerLabel}
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[20px] border border-slate-100">
                <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr] gap-4 border-b border-slate-100 bg-[#f8fbfc] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 md:grid">
                  <div>Namn</div>
                  <div>Biljettyp</div>
                  <div>Plats / Säte</div>
                </div>

                {passengers.length === 0 ? (
                  <div className="flex items-center gap-3 px-5 py-5 text-sm text-slate-500">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef8fb] text-[#00645d]">
                      <UserRound className="h-5 w-5" />
                    </div>
                    Inga resenärer är registrerade på bokningen ännu.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {passengers.map((passenger: any, index: number) => {
                      const passengerName =
                        [passenger.first_name, passenger.last_name]
                          .filter(Boolean)
                          .join(" ")
                          .trim() ||
                        passenger.name ||
                        passenger.full_name ||
                        "Resenär " + (index + 1);

                      const passengerSeat =
                        passenger.seat_number ||
                        passenger.seat ||
                        passenger.seat_label ||
                        "Ej valt";

                      return (
                        <div
                          key={passenger.id || index}
                          className="grid gap-4 px-5 py-4 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:items-center"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef8fb] text-[#00645d]">
                              <UserRound className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 md:hidden">
                                Namn
                              </div>
                              <div className="truncate text-sm font-semibold text-[#0f2f46]">
                                {passengerName}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 md:block">
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 md:hidden">
                              Biljettyp
                            </div>

                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-semibold text-[#0f2f46]">
                              <BadgeCheck className="h-3.5 w-3.5 text-[#00645d]" />
                              {passengerTypeLabel(passenger.passenger_type)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 md:block">
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 md:hidden">
                              Plats / Säte
                            </div>

                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0f2f46] px-3 py-1 text-xs font-semibold text-white">
                              <Armchair className="h-3.5 w-3.5" />
                              {passengerSeat}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
            <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em] text-[#0f2f46]">
                    Bra att veta
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Viktig information inför din resa.
                  </p>
                </div>

                <div className="rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-semibold text-[#00645d]">
                  Inför avresa
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[18px] border border-slate-100 bg-[#f8fbfc] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                      <Timer className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-[#0f2f46]">
                        Kom i god tid
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Var gärna på upphämtningsplatsen minst 10 minuter innan avgång.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-100 bg-[#f8fbfc] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                      <QrCode className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-[#0f2f46]">
                        Ha biljetten redo
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Visa biljetten eller QR-koden för chauffören vid påstigning.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-100 bg-[#f8fbfc] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                      <Luggage className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-[#0f2f46]">
                        Bagage
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Ta med normalt resebagage och märk gärna väskor med namn.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-100 bg-[#f8fbfc] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                      <CigaretteOff className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-[#0f2f46]">
                        Rökfritt ombord
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Alla våra resor är rökfria för en trygg och bekväm resa.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[18px] bg-[#eef8fb] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                    <InfoIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-[#0f2f46]">
                      Behöver du hjälp?
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Kontakta oss om något i bokningen inte stämmer eller om du har frågor inför resan.
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </section>

          <aside className="order-1 space-y-5 lg:sticky lg:top-6 lg:order-2">
            <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em] text-[#0f2f46]">
                    Din biljett
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Samlad biljett och reseöversikt.
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#063547] text-white shadow-lg shadow-slate-900/10">
                  <Ticket className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="text-sm font-medium text-slate-500">
                    Bokningsnummer
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBookingNumber}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f2f46] transition hover:text-[#00645d]"
                    title="Kopiera bokningsnummer"
                  >
                    {booking.booking_number || "—"}
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="text-sm font-medium text-slate-500">
                    Status
                  </span>
                  <span
                    className={
                      ticketStatusIsPaid
                        ? "inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                        : "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                    }
                  >
                    {ticketStatusIsPaid && <Check className="h-3.5 w-3.5" />}
                    {paymentLabel(booking.payment_status)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="text-sm font-medium text-slate-500">
                    Resenärer
                  </span>
                  <span className="text-sm font-semibold text-[#0f2f46]">
                    {heroPassengerLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="text-sm font-medium text-slate-500">
                    Plats / Säte
                  </span>
                  <span className="rounded-full bg-[#e7f3f6] px-3 py-1 text-sm font-semibold text-[#0f2f46]">
                    {ticketSeatLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="text-sm font-medium text-slate-500">
                    Upphämtning
                  </span>
                  <span className="max-w-[160px] truncate text-right text-sm font-semibold text-[#0f2f46]">
                    {ticketPickupLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-base font-semibold text-[#0f2f46]">
                    Totalt pris
                  </span>
                  <span className="text-xl font-bold text-[#0f2f46]">
                    {heroTotalPrice}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <a
                  href={ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#063547] to-[#00645d] px-5 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(0,100,93,0.22)] transition hover:translate-y-[-1px]"
                >
                  <Download className="h-4 w-4" />
                  Ladda ner biljett
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-[#0f2f46] transition hover:bg-slate-50"
                >
                  <Printer className="h-4 w-4" />
                  Skriv ut
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-[#eef8fb] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#00645d] shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-[#0f2f46]">
                      Trygg och säker resa
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Tack för att du reser med Sundra. Vi önskar dig en trevlig resa!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          
            <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef8fb] text-[#00645d]">
                  <MapPinned className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-bold tracking-[-0.02em] text-[#0f2f46]">
                    Var står bussen?
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Se upphämtningsplatsen på karta och kontrollera var du ska stå inför avgång.
                  </p>

                  <a
                    href={helpMapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#eef8fb] px-4 py-2 text-sm font-semibold text-[#00645d] transition hover:bg-[#dff2f5] sm:w-auto"
                  >
                    Visa på karta
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef8fb] text-[#00645d]">
                  <Headphones className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-bold tracking-[-0.02em] text-[#0f2f46]">
                    Behöver du hjälp?
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Kontakta oss om du har frågor om bokningen, upphämtning, tider eller biljetten.
                  </p>

                  <a
                    href={helpEmailUrl}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#063547] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00645d] sm:w-auto"
                  >
                    Kontakta oss
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
</aside>
        </div>
      </main>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <h2 className="text-xl font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-[#f8fafc] p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 break-words font-semibold text-[#0f172a]">
        {value || "—"}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold">{value || "—"}</span>
    </div>
  );
}
