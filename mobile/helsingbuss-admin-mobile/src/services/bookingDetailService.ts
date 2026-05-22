import { supabase } from "../lib/supabase";

export type AdminBookingLeg = {
  label: string;
  from: string;
  to: string;
  date: string;
  time: string;
  endTime: string;
  onSiteMinutes?: string;
  stops?: string;
};

export type AdminDetailField = {
  label: string;
  value: string;
  type?: "normal" | "success" | "warning" | "danger" | "price";
};

export type AdminBookingDetail = {
  found: boolean;
  kind: string;
  id: string;

  sourceLabel: string;
  title: string;
  reference: string;
  status: string;

  customer: string;
  company: string;
  orgNumber: string;
  email: string;
  phone: string;

  tripType: string;
  isRoundTrip: boolean;

  passengers: string;
  price: string;
  vatIncluded: string;

  outbound: AdminBookingLeg;
  returnLeg?: AdminBookingLeg;

  notes: string;
  internalNotes: string;

  extraTitle: string;
  extraFields: AdminDetailField[];
  canOpenScanner: boolean;
  scannerText: string;

  raw: Record<string, any>;
};

function pick(raw: Record<string, any>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = raw?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function money(value: string) {
  if (!value) return "";
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return value;

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function formatDate(value: string) {
  if (!value) return "";

  const dateOnly = value.slice(0, 10);
  const parsed = new Date(`${dateOnly}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function normalizeStatus(status: string) {
  const clean = status.toLowerCase().trim();

  if (["accepted", "godkänd", "godkand", "bekräftad", "bekraftad", "bokad", "booked"].includes(clean)) {
    return "Bekräftad";
  }

  if (["inkommen", "ny", "new"].includes(clean)) return "Inkommen";
  if (["besvarad", "skickad", "sent", "answered"].includes(clean)) return "Besvarad";
  if (["väntar svar", "vantar svar", "väntar_svar", "vantar_svar", "pending"].includes(clean)) return "Väntar svar";
  if (["avböjd", "avbojd", "declined", "cancelled", "canceled", "avbokad"].includes(clean)) return "Avböjd";
  if (["körd", "kord", "slutförd", "slutford", "completed", "done", "genomförd", "genomford"].includes(clean)) return "Arkiv";

  return status || "Öppen";
}

function hasReturnTrip(raw: Record<string, any>, tripType: string) {
  const text = tripType.toLowerCase();

  const returnFields = [
    "return_departure",
    "return_destination",
    "return_date",
    "return_time",
    "return_end_time",
    "return_on_site_minutes",
  ];

  const hasReturnField = returnFields.some((key) => {
    const value = raw?.[key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });

  return (
    hasReturnField ||
    text.includes("retur") ||
    text.includes("tur") ||
    text.includes("round") ||
    text.includes("return")
  );
}

function getSourceLabel(kind: string) {
  if (kind === "offer") return "OFFERT";
  if (kind === "booking") return "BOKNING";
  if (kind === "departure") return "AVGÅNG";
  if (kind === "shuttle_departure") return "FLYGBUSS";
  if (kind === "shuttle_ticket") return "FLYGBUSS BILJETT";
  if (kind === "sundra_departure") return "RESA";
  if (kind === "sundra_booking") return "RESA";
  if (kind === "sundra_ticket") return "RESA BILJETT";
  if (kind === "ticket") return "BILJETT";
  if (kind === "trip") return "RESA";
  if (kind === "trip_departure") return "RESA";

  return "ÄRENDE";
}

function addField(
  fields: AdminDetailField[],
  label: string,
  value: string,
  type: AdminDetailField["type"] = "normal"
) {
  if (value && String(value).trim() !== "") {
    fields.push({ label, value, type });
  }
}

function buildExtra(kind: string, raw: Record<string, any>, price: string) {
  const fields: AdminDetailField[] = [];
  let extraTitle = "Specifika uppgifter";
  let canOpenScanner = false;
  let scannerText = "";

  if (kind === "offer") {
    extraTitle = "Offertuppgifter";

    addField(fields, "Offertnummer", pick(raw, ["offer_number", "reference", "synergybus_id"]));
    addField(fields, "Pris till kund", price || money(pick(raw, ["total_price", "price_amount", "price"])), "price");
    addField(fields, "Intern kostnad", money(pick(raw, ["internal_cost", "cost_price", "operator_cost"])), "price");
    addField(fields, "Provision", pick(raw, ["commission_percent", "commission"], ""), "success");
    addField(fields, "Giltig till", formatDate(pick(raw, ["valid_until", "expires_at", "expiry_date"])));
    addField(fields, "Moms inkluderad", pick(raw, ["price_vat_included", "vat_included"]));
    addField(fields, "Typ av resa", pick(raw, ["enkel_tur_retur", "trip_type", "trip_kind"]));
  } else if (kind === "booking") {
    extraTitle = "Boknings- och körningsuppgifter";

    addField(fields, "Bokningsnummer", pick(raw, ["booking_number", "reference"]));
    addField(fields, "Pris", price || money(pick(raw, ["total_price", "price_amount", "price"])), "price");
    addField(fields, "Chaufför", pick(raw, ["driver_name", "driver", "chauffor", "chauffeur_name", "assigned_driver"]));
    addField(fields, "Fordon", pick(raw, ["vehicle_name", "vehicle", "bus", "bus_name", "vehicle_id"]));
    addField(fields, "Operatör", pick(raw, ["operator", "operator_name", "partner_name"]));
    addField(fields, "Körorder", pick(raw, ["driving_order_number", "trip_order_number", "order_number"]));
    addField(fields, "Plats på destination", pick(raw, ["base_at_destination", "basplats_pa_destination"]));
    addField(fields, "Standby", pick(raw, ["standby", "standby_hours"]));
  } else if (
    kind === "shuttle_departure" ||
    kind === "departure" ||
    kind === "sundra_departure" ||
    kind === "trip_departure"
  ) {
    extraTitle = kind.includes("shuttle") ? "Flygbussavgång" : "Avgång / resa";
    canOpenScanner = true;
    scannerText = kind.includes("shuttle")
      ? "Öppna scanner för flygbussbiljetter"
      : "Öppna scanner för resans biljetter";

    addField(fields, "Linje", pick(raw, ["line_name", "line", "route_line", "line_id"]));
    addField(fields, "Rutt", pick(raw, ["route_name", "route_title", "route", "direction"]));
    addField(fields, "Avgångsnummer", pick(raw, ["departure_number", "departure_id", "id"]));
    addField(fields, "Kapacitet", pick(raw, ["capacity", "seats", "max_passengers"]));
    addField(fields, "Sålda biljetter", pick(raw, ["sold_count", "ticket_count", "tickets_sold"], ""), "success");
    addField(fields, "Lediga platser", pick(raw, ["available_seats", "remaining_seats"]));
    addField(fields, "Operatör", pick(raw, ["operator", "operator_name", "partner_name"]));
    addField(fields, "Status", normalizeStatus(pick(raw, ["status"], "")));
  } else if (
    kind === "shuttle_ticket" ||
    kind === "sundra_ticket" ||
    kind === "ticket"
  ) {
    extraTitle = "Biljettuppgifter";
    canOpenScanner = true;
    scannerText = "Öppna scanner för att kontrollera biljett";

    addField(fields, "Biljettnummer", pick(raw, ["ticket_number", "ticket_id", "reference", "id"]));
    addField(fields, "Biljettyp", pick(raw, ["ticket_type", "passenger_type", "category"]));
    addField(fields, "Säte/plats", pick(raw, ["seat", "seat_number", "place"]));
    addField(fields, "Pris", money(pick(raw, ["price", "amount", "total_price"])), "price");
    addField(fields, "Betalstatus", pick(raw, ["payment_status", "paid_status", "status"]));
    addField(fields, "QR-status", pick(raw, ["scan_status", "qr_status", "status"]));
    addField(fields, "Skannad", pick(raw, ["scanned_at", "used_at", "checked_in_at"]) ? "Ja" : "Nej", pick(raw, ["scanned_at", "used_at", "checked_in_at"]) ? "success" : "warning");
    addField(fields, "Skannad tid", pick(raw, ["scanned_at", "used_at", "checked_in_at"]));
    addField(fields, "Skannad av", pick(raw, ["scanned_by", "checked_in_by"]));
  } else if (kind === "trip" || kind === "sundra_booking") {
    extraTitle = "Reseuppgifter";

    addField(fields, "Resenamn", pick(raw, ["title", "name", "trip_title"]));
    addField(fields, "Kapacitet", pick(raw, ["capacity", "seats", "max_passengers"]));
    addField(fields, "Sålda platser", pick(raw, ["sold_count", "ticket_count", "booked_count"], ""), "success");
    addField(fields, "Pris", money(pick(raw, ["price", "amount", "total_price"])), "price");
    addField(fields, "Status", normalizeStatus(pick(raw, ["status"], "")));
  }

  return {
    extraTitle,
    extraFields: fields,
    canOpenScanner,
    scannerText,
  };
}

export async function getAdminBookingDetail(
  kind: string,
  id: string
): Promise<AdminBookingDetail | null> {
  const { data, error } = await supabase.rpc("get_admin_booking_detail", {
    item_kind: kind,
    item_id: id,
  });

  if (error) {
    console.log("Booking detail error:", error);
    throw new Error(error.message);
  }

  const payload = typeof data === "string" ? JSON.parse(data) : data;

  if (!payload?.found || !payload?.raw) {
    return null;
  }

  const raw = payload.raw as Record<string, any>;

  const tripType = pick(raw, [
    "enkel_tur_retur",
    "trip_type",
    "trip_kind",
    "type",
  ], "Enkelresa");

  const isRoundTrip = hasReturnTrip(raw, tripType);

  const outbound: AdminBookingLeg = {
    label: "Utresa",
    from: pick(raw, ["departure_place", "departure", "departure_city", "from", "from_stop"], "Från saknas"),
    to: pick(raw, ["destination", "destination_city", "final_destination", "to", "to_stop"], "Till saknas"),
    date: formatDate(pick(raw, ["departure_date", "travel_date", "date", "offer_date", "created_at", "added_at"])),
    time: pick(raw, ["departure_time", "start_time", "time", "depart_time"], "Tid saknas"),
    endTime: pick(raw, ["end_time", "arrival_time"], ""),
    onSiteMinutes: pick(raw, ["on_site_minutes"], ""),
    stops: pick(raw, ["stopover_places", "via", "extra_stops", "stop"], ""),
  };

  const returnLeg: AdminBookingLeg | undefined = isRoundTrip
    ? {
        label: "Returresa",
        from: pick(raw, ["return_departure"], outbound.to),
        to: pick(raw, ["return_destination"], outbound.from),
        date: formatDate(pick(raw, ["return_date"], pick(raw, ["departure_date", "travel_date", "date"]))),
        time: pick(raw, ["return_time"], "Returtid saknas"),
        endTime: pick(raw, ["return_end_time"], ""),
        onSiteMinutes: pick(raw, ["return_on_site_minutes"], ""),
        stops: pick(raw, ["return_stopover_places", "return_via"], ""),
      }
    : undefined;

  const priceRaw = pick(raw, [
    "total_price",
    "price_amount",
    "price",
    "amount",
  ]);

  const price = money(priceRaw);

  const extra = buildExtra(kind, raw, price);

  return {
    found: true,
    kind,
    id,
    sourceLabel: getSourceLabel(kind),
    title: pick(raw, [
      "title",
      "trip_title",
      "route_title",
      "name",
      "destination",
      "destination_city",
      "final_destination",
    ], kind === "offer" ? "Offert" : "Bokning"),
    reference: pick(raw, [
      "booking_number",
      "offer_number",
      "ticket_number",
      "departure_number",
      "reference",
      "Referens_PO_nummer",
      "synergybus_id",
      "id",
    ], id),
    status: normalizeStatus(pick(raw, ["status"], "Öppen")),

    customer: pick(raw, [
      "customer_name",
      "contact_person",
      "Namn_efternamn",
      "passenger_name",
      "full_name",
    ], "Okänd kund"),
    company: pick(raw, ["foretag_forening", "company", "organization"], ""),
    orgNumber: pick(raw, ["org_number", "organisation_number", "organization_number"], ""),
    email: pick(raw, ["customer_email", "contact_email", "email"], ""),
    phone: pick(raw, ["customer_phone", "contact_phone", "phone"], ""),

    tripType,
    isRoundTrip,

    passengers: pick(raw, ["passengers", "passenger_count", "quantity", "ticket_count"], "0"),
    price,
    vatIncluded: pick(raw, ["price_vat_included", "vat_included"], ""),

    outbound,
    returnLeg,

    notes: pick(raw, ["notes", "comment", "message", "notis_pa_plats", "site_notes"], ""),
    internalNotes: pick(raw, ["internal_notes", "admin_notes"], ""),

    extraTitle: extra.extraTitle,
    extraFields: extra.extraFields,
    canOpenScanner: extra.canOpenScanner,
    scannerText: extra.scannerText,

    raw,
  };
}
