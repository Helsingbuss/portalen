// src/components/offers/OfferMakulerad.tsx
import OffertLayout from "../OffertLayout";

export default function OfferMakulerad({ offer }: any) {
  return (
    <OffertLayout
      title={`Offert (${offer.offer_id})`}
      status="Makulerad"
      welcomeText="Offertförfrågan är makulerad – vi hoppas få köra för dig vid ett annat tillfälle."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Offertinformation</h2>
          <p><b>Offertnummer:</b> {offer.offer_id}</p>
          <p><b>Offertdatum:</b> {offer.created_at}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Kundinformation</h2>
          <p><b>Kund:</b> {offer.customer_name}</p>
          <p><b>Telefon:</b> {offer.customer_phone}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <h2 className="font-semibold mb-3">Reseinformation</h2>
        <p><b>Från:</b> {offer.departure_place}</p>
        <p><b>Till:</b> {offer.destination}</p>
        <p><b>Passagerare:</b> {offer.passengers}</p>
        <p><b>Övrigt:</b> {offer.notes || "-"}</p>
      </div>
    </OffertLayout>
  );
}
