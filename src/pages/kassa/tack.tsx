// src/pages/kassa/tack.tsx
import { GetServerSideProps, NextPage } from "next";
import { useState } from "react";
import Stripe from "stripe";

type BookingSummary = {
  tripTitle: string;
  date: string;
  departureTime: string | null;
  returnTime: string | null;
  quantity: number;
  totalAmountSek: number;
  currency: string;
  customerEmail: string | null;
  customerName: string | null;
};

type Props = {
  sessionId: string | null;
  error?: string | null;
  booking?: BookingSummary;
};

const TackSida: NextPage<Props> = ({ sessionId, error, booking }) => {
  const [accountState, setAccountState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [accountError, setAccountError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    if (!booking?.customerEmail) return;
    setAccountState("loading");
    setAccountError(null);

    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: booking.customerEmail,
          name: booking.customerName || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa konto.");
      }

      setAccountState("success");
    } catch (e: any) {
      setAccountState("error");
      setAccountError(e?.message || "Tekniskt fel vid skapande av konto.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6 md:p-8">
        {/* Header */}
        <div className="border-b pb-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Tack för din bokning!
            </h1>
            <p className="text-sm text-gray-600">
              Din betalning är genomförd och din e-biljett har skickats via e-post.
            </p>
          </div>
          {sessionId && (
            <p className="text-xs text-gray-400">
              Referens: <span className="font-mono">{sessionId}</span>
            </p>
          )}
        </div>

        {/* Felmeddelande om något gick snett */}
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold mb-1">Något gick fel</p>
            <p>{error}</p>
          </div>
        )}

        {/* Bokningsinfo */}
        {booking && !error && (
          <>
            <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Sammanfattning av din resa
              </h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-800">
                <div>
                  <dt className="font-medium text-gray-600">Resa</dt>
                  <dd>{booking.tripTitle}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Datum</dt>
                  <dd>{booking.date || "-"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Avgångstid</dt>
                  <dd>{booking.departureTime || "-"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Retur</dt>
                  <dd>{booking.returnTime || "-"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Antal resenärer</dt>
                  <dd>{booking.quantity}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Totalt pris</dt>
                  <dd>
                    {booking.totalAmountSek.toFixed(0)}{" "}
                    {booking.currency.toUpperCase()}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="font-medium text-gray-600">E-post för biljetten</dt>
                  <dd>{booking.customerEmail || "-"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-gray-500">
                Din e-biljett skickas till denna e-postadress. Kontrollera även skräppost
                om du inte hittar den.
              </p>
            </div>

            {/* Konto-ruta */}
            {booking.customerEmail && (
              <div className="mb-6 border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Skapa konto hos Helsingbuss
                </h2>
                <p className="text-sm text-gray-700 mb-3">
                  Vill du samla dina biljetter och bokningar på ett ställe?
                  Skapa ett konto med e-postadressen{" "}
                  <span className="font-mono font-medium">
                    {booking.customerEmail}
                  </span>{" "}
                  så kopplar vi dina bokningar till ditt konto.
                </p>

                {accountState === "success" ? (
                  <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <p className="font-semibold mb-1">
                      Kontot är skapat/uppdaterat.
                    </p>
                    <p>
                      Dina bokningar är nu kopplade till denna e-postadress. Du
                      kommer senare kunna logga in på{" "}
                      <span className="font-mono">Mitt konto</span> och se
                      dina resor.
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCreateAccount}
                      disabled={accountState === "loading"}
                      className="inline-flex items-center px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {accountState === "loading"
                        ? "Skapar konto..."
                        : "Skapa konto med denna e-post"}
                    </button>

                    {accountState === "error" && accountError && (
                      <p className="mt-2 text-sm text-red-600">
                        {accountError}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-gray-500">
                      Du kan också hoppa över detta steg nu och skapa konto
                      senare från vår hemsida.
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Liten avslutning */}
        <div className="mt-4 text-xs text-gray-500">
          <p>
            Har du frågor om din bokning? Kontakta oss gärna på{" "}
            <a
              href="mailto:info@helsingbuss.se"
              className="text-indigo-600 hover:underline"
            >
              info@helsingbuss.se
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { session_id } = ctx.query;

  if (!session_id || typeof session_id !== "string") {
    return {
      props: {
        sessionId: null,
        error: "Ingen Stripe-session hittades (saknar session_id i URL:en).",
      },
    };
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    return {
      props: {
        sessionId: session_id,
        error:
          "Stripe är inte korrekt konfigurerat (saknar STRIPE_SECRET_KEY).",
      },
    };
  }

  const stripe = new Stripe(stripeSecret);

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["customer_details"],
    });

    const md = session.metadata || {};

    const amountTotal = session.amount_total ?? 0;
    const totalAmountSek = amountTotal / 100;

    const booking: BookingSummary = {
      tripTitle: (md.trip_title as string) || "Bussresa",
      date: (md.date as string) || "",
      departureTime: (md.departure_time as string) || null,
      returnTime: (md.return_time as string) || null,
      quantity: md.quantity ? Number(md.quantity) : 1,
      totalAmountSek,
      currency: (session.currency || "sek").toUpperCase(),
      customerEmail:
        (session.customer_details?.email as string | null) ||
        (session.customer_email as string | null) ||
        (md.customer_email as string | null) ||
        null,
      customerName:
        (md.customer_name as string | null) ||
        (session.customer_details?.name as string | null) ||
        null,
    };

    return {
      props: {
        sessionId: session_id,
        booking,
        error: null,
      },
    };
  } catch (e: any) {
    console.error("tack getServerSideProps | stripe error", e);
    return {
      props: {
        sessionId: session_id,
        error:
          e?.message ||
          "Kunde inte läsa betalningen från Stripe. Kontakta gärna support om problemet kvarstår.",
      },
    };
  }
};

export default TackSida;
