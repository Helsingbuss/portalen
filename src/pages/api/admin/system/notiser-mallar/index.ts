import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const tableName = "system_message_templates";

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

const defaultTemplates = [
  {
    key: "booking_confirmation",
    name: "Bokningsbekräftelse",
    channel: "email",
    category: "Bokning",
    subject: "Din bokning hos Helsingbuss är mottagen",
    body: "Hej {{customer_name}}!\n\nTack för din bokning hos Helsingbuss.\n\nBokningsnummer: {{booking_number}}\nDatum: {{travel_date}}\nUpphämtning: {{pickup_location}}\nDestination: {{destination}}\n\nVi återkommer om något behöver kompletteras.\n\nMed vänliga hälsningar\nHelsingbuss",
    variables: ["customer_name", "booking_number", "travel_date", "pickup_location", "destination"],
    is_active: true,
  },
  {
    key: "ticket_email",
    name: "Biljettutskick",
    channel: "email",
    category: "Biljetter",
    subject: "Din biljett från Helsingbuss",
    body: "Hej {{customer_name}}!\n\nHär kommer din biljett för {{trip_name}}.\n\nAvgång: {{departure_time}}\nUpphämtning: {{pickup_location}}\nPlats: {{seat_number}}\n\nBiljetten finns bifogad som PDF.\n\nVälkommen ombord!\nHelsingbuss",
    variables: ["customer_name", "trip_name", "departure_time", "pickup_location", "seat_number"],
    is_active: true,
  },
  {
    key: "invoice_sent",
    name: "Faktura skickad",
    channel: "email",
    category: "Ekonomi",
    subject: "Faktura från Helsingbuss",
    body: "Hej {{customer_name}}!\n\nHär kommer faktura {{invoice_number}} från Helsingbuss.\n\nBelopp: {{total_amount}}\nFörfallodatum: {{due_date}}\n\nFakturan finns bifogad som PDF.\n\nMed vänliga hälsningar\nHelsingbuss",
    variables: ["customer_name", "invoice_number", "total_amount", "due_date"],
    is_active: true,
  },
  {
    key: "invoice_reminder",
    name: "Betalningspåminnelse",
    channel: "email",
    category: "Ekonomi",
    subject: "Påminnelse: faktura {{invoice_number}}",
    body: "Hej {{customer_name}}!\n\nVi vill vänligen påminna om att faktura {{invoice_number}} ännu inte är registrerad som betald.\n\nBelopp: {{total_amount}}\nFörfallodatum: {{due_date}}\n\nOm betalning redan är gjord kan du bortse från detta meddelande.\n\nMed vänliga hälsningar\nHelsingbuss",
    variables: ["customer_name", "invoice_number", "total_amount", "due_date"],
    is_active: true,
  },
  {
    key: "driver_order",
    name: "Körorder till chaufför",
    channel: "email",
    category: "Drift",
    subject: "Ny körorder: {{order_number}}",
    body: "Hej {{driver_name}}!\n\nDu har fått en ny körorder.\n\nKörorder: {{order_number}}\nDatum: {{travel_date}}\nTid: {{departure_time}}\nUpphämtning: {{pickup_location}}\nDestination: {{destination}}\n\nLogga in i portalen eller appen för att se all information.\n\nHelsingbuss",
    variables: ["driver_name", "order_number", "travel_date", "departure_time", "pickup_location", "destination"],
    is_active: true,
  },
  {
    key: "partner_request",
    name: "Partnerförfrågan",
    channel: "email",
    category: "Partner",
    subject: "Ny förfrågan från Helsingbuss",
    body: "Hej {{partner_name}}!\n\nVi har en ny förfrågan som vi gärna vill att ni lämnar pris på.\n\nUppdrag: {{assignment_name}}\nDatum: {{travel_date}}\nSträcka: {{route}}\nAntal resenärer: {{passenger_count}}\n\nÅterkom gärna med pris så snart som möjligt.\n\nMed vänliga hälsningar\nHelsingbuss",
    variables: ["partner_name", "assignment_name", "travel_date", "route", "passenger_count"],
    is_active: true,
  },
];

function cleanTemplate(input: any) {
  return {
    key: String(input.key || "").trim(),
    name: String(input.name || "").trim(),
    channel: String(input.channel || "email").trim(),
    category: String(input.category || "Övrigt").trim(),
    subject: String(input.subject || "").trim(),
    body: String(input.body || "").trim(),
    variables: Array.isArray(input.variables) ? input.variables : [],
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

function mergeTemplates(dbRows: any[]) {
  const dbByKey = new Map((dbRows || []).map((row) => [String(row.key), row]));

  return defaultTemplates.map((template) => {
    const saved = dbByKey.get(template.key);

    if (!saved) {
      return {
        ...template,
        source: "standard",
      };
    }

    return {
      ...template,
      ...saved,
      variables: saved.variables || template.variables || [],
      source: "sparad",
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      const warnings: string[] = [];

      if (error) {
        warnings.push("Tabellen system_message_templates finns kanske inte ännu. Kör SQL-koden för att kunna spara mallar.");
      }

      const templates = mergeTemplates(error ? [] : data || []);

      return res.status(200).json({
        ok: true,
        templates,
        defaultTemplates,
        warnings,
        summary: {
          templates: templates.length,
          active: templates.filter((template) => template.is_active !== false).length,
          saved: templates.filter((template) => template.source === "sparad").length,
        },
      });
    }

    if (req.method === "POST") {
      const template = cleanTemplate(req.body || {});

      if (!template.key || !template.name) {
        return res.status(400).json({
          ok: false,
          error: "Mallen saknar nyckel eller namn.",
        });
      }

      const { data, error } = await supabase
        .from(tableName)
        .upsert(template, { onConflict: "key" })
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({
          ok: false,
          error: "Kunde inte spara mallen. Kör SQL-koden för system_message_templates om tabellen saknas. " + error.message,
        });
      }

      return res.status(200).json({
        ok: true,
        template: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Metoden stöds inte.",
    });
  } catch (error: any) {
    console.error("/api/admin/system/notiser-mallar error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera notiser och mallar.",
    });
  }
}
