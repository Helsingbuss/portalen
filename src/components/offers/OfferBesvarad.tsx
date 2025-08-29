// src/components/offers/OfferBesvarad.tsx
import OffertLayout from "../OffertLayout";


export default function OfferBesvarad({ offer }: any) {
  return (
    <OffertLayout
      title={`Offert (${offer.offer_id})`}
      status="Besvarad"
      welcomeText="Vi har rattat ihop ditt erbjudande – dags att titta på färdplanen."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offertinfo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Offertinformation</h2>
          <p><b>Offertnummer:</b> {offer.offer_id}</p>
          <p><b>Offertdatum:</b> {offer.created_at}</p>
          <p><b>Er referens:</b> {offer.customer_name}</p>
        </div>

        {/* Kundinfo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Kundinformation</h2>
          <p><b>Kundnummer:</b> {offer.customer_number}</p>
          <p><b>Kund:</b> {offer.customer_name}</p>
          <p><b>Adress:</b> {offer.customer_address}</p>
        </div>
      </div>

      {/* Resa + Pris */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Reseinformation</h2>
          <p><b>Från:</b> {offer.departure_place}</p>
          <p><b>Till:</b> {offer.destination}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Resans kostnad</h2>
          <p>1 st á {offer.price_per_unit} kr</p>
          <p><b>Totalsumma:</b> {offer.total_price} kr</p>
        </div>
      </div>

      {/* Call-to-action */}
      <div className="flex gap-4 mt-6">
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg">Boka</button>
        <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Ändra din offert</button>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg">Avböj</button>
      </div>
    </OffertLayout>
  );
}
