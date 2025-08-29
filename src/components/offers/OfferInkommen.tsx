// src/components/offers/OfferInkommen.tsx
import OffertLayout from "../OffertLayout";

export default function OfferInkommen({ offer }: any) {
  return (
    <OffertLayout
      title={`Offertförfrågan (${offer.offer_id})`}
      status="Inkommen"
      welcomeText="Tack för din offertförfrågan – nu rullar vi igång arbetet åt dig!"
    >
      {/* Offert- & kundinformation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Offertinformation</h2>
          <p><b>Offertnummer:</b> {offer.offer_id}</p>
          <p><b>Offertdatum:</b> {offer.created_at}</p>
          <p><b>Er referens:</b> {offer.customer_name}</p>
          <p><b>Vår referens:</b> Helsingbuss</p>
          <p><b>Fakturareferens:</b> {offer.invoice_ref || "-"}</p>
          <p><b>Betalningsvillkor:</b> Klicka här</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold mb-3">Kundinformation</h2>
          <p><b>Kundnummer:</b> {offer.customer_number}</p>
          <p><b>Kund:</b> {offer.customer_name}</p>
          <p><b>Adress:</b> {offer.customer_address}</p>
          <p><b>Telefon:</b> {offer.customer_phone}</p>
        </div>
      </div>

      {/* Reseinformation */}
      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <h2 className="font-semibold mb-3">Reseinformation</h2>
        <p><b>Avresa:</b> {offer.departure_date} {offer.departure_time}</p>
        <p><b>Återresa:</b> {offer.return_date} {offer.return_time}</p>
        <p><b>Från:</b> {offer.departure_place}</p>
        <p><b>Till:</b> {offer.destination}</p>
        <p><b>Antal passagerare:</b> {offer.passengers}</p>
        <p><b>Övrigt:</b> {offer.notes || "-"}</p>
      </div>
    </OffertLayout>
  );
}
