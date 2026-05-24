export type DriverNotificationType =
  | "new_drive_request"
  | "drive_request_reminder"
  | "drive_assigned"
  | "drive_confirmed"
  | "drive_tomorrow"
  | "drive_in_2_hours"
  | "drive_starting_soon"
  | "drive_order_updated"
  | "traffic_message"
  | "important_traffic_message"
  | "passenger_list_updated"
  | "new_passenger_added"
  | "drive_cancelled"
  | "ticket_scanner_active"
  | "drive_finish_reminder";

export type DriverNotificationPriority = "low" | "normal" | "high" | "urgent";

export type DriverNotificationParams = {
  driverName?: string | null;
  orderNumber?: string | null;
  tripTitle?: string | null;
  customerName?: string | null;
  pickupPlace?: string | null;
  destination?: string | null;
  startTime?: string | null;
  startDate?: string | null;
  messagePreview?: string | null;
  passengerCount?: number | null;
  addedPassengerCount?: number | null;
};

export type DriverNotificationTemplate = {
  type: DriverNotificationType;
  title: string;
  body: string;
  inAppTitle: string;
  inAppBody: string;
  priority: DriverNotificationPriority;
  actionLabel?: string;
  secondaryActionLabel?: string;
  targetRoute?: string;
};

function clean(value?: string | null, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function driveLabel(params: DriverNotificationParams) {
  return clean(params.tripTitle) || clean(params.customerName) || clean(params.orderNumber, "din körning");
}

function placeLabel(params: DriverNotificationParams) {
  const from = clean(params.pickupPlace);
  const to = clean(params.destination);

  if (from && to) return `${from} → ${to}`;
  if (from) return from;
  if (to) return to;

  return "";
}

export function getDriverNotificationTemplate(
  type: DriverNotificationType,
  params: DriverNotificationParams = {}
): DriverNotificationTemplate {
  const drive = driveLabel(params);
  const place = placeLabel(params);
  const startTime = clean(params.startTime);
  const startDate = clean(params.startDate);
  const messagePreview = clean(params.messagePreview);
  const addedPassengerCount = Number(params.addedPassengerCount || 0);

  switch (type) {
    case "new_drive_request":
      return {
        type,
        title: "Ny körförfrågan",
        body: "Du har fått en ny körförfrågan från trafikledningen. Öppna appen för att se tider, rutt och uppdrag.",
        inAppTitle: "Ny körförfrågan",
        inAppBody: `Du har fått en ny körförfrågan för ${drive}.${place ? ` Rutt: ${place}.` : ""} Läs igenom körorder, tider, hållplatser och instruktioner innan du svarar.`,
        priority: "high",
        actionLabel: "Visa körorder",
        secondaryActionLabel: "Kan inte köra",
        targetRoute: "/driver/order-detail",
      };

    case "drive_request_reminder":
      return {
        type,
        title: "Svar behövs på körförfrågan",
        body: "Du har en körförfrågan som väntar på svar. Bekräfta om du kan köra.",
        inAppTitle: "Körförfrågan väntar på svar",
        inAppBody: `Trafikledningen väntar på ditt svar för ${drive}. Kontrollera uppdraget och svara så snart du kan.`,
        priority: "high",
        actionLabel: "Svara på körning",
        targetRoute: "/driver/order-detail",
      };

    case "drive_assigned":
      return {
        type,
        title: "Ny körning tilldelad",
        body: "Du har blivit tilldelad en ny körning. Kontrollera körordern i appen.",
        inAppTitle: "Ny körning tilldelad",
        inAppBody: `Trafikledningen har tilldelat dig ${drive}.${place ? ` Rutt: ${place}.` : ""} Läs igenom körordern och bekräfta att du tagit del av informationen.`,
        priority: "high",
        actionLabel: "Visa körorder",
        secondaryActionLabel: "Bekräfta mottaget",
        targetRoute: "/driver/order-detail",
      };

    case "drive_confirmed":
      return {
        type,
        title: "Körning bekräftad",
        body: "Du har accepterat körningen. Körordern finns nu under Mina körningar.",
        inAppTitle: "Körningen är bekräftad",
        inAppBody: `Körningen ${drive} är bekräftad. Kontrollera körorder, passagerarlista och eventuella meddelanden från trafikledningen i god tid före avresa.`,
        priority: "normal",
        actionLabel: "Mina körningar",
        targetRoute: "/driver/trips",
      };

    case "drive_tomorrow":
      return {
        type,
        title: "Körning imorgon",
        body: "Du har en körning imorgon. Kontrollera körorder, tider och eventuella instruktioner.",
        inAppTitle: "Påminnelse inför morgondagens körning",
        inAppBody: `Du har en planerad körning imorgon${startTime ? ` kl. ${startTime}` : ""}. Gå igenom körordern och säkerställ att allt är klart.`,
        priority: "normal",
        actionLabel: "Visa körorder",
        targetRoute: "/driver/order-detail",
      };

    case "drive_in_2_hours":
      return {
        type,
        title: "Körning om 2 timmar",
        body: "Din körning startar snart. Kontrollera körorder, fordon och upphämtningsplats.",
        inAppTitle: "Körningen närmar sig",
        inAppBody: `Din körning ${drive} startar om cirka 2 timmar.${place ? ` Upphämtning/rutt: ${place}.` : ""} Kontrollera körorder, fordon och senaste instruktioner.`,
        priority: "high",
        actionLabel: "Visa körorder",
        targetRoute: "/driver/order-detail",
      };

    case "drive_starting_soon":
      return {
        type,
        title: "Körning startar snart",
        body: "Din körning startar om cirka 30 minuter. Var redo och kontrollera senaste instruktionerna.",
        inAppTitle: "Körning startar snart",
        inAppBody: `Din körning ${drive} startar snart.${startTime ? ` Starttid: ${startTime}.` : ""} Kontrollera att du är redo och att inga nya instruktioner har tillkommit.`,
        priority: "urgent",
        actionLabel: "Öppna körorder",
        targetRoute: "/driver/order-detail",
      };

    case "drive_order_updated":
      return {
        type,
        title: "Körorder uppdaterad",
        body: "Trafikledningen har uppdaterat din körorder. Öppna appen och kontrollera ändringarna.",
        inAppTitle: "Körordern har uppdaterats",
        inAppBody: `Körordern för ${drive} har uppdaterats av trafikledningen. Kontrollera nya tider, platser, passagerare eller instruktioner innan du kör vidare.`,
        priority: "urgent",
        actionLabel: "Se ändringar",
        targetRoute: "/driver/order-detail",
      };

    case "traffic_message":
      return {
        type,
        title: "Nytt meddelande",
        body: messagePreview || "Du har fått ett nytt meddelande från trafikledningen.",
        inAppTitle: "Meddelande från trafikledningen",
        inAppBody: messagePreview || "Du har fått ett meddelande från trafikledningen. Läs meddelandet och bekräfta vid behov.",
        priority: "high",
        actionLabel: "Läs meddelande",
        secondaryActionLabel: "Bekräfta mottaget",
        targetRoute: "/driver/more",
      };

    case "important_traffic_message":
      return {
        type,
        title: "Viktigt meddelande",
        body: "Trafikledningen har skickat viktig information. Öppna appen direkt.",
        inAppTitle: "Viktig information från trafikledningen",
        inAppBody: messagePreview || "Trafikledningen har skickat viktig information. Läs meddelandet innan du fortsätter.",
        priority: "urgent",
        actionLabel: "Läs direkt",
        targetRoute: "/driver/more",
      };

    case "passenger_list_updated":
      return {
        type,
        title: "Passagerarlista uppdaterad",
        body: "Passagerarlistan för din körning har uppdaterats. Kontrollera listan innan avresa.",
        inAppTitle: "Passagerarlistan har ändrats",
        inAppBody: `Passagerarlistan för ${drive} har uppdaterats. Nya bokningar, avbokningar eller uppdaterade uppgifter kan ha tillkommit.`,
        priority: "high",
        actionLabel: "Visa passagerare",
        targetRoute: "/driver/passengers",
      };

    case "new_passenger_added":
      return {
        type,
        title: addedPassengerCount > 1 ? "Nya passagerare tillagda" : "Ny passagerare tillagd",
        body:
          addedPassengerCount > 1
            ? `${addedPassengerCount} nya passagerare har lagts till på din körning.`
            : "En ny passagerare har lagts till på din körning.",
        inAppTitle: "Passagerare tillagda",
        inAppBody:
          addedPassengerCount > 1
            ? `${addedPassengerCount} nya passagerare har lagts till på ${drive}. Kontrollera passagerarlistan innan avresa.`
            : `En ny passagerare har lagts till på ${drive}. Kontrollera passagerarlistan innan avresa.`,
        priority: "normal",
        actionLabel: "Visa passagerare",
        targetRoute: "/driver/passengers",
      };

    case "drive_cancelled":
      return {
        type,
        title: "Körning avbokad",
        body: "En planerad körning har avbokats. Öppna appen för mer information.",
        inAppTitle: "Körningen är avbokad",
        inAppBody: `Körningen ${drive} har avbokats av trafikledningen. Kontrollera om du har fått nya instruktioner eller ett ersättningsuppdrag.`,
        priority: "urgent",
        actionLabel: "Visa information",
        targetRoute: "/driver/trips",
      };

    case "ticket_scanner_active":
      return {
        type,
        title: "Biljettkontroll aktiv",
        body: "Scanner är aktiverad för din körning. Kontrollera biljetter vid påstigning.",
        inAppTitle: "Scanner aktiverad",
        inAppBody: `Biljettkontroll är aktiv för ${drive}. Använd scannern vid påstigning och kontrollera att biljetterna gäller rätt avgång.`,
        priority: "normal",
        actionLabel: "Öppna scanner",
        targetRoute: "/driver/scan",
      };

    case "drive_finish_reminder":
      return {
        type,
        title: "Körning avslutad?",
        body: "Markera körningen som avslutad när uppdraget är klart.",
        inAppTitle: "Avsluta körningen",
        inAppBody: `När körningen ${drive} är genomförd kan du markera den som avslutad och rapportera eventuella avvikelser.`,
        priority: "normal",
        actionLabel: "Markera som avslutad",
        secondaryActionLabel: "Rapportera avvikelse",
        targetRoute: "/driver/order-detail",
      };

    default:
      return {
        type,
        title: "Notis från Helsingbuss",
        body: "Du har fått en ny notis i förarappen.",
        inAppTitle: "Ny notis",
        inAppBody: "Du har fått en ny notis i förarappen.",
        priority: "normal",
        actionLabel: "Öppna appen",
        targetRoute: "/driver/dashboard",
      };
  }
}

export const recommendedDriverNotificationTypes: DriverNotificationType[] = [
  "new_drive_request",
  "drive_request_reminder",
  "drive_tomorrow",
  "drive_in_2_hours",
  "drive_starting_soon",
  "drive_order_updated",
  "traffic_message",
  "passenger_list_updated",
  "drive_cancelled",
  "drive_finish_reminder",
];
