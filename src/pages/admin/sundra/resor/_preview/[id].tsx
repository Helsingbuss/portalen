import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getSupabaseClient } from "@/lib/sundra/supabaseClient";

export default function TripPreviewPage() {
  const router = useRouter();
  const id = router.query.id;

  const supabase = useMemo(() => getSupabaseClient(), []);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setErr("Supabase client saknas (env ej laddad i klienten).");
      setLoading(false);
      return;
    }
    if (!id || typeof id !== "string") return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data, error } = await supabase
          .from("trips")
          .select("*")
          .eq("id", id)
          .single();

        if (cancelled) return;

        if (error) throw error;
        setTrip(data);
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ?? "Kunde inte hämta resa.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  const media = (trip as any)?.media ?? {};
  const hero = media?.heroImageUrl || (trip as any)?.hero_image_url || null; // ifall du har annan kolumn senare
  const gallery = media?.gallery ?? [];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Förhandsgranska</div>
            <div className="text-xs text-gray-500">ID: {typeof id === "string" ? id : "—"}</div>
          </div>

          <Link
            href={typeof id === "string" ? `/admin/sundra/resor/${id}` : "/admin/sundra/resor"}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Tillbaka
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">Laddar…</div>
        ) : err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            {err}
            <div className="mt-3 text-sm text-red-600">
              Tips: Om du nyss laddade upp bilder – tryck <b>Spara</b> i editorn först så URL:erna hamnar i databasen.
            </div>
          </div>
        ) : !trip ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">Ingen resa hittades.</div>
        ) : (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-2xl font-bold">{trip.title ?? "—"}</div>
            {(trip.metaLine || trip.meta_line) ? (
              <div className="mt-1 text-sm text-gray-600">{trip.metaLine ?? trip.meta_line}</div>
            ) : null}

            {hero ? (
              <div className="mt-5 overflow-hidden rounded-2xl border bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero} alt="Hero" className="h-[360px] w-full object-cover" />
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border bg-gray-50 p-6 text-sm text-gray-600">
                Ingen hero-bild sparad ännu.
              </div>
            )}

            {trip.intro ? (
              <p className="mt-5 text-base text-gray-800">{trip.intro}</p>
            ) : null}

            {trip.description ? (
              <div className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{trip.description}</div>
            ) : null}

            {Array.isArray(gallery) && gallery.length ? (
              <div className="mt-6">
                <div className="mb-2 text-sm font-semibold">Galleri</div>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {gallery.map((g: any, idx: number) => (
                    <div key={`${g?.url ?? "x"}-${idx}`} className="overflow-hidden rounded-xl border bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={g.alt ?? ""} className="h-40 w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}


