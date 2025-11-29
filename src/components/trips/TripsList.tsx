// src/components/trips/TripsList.tsx
import { useEffect, useState } from "react";
import { TripGrid, TripCardProps } from "./TripGrid";

type TripsListProps = {
  limit?: number;
};

export default function TripsList({ limit = 24 }: TripsListProps) {
  const [items, setItems] = useState<TripCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`/api/public/trips?limit=${limit}`);
        const j = await res.json();

        if (!res.ok || j.ok === false) {
          throw new Error(j?.error || "Kunde inte hämta resor.");
        }

        const trips = j.trips || [];

        const mapped: TripCardProps[] = trips.map((t: any) => {
          // formatera datum om det finns
          let nextDateText: string | null = null;
          if (t.next_date) {
            const d = new Date(t.next_date);
            if (!isNaN(d.getTime())) {
              nextDateText = d.toLocaleDateString("sv-SE", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              });
            } else {
              nextDateText = String(t.next_date);
            }
          }

          return {
            id: t.id,
            title: t.title,
            subtitle: t.subtitle || "",
            image: t.image || t.hero_image || null,
            ribbon: t.ribbon || null,
            badge: t.badge || t.trip_kind || null,
            city: t.city || null,
            country: t.country || null,
            year: t.year ?? null,
            price_from: t.price_from ?? null,
            next_date: nextDateText,
            href: t.external_url || (t.slug ? `/resor/${t.slug}` : undefined),

            // 👇 HÄR skickar vi in flaggan till kortet
            departures_coming_soon: !!t.departures_coming_soon,
          };
        });

        setItems(mapped);
      } catch (e: any) {
        setErr(e?.message || "Tekniskt fel.");
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  if (err) {
    return (
      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        {err}
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Laddar resor…</div>;
  }

  if (!items.length) {
    return (
      <div className="text-sm text-slate-500">
        Inga resor hittades just nu.
      </div>
    );
  }

  return <TripGrid items={items} columns={3} />;
}
