import type { NextApiRequest, NextApiResponse } from "next";
import admin from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const authorization =
      String(req.headers.authorization || "");

    const accessToken =
      authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";

    if (!accessToken) {
      return res.status(401).json({
        ok: false,
        error: "Du är inte inloggad.",
      });
    }

    const {
      data: authData,
      error: authError,
    } = await admin.auth.getUser(accessToken);

    if (
      authError ||
      !authData?.user
    ) {
      return res.status(401).json({
        ok: false,
        error: "Sessionen kunde inte verifieras.",
      });
    }

    const {
      data,
      error,
    } = await admin
      .from("bestallningstrafik_inquiries")
      .select(
        [
          "id",
          "inquiry_number",
          "customer_name",
          "contact_name",
          "pickup_address",
          "destination_address",
          "passengers",
          "created_at",
          "status",
          "source",
          "travel_type",
        ].join(","),
      )
      .eq("status", "new")
      .eq("source", "helsingbuss-2027")
      .eq("travel_type", "Beställningstrafik")
      .order("created_at", {
        ascending: false,
      })
      .limit(15);

    if (error) {
      console.error(
        "[inquiry-notifications]",
        error,
      );

      return res.status(500).json({
        ok: false,
        error:
          "Kunde inte hämta nya förfrågningar.",
      });
    }

    const notifications =
      (data || []).map((row: any) => ({
        id:
          String(row.id || ""),

        inquiryNumber:
          String(
            row.inquiry_number ||
            "Förfrågan",
          ),

        customerName:
          String(
            row.customer_name ||
            row.contact_name ||
            "Kund",
          ),

        pickupAddress:
          String(
            row.pickup_address ||
            "Okänd start",
          ),

        destinationAddress:
          String(
            row.destination_address ||
            "Okänt resmål",
          ),

        passengers:
          row.passengers === null ||
          row.passengers === undefined
            ? null
            : Number(row.passengers),

        createdAt:
          row.created_at
            ? String(row.created_at)
            : null,
      }));

    return res.status(200).json({
      ok: true,
      notifications,
    });

  } catch (error: any) {

    console.error(
      "[inquiry-notifications]",
      error,
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Kunde inte hämta notiser.",
    });
  }
}