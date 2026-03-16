import { FormEvent, useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";

const OfferRegisterNewPage: NextPage = () => {
  const router = useRouter();

  const [synergybusId, setSynergybusId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [departure, setDeparture] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [tripType, setTripType] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [expiresTime, setExpiresTime] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!synergybusId || !customerName || !departure || !totalPrice) {
      setError("Fyll i minst Synergybus ID, kund, avresa och totalpris.");
      return;
    }

    const totalPriceNumber = Number(totalPrice.replace(",", "."));
    if (Number.isNaN(totalPriceNumber)) {
      setError("Totalpris måste vara ett nummer.");
      return;
    }

    const commissionNumber = commission
      ? Number(commission.replace(",", "."))
      : null;

    if (commission && Number.isNaN(commissionNumber)) {
      setError("Provision måste vara ett nummer.");
      return;
    }

    const body: any = {
      synergybus_id: synergybusId || null,
      customer_name: customerName || null,
      departure: departure || null,
      departure_city: departureCity || null,
      destination_city: destinationCity || null,
      total_price: totalPriceNumber,
      commission_percent: commissionNumber,
      trip_type: tripType || null,
    };

    if (expiresDate) {
      const time = expiresTime || "00:00";
      const iso = new Date(`${expiresDate}T${time}:00`).toISOString();
      body.expires_at = iso;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/admin/offer-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error || "Kunde inte spara offerten i registret."
        );
      }

      router.push("/admin/offer-register");
    } catch (err: any) {
      setError(err.message || "Något gick fel när offerten skulle sparas.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#f5f4f0]">
        <AdminMenu />

        <main className="pl-64 pr-14 pt-16 pb-16">
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => router.push("/admin/offer-register")}
              className="mb-3 text-xs font-medium text-[#1A545F] hover:underline"
            >
               Tillbaka till offertregistret
            </button>

            <h1 className="text-2xl font-semibold text-slate-900">
              Lägg till offert i registret
            </h1>
            <p className="mt-1 mb-5 text-sm text-slate-600">
              Här registrerar du en offert från Synergybus så att du kan följa
              totalpris, provision och utgångsdatum direkt i portalen.
            </p>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="synergybusId"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Synergybus ID
                    </label>
                    <input
                      id="synergybusId"
                      type="text"
                      required
                      value={synergybusId}
                      onChange={(e) => setSynergybusId(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                      placeholder="t.ex. 182610"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="customerName"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Kund
                    </label>
                    <input
                      id="customerName"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                      placeholder="Företagsnamn eller kontaktperson"
                    />
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label
                      htmlFor="departure"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Avresa (text)
                    </label>
                    <input
                      id="departure"
                      type="text"
                      required
                      value={departure}
                      onChange={(e) => setDeparture(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                      placeholder="t.ex. Fr 15.04.2026, 07.00"
                    />
                    <p className="text-[11px] text-slate-500">
                      Kopiera gärna direkt från Synergybus (samma format som i
                      listan).
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="departureCity"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Från
                    </label>
                    <input
                      id="departureCity"
                      type="text"
                      value={departureCity}
                      onChange={(e) => setDepartureCity(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                      placeholder="t.ex. Helsingborg"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="destinationCity"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Till
                    </label>
                    <input
                      id="destinationCity"
                      type="text"
                      value={destinationCity}
                      onChange={(e) => setDestinationCity(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                      placeholder="t.ex. Malmö"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="tripType"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Typ av resa
                    </label>
                    <select
                      id="tripType"
                      value={tripType}
                      onChange={(e) => setTripType(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                    >
                      <option value="">Välj typ</option>
                      <option value="Enkel/Tur & Retur">Enkel/Tur &amp; Retur</option>
                      <option value="Hyra buss">Hyra buss</option>
                      <option value="Bröllopskörning">Bröllopskörning</option>
                      <option value="Event & Specialresor">
                        Event &amp; Specialresor
                      </option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="totalPrice"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Totalpris
                    </label>
                    <input
                      id="totalPrice"
                      type="number"
                      required
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                      placeholder="t.ex. 6578"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="commission"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      Provision (%)
                    </label>
                    <select
                      id="commission"
                      value={commission}
                      onChange={(e) => setCommission(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                    >
                      <option value="">Välj</option>
                      <option value="7">7 %</option>
                      <option value="9">9 %</option>
                      <option value="10">10 %</option>
                      <option value="11">11 %</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Går ut (utgångsdatum)
                    </span>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input
                        type="date"
                        value={expiresDate}
                        onChange={(e) => setExpiresDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                      />
                      <input
                        type="time"
                        value={expiresTime}
                        onChange={(e) => setExpiresTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-[#1A545F] focus:ring-1 focus:ring-[#1A545F]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Används för att räkna ned till utgångsdatum och visa
                      status i listan.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => router.push("/admin/offer-register")}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-[#1A545F] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#16434b] disabled:opacity-60"
                  >
                    {submitting ? "Sparar..." : "Spara offert"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default OfferRegisterNewPage;
