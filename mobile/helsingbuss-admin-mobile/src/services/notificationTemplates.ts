export type NotificationTemplateKey =
  | "new_offer"
  | "offer_price_sent"
  | "offer_accepted"
  | "offer_declined"
  | "new_booking"
  | "booking_updated"
  | "new_drive_order"
  | "driver_assigned"
  | "driver_confirmed"
  | "payment_link_sent"
  | "payment_received"
  | "invoice_overdue"
  | "document_expiring"
  | "document_expired"
  | "ticket_scanned"
  | "departure_changed"
  | "partner_price_received"
  | "vehicle_check_due";

export type NotificationTemplate = {
  key: NotificationTemplateKey;
  category: string;
  title: string;
  body: string;
};

export const notificationTemplates: NotificationTemplate[] = [
  {
    key: "new_offer",
    category: "Offerter",
    title: "Ny offertförfrågan",
    body: "En ny offert har kommit in och behöver hanteras.",
  },
  {
    key: "offer_price_sent",
    category: "Offerter",
    title: "Prisförslag skickat",
    body: "Prisförslaget har skickats till kunden.",
  },
  {
    key: "offer_accepted",
    category: "Offerter",
    title: "Offert godkänd",
    body: "Kunden har godkänt offerten. Nästa steg är att skapa bokning.",
  },
  {
    key: "offer_declined",
    category: "Offerter",
    title: "Offert avböjd",
    body: "Kunden har avböjt offerten. Kontrollera om uppföljning behövs.",
  },
  {
    key: "new_booking",
    category: "Bokningar",
    title: "Ny bokning",
    body: "En ny bokning har skapats i systemet.",
  },
  {
    key: "booking_updated",
    category: "Bokningar",
    title: "Bokning uppdaterad",
    body: "En bokning har ändrats. Kontrollera tider, kund och körning.",
  },
  {
    key: "new_drive_order",
    category: "Körorder",
    title: "Ny körorder",
    body: "En ny körorder har skapats och behöver kontrolleras.",
  },
  {
    key: "driver_assigned",
    category: "Körorder",
    title: "Chaufför tilldelad",
    body: "En chaufför har tilldelats en körning.",
  },
  {
    key: "driver_confirmed",
    category: "Körorder",
    title: "Körning bekräftad",
    body: "Chauffören har bekräftat körningen.",
  },
  {
    key: "payment_link_sent",
    category: "Betalning",
    title: "Betalningslänk skickad",
    body: "En betalningslänk har skickats till kunden.",
  },
  {
    key: "payment_received",
    category: "Betalning",
    title: "Betalning mottagen",
    body: "En kund har betalat via betalningslänk.",
  },
  {
    key: "invoice_overdue",
    category: "Ekonomi",
    title: "Faktura förfallen",
    body: "En faktura har passerat förfallodatum och behöver följas upp.",
  },
  {
    key: "document_expiring",
    category: "Dokument",
    title: "Dokument går ut snart",
    body: "Ett avtal, tillstånd eller internt underlag behöver kontrolleras.",
  },
  {
    key: "document_expired",
    category: "Dokument",
    title: "Dokument har gått ut",
    body: "Ett dokument har passerat sitt giltighetsdatum och behöver åtgärdas.",
  },
  {
    key: "ticket_scanned",
    category: "Biljetter",
    title: "Biljett skannad",
    body: "En biljett har skannats och markerats som använd.",
  },
  {
    key: "departure_changed",
    category: "Trafik",
    title: "Avgång ändrad",
    body: "En avgång eller tidtabell har ändrats. Kontrollera berörda resenärer.",
  },
  {
    key: "partner_price_received",
    category: "Partners",
    title: "Pris från partner",
    body: "En operatör eller partner har lämnat pris på en offert.",
  },
  {
    key: "vehicle_check_due",
    category: "Fordon",
    title: "Fordonskontroll behövs",
    body: "Ett fordon behöver daglig kontroll, dokumentkontroll eller uppföljning.",
  },
];

export function getNotificationTemplate(key: NotificationTemplateKey) {
  return notificationTemplates.find((item) => item.key === key);
}

export function getNotificationCategories() {
  return Array.from(new Set(notificationTemplates.map((item) => item.category)));
}
