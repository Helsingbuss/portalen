import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

type Params = {
  driverName?: string | null;
  driverEmail?: string | null;
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

type SendDriverNotificationInput = {
  driverUserId?: string | null;
  driverEmail?: string | null;
  type: DriverNotificationType;
  params?: Params;
  relatedOrderId?: string | null;
  relatedBookingId?: string | null;
  data?: Record<string, any>;
};

function clean(value?: string | null, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function driveLabel(params: Params = {}) {
  return (
    clean(params.tripTitle) ||
    clean(params.customerName) ||
    clean(params.orderNumber, "din körning")
  );
}

function placeLabel(params: Params = {}) {
  const from = clean(params.pickupPlace);
  const to = clean(params.destination);

  if (from && to) return `${from} → ${to}`;
  if (from) return from;
  if (to) return to;

  return "";
}

export function buildDriverNotification(type: DriverNotificationType, params: Params = {}) {
  const drive = driveLabel(params);
  const place = placeLabel(params);
  const startTime = clean(params.startTime);
  const messagePreview = clean(params.messagePreview);
  const addedPassengerCount = Number(params.addedPassengerCount || 0);

  switch (type) {
    case "new_drive_request":
      return {
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
        title: "Ny körning tilldelad",
        body: "Du har blivit tilldelad en ny körning. Kontrollera körordern i appen.",
        inAppTitle: "Ny körning tilldelad",
        inAppBody: `Trafikledningen har tilldelat dig ${drive}.${place ? ` Rutt: ${place}.` : ""} Läs igenom körordern och bekräfta att du tagit del av informationen.`,
        priority: "high",
        actionLabel: "Visa körorder",
        secondaryActionLabel: "Bekräfta mottaget",
        targetRoute: "/driver/order-detail",
      };

    case "drive_tomorrow":
      return {
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

function getTokenValue(row: any) {
  return (
    row?.expo_push_token ||
    row?.push_token ||
    row?.token ||
    row?.expo_token ||
    null
  );
}

async function sendExpoPush(tokens: string[], title: string, body: string, data: any) {
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));

  if (uniqueTokens.length === 0) {
    return { ok: true, sent: 0, skipped: true };
  }

  const messages = uniqueTokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  const json = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    sent: uniqueTokens.length,
    response: json,
  };
}

export async function sendDriverNotification(input: SendDriverNotificationInput) {
  const template = buildDriverNotification(input.type, {
    ...input.params,
    driverEmail: input.driverEmail || input.params?.driverEmail || null,
  });

  const { data: notification, error: notificationError } = await supabaseAdmin
    .from("driver_notifications")
    .insert({
      driver_user_id: input.driverUserId || null,
      driver_email: input.driverEmail || input.params?.driverEmail || null,
      type: input.type,
      title: template.title,
      body: template.body,
      in_app_title: template.inAppTitle,
      in_app_body: template.inAppBody,
      priority: template.priority,
      target_route: template.targetRoute,
      action_label: template.actionLabel,
      secondary_action_label: template.secondaryActionLabel,
      related_order_id: input.relatedOrderId || null,
      related_booking_id: input.relatedBookingId || null,
      data: input.data || {},
    })
    .select("*")
    .single();

  if (notificationError) {
    throw notificationError;
  }

  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from("app_push_tokens")
    .select("*")
    .eq("app_role", "driver");

  if (tokenError) {
    return {
      ok: true,
      notification,
      push: {
        ok: false,
        sent: 0,
        error: tokenError.message,
      },
    };
  }

  const driverEmail = String(input.driverEmail || input.params?.driverEmail || "").toLowerCase();

  const matchedTokens = (tokens || [])
    .filter((row: any) => {
      const rowEmail = String(row.email || row.user_email || row.driver_email || "").toLowerCase();
      const rowUserId = String(row.user_id || row.auth_user_id || row.driver_user_id || "");

      if (input.driverUserId && rowUserId === String(input.driverUserId)) return true;
      if (driverEmail && rowEmail === driverEmail) return true;

      return !input.driverUserId && !driverEmail;
    })
    .map(getTokenValue)
    .filter(Boolean);

  const push = await sendExpoPush(matchedTokens, template.title, template.body, {
    type: input.type,
    notificationId: notification.id,
    targetRoute: template.targetRoute,
    relatedOrderId: input.relatedOrderId || null,
    relatedBookingId: input.relatedBookingId || null,
    ...(input.data || {}),
  });

  return {
    ok: true,
    notification,
    push,
  };
}
