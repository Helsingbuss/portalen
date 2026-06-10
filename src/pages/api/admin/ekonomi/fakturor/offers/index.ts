import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env saknas.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function pick(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function pickNumber(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      const parsed = Number(String(value).replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function mapOffer(row: any) {
  const from = pick(row, [
    "from_address",
    "pickup_address",
    "pickup",
    "from",
    "start_address",
    "departure_address",
    "pickup_location",
  ]);

  const to = pick(row, [
    "to_address",
    "destination_address",
    "destination",
    "to",
    "end_address",
    "arrival_address",
    "dropoff_location",
  ]);

  const date = pick(row, [
    "travel_date",
    "trip_date",
    "date",
    "pickup_date",
    "departure_date",
    "start_date",
  ]);

  const time = pick(row, [
    "travel_time",
    "trip_time",
    "time",
    "pickup_time",
    "departure_time",
    "start_time",
  ]);

  const customerName =
    pick(row, [
      "customer_name",
      "company_name",
      "contact_name",
      "name",
      "full_name",
      "client_name",
    ]) || "Kund";

  const price = pickNumber(row, [
    "price",
    "total_price",
    "quoted_price",
    "offer_price",
    "total_amount",
    "amount",
    "price_incl_vat",
    "final_price",
  ]);

  return {
    id: String(row.id || ""),
    customerName,
    email: pick(row, ["customer_email", "email", "contact_email"]),
    phone: pick(row, ["customer_phone", "phone", "contact_phone", "mobile"]),
    from,
    to,
    date,
    time,
    passengers: pick(row, ["passengers", "passenger_count", "number_of_passengers", "people", "persons"]),
    status: pick(row, ["status", "offer_status", "state"]),
    reference: pick(row, ["offer_number", "quote_number", "reference", "booking_reference", "order_reference"]) || String(row.id || ""),
    price,
    created_at: pick(row, ["created_at", "createdAt"]),
    raw: row,
  };
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const q = String(req.query.q || "").trim().toLowerCase();

    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .limit(300);

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          offers: [],
          error: "Tabellen offers hittades inte.",
        });
      }

      throw error;
    }

    let offers = (data || []).map(mapOffer);

    if (q) {
      offers = offers.filter((offer: any) => {
        const haystack = [
          offer.customerName,
          offer.email,
          offer.phone,
          offer.from,
          offer.to,
          offer.date,
          offer.time,
          offer.passengers,
          offer.status,
          offer.reference,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    offers.sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      offers,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/offers error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta offerter.",
    });
  }
}
