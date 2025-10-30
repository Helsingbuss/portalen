// src/pages/bokning/[number].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import BookingConfirmation from "@/components/bookings/BookingConfirmation";

export default function BookingPublicPage() {
  const router = useRouter();
  const { number } = router.query as { number?: string };

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!number) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/bookings/by-number?num=${encodeURIComponent(number)}`);
        if (!res.ok) throw new Error("Kunde inte hämta bokningen");
        const j = await res.json();
        setBooking(j.booking);
      } catch (e: any) {
        setError(e?.message || "Fel vid hämtning");
      } finally {
        setLoading(false);
      }
    })();
  }, [number]);

  if (loading) return <div className="min-h-screen bg-[#f5f4f0] p-8">Laddar…</div>;
  if (error) return <div className="min-h-screen bg-[#f5f4f0] p-8 text-red-700">Fel: {error}</div>;
  if (!booking) return <div className="min-h-screen bg-[#f5f4f0] p-8">Hittade ingen bokning.</div>;

  return <BookingConfirmation booking={booking} />;
}
