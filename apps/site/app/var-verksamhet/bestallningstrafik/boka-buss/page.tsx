import OfferFormWidget from "@/components/widgets/offer-form/OfferFormWidget";

function toInt(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  if (n < 1) return 1;
  if (n > 999) return 999;
  return Math.round(n);
}

export default function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const tripType = Array.isArray(searchParams?.tripType) ? searchParams?.tripType[0] : searchParams?.tripType;
  const date = Array.isArray(searchParams?.date) ? searchParams?.date[0] : searchParams?.date;
  const passengersRaw = Array.isArray(searchParams?.passengers) ? searchParams?.passengers[0] : searchParams?.passengers;

  const initial = {
    serviceType: tripType || "",
    date: date || "",
    passengers: passengersRaw ? toInt(passengersRaw) : "",
  };

  return (
    <main style={{ padding: "18px 12px" }}>
      <OfferFormWidget initial={initial as any} />
    </main>
  );
}
