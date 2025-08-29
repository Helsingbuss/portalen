// src/components/offers/OfferGodkand.tsx
import OffertLayout from "../OffertLayout";

export default function OfferGodkand({ offer }: any) {
  return (
    <OffertLayout
      title={`Bokning (${offer.offer_id})`}
      status="Godkänd"
      welcomeText="Bokningen är klar – nu är du ombord och vi ser fram emot resan tillsammans!"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offertinfo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Offertinformation</h2>
          <p><b>Offertnummer:</b> {offer.offer_id}</p>
          <p><b>Offertdatum:</b> {offer.created_at}</p>
        </div>

        {/* Kundinfo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Kundinformation</h2>
          <p><b>Kundnummer:</b> {offer.customer_number}</p>
          <p><b>Kund:</b> {offer.customer_name}</p>
        </div>
      </div>

      {/* Resa + Pris */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Reseinformation</h2>
          <p><b>Från:</b> {offer.departure_place}</p>
          <p><b>Till:</b> {offer.destination}</p>
          <p><b>Passagerare:</b> {offer.passengers}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Resans kostnad</h2>
          <p>Pris exkl. moms: {offer.price_ex_moms} kr</p>
          <p>Moms: {offer.vat} kr</p>
          <p><b>Totalsumma:</b> {offer.total_price} kr</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Meddelande från trafikledningen:</h3>
        <p>{offer.traffic_message || "Inget meddelande"}</p>
      </div>
    </OffertLayout>
  );
}
