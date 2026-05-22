import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const { customer_id, status } = req.query;

      let query = supabase
        .from("customer_agreements")
        .select(`
          *,
          customers (
            id,
            name,
            company_name,
            customer_type,
            email,
            phone
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (customer_id) {
        query = query.eq(
          "customer_id",
          String(customer_id)
        );
      }

      if (status && String(status) !== "all") {
        query = query.eq(
          "status",
          String(status)
        );
      }

      const { data, error } =
        await query;

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        agreements: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.customer_id) {
        return res.status(400).json({
          ok: false,
          error: "customer_id saknas.",
        });
      }

      if (!body.agreement_name?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Avtalsnamn saknas.",
        });
      }

      const insertData = {
        customer_id:
          body.customer_id,

        agreement_name:
          body.agreement_name,

        agreement_number:
          body.agreement_number ||
          null,

        agreement_type:
          body.agreement_type ||
          "standard",

        discount_percent:
          Number(
            body.discount_percent || 0
          ),

        fixed_discount_amount:
          Number(
            body.fixed_discount_amount || 0
          ),

        hourly_price:
          body.hourly_price !== "" &&
          body.hourly_price !== undefined
            ? Number(
                body.hourly_price
              )
            : null,

        km_price:
          body.km_price !== "" &&
          body.km_price !== undefined
            ? Number(body.km_price)
            : null,

        minimum_price:
          body.minimum_price !== "" &&
          body.minimum_price !== undefined
            ? Number(
                body.minimum_price
              )
            : null,

        invoice_terms:
          body.invoice_terms ||
          null,

        payment_terms_days:
          Number(
            body.payment_terms_days ||
              30
          ),

        valid_from:
          body.valid_from || null,

        valid_until:
          body.valid_until || null,

        applies_to:
          body.applies_to ||
          "all",

        route_or_service:
          body.route_or_service ||
          null,

        internal_notes:
          body.internal_notes ||
          null,

        customer_notes:
          body.customer_notes ||
          null,

        status:
          body.status || "active",

        updated_at:
          new Date().toISOString(),
      };

      const { data, error } =
        await supabase
          .from(
            "customer_agreements"
          )
          .insert(insertData)
          .select(`
            *,
            customers (
              id,
              name,
              company_name
            )
          `)
          .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        agreement: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error(
      "/api/admin/customers/agreements error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hantera kundavtal.",
    });
  }
}
