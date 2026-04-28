import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import TicketCard from "@/components/ticket/TicketCard";

export default function PayPage() {
  const router = useRouter();
  const { id } = router.query;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/tickets/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setTicket(data);
        setLoading(false);
      });
  }, [id]);

  async function handlePayment() {
    if (!ticket || paying) return;

    setPaying(true);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: ticket.total,
          bookingId: ticket.id,
          type: ticket.type,
        }),
      });

      const data = await res.json();

      // 🔥 Sätt som betald direkt (tillfällig lösning)
      await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: ticket.id,
        }),
      });

      // 🔥 Uppdatera UI direkt
      setTicket((prev: any) => ({
        ...prev,
        status: "paid",
      }));

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }

    } catch (err) {
      console.error(err);
      alert("Något gick fel vid betalning");
    } finally {
      setPaying(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Laddar...
      </div>
    );

  if (!ticket)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Ingen biljett hittades
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f5f4f0] p-6">

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6 items-start">

        {/* 🎟️ BILJETT */}
        <div>
          <TicketCard ticket={ticket} />
        </div>

        {/* 💳 BETALNING */}
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">

          <h1 className="text-xl font-semibold text-[#194C66]">
            Slutför betalning
          </h1>

          {/* STATUS */}
          <div className="text-sm">
            Status:{" "}
            <span
              className={
                ticket.status === "paid"
                  ? "text-green-600 font-medium"
                  : "text-red-500"
              }
            >
              {ticket.status === "paid" ? "Betald" : "Ej betald"}
            </span>
          </div>

          {/* PRODUKT */}
          <div className="border rounded-lg p-4 space-y-2">
            <p className="font-medium">{ticket.productName}</p>

            {ticket.date && (
              <p className="text-sm text-gray-500">
                Datum: {ticket.date}
              </p>
            )}

            {ticket.stop && (
              <p className="text-sm text-gray-500">
                Påstigning: {ticket.stop}
              </p>
            )}

            <p className="text-sm">Antal: {ticket.qty}</p>
          </div>

          {/* KUND */}
          <div className="border rounded-lg p-4 space-y-2">
            <p className="font-medium">Kund</p>
            <p className="text-sm">{ticket.customerName}</p>
            <p className="text-sm text-gray-500">
              {ticket.customerEmail}
            </p>
          </div>

          {/* TOTAL */}
          <div className="flex justify-between font-semibold text-lg border-t pt-4">
            <span>Totalt</span>
            <span>{ticket.total} kr</span>
          </div>

          {/* INFO */}
          <div className="text-xs text-gray-500">
            Betala med kort, Swish eller faktura via SumUp
          </div>

          {/* BETALA */}
          {ticket.status !== "paid" && (
            <button
              onClick={handlePayment}
              disabled={paying}
              className="w-full bg-[#194C66] text-white py-4 rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {paying ? "Bearbetar..." : `Betala nu (${ticket.total} kr)`}
            </button>
          )}

          {/* KLAR */}
          {ticket.status === "paid" && (
            <div className="bg-green-50 text-green-700 p-3 rounded text-sm">
              ✅ Betalning genomförd – visa QR-koden vid ombordstigning
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
