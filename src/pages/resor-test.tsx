// src/pages/resor-test.tsx
import Head from "next/head";
import TripCard from "@/components/trips/TripGrid"; // <-- default är TripCard i ditt repo

type TripKind = "flerdagar" | "dagsresa" | "shopping";

type DemoTrip = {
  id: string;
  title: string;
  subtitle?: string;
  headline?: string;
  image: string;
  banner?: { text: string };
  tripKind?: TripKind;
  location?: string;
  city?: string;
  country?: string;
  priceFrom?: number;
  nextDate?: string | null;
};

const DEMO: DemoTrip[] = [
  {
    id: "t1",
    title: "Gekås Ullared",
    headline: "Häng med till Gekås Ullared",
    image:
      "https://images.unsplash.com/photo-1501117716987-c8e4f3b4fb54?q=80&w=1680&auto=format&fit=crop",
    banner: { text: "Boka tidigt – spara upp till 25%" },
    tripKind: "shopping",
    location: "Sverige",
    priceFrom: 245,
    nextDate: null,
  },
  {
    id: "t2",
    title: "Julmarknad i Köpenhamn",
    subtitle: "Magisk dagsresa med glögg och gran",
    image:
      "https://images.unsplash.com/photo-1543055750-09c162766b9b?q=80&w=1680&auto=format&fit=crop",
    banner: { text: "Gör ett klipp!" },
    tripKind: "dagsresa",
    location: "Danmark",
    priceFrom: 498,
    nextDate: "2026-12-12",
  },
  {
    id: "t3",
    title: "Weekend i Prag",
    subtitle: "Kultur, mat och vackra vyer",
    image:
      "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=1680&auto=format&fit=crop",
    banner: { text: "Res 10 för 9!" },
    tripKind: "flerdagar",
    location: "Tjeckien",
    priceFrom: 3298,
    nextDate: "2026-05-09",
  },
];

function mapToCardProps(t: DemoTrip): any {
  return {
    id: t.id,
    title: t.title,
    subtitle: t.subtitle ?? t.headline ?? "",
    image: t.image,
    ribbon: t.banner?.text,
    badge: t.tripKind,
    city: t.city,
    country: t.country ?? t.location,
    price_from: t.priceFrom,
    next_date: t.nextDate ?? null,
  };
}

export default function ResorTestPage() {
  const items = DEMO.map(mapToCardProps);
  return (
    <>
      <Head>
        <title>Resor – Test</title>
      </Head>
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <div className="mx-auto max-w-6xl p-6">
          <h1 className="text-xl font-semibold text-[#194C66] mb-4">Resor (demo)</h1>

          {/* Enkel grid: byt 3 → 4/5 om du vill */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((p: any) => (
              <TripCard key={p.id} {...p} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
