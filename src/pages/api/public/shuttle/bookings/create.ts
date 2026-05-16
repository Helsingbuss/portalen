import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function toNumber(value: any, fallback = 0) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function makeBookingNumber() {
  const year = new Date()
    .getFullYear()
    .toString()
    .slice(-2);

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `AS${year}${random}`;
}

function makeTicketNumber() {
  const year = new Date()
    .getFullYear()
    .toString()
    .slice(-2);

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `AST${year}${random}`;
}

function baseUrl() {
  const raw =
    process.env
      .NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.CUSTOMER_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";

  return raw.replace(/\/$/, "");
}

async function createSumUpCheckout({
  bookingId,
  bookingNumber,
  amount,
  currency,
  description,
}: {
  bookingId: string;
  bookingNumber: string;
  amount: number;
  currency: string;
  description: string;
}) {
  const apiKey =
    process.env.SUMUP_API_KEY;

  const merchantCode =
    process.env.SUMUP_MERCHANT_CODE;

  if (!apiKey) {
    throw new Error(
      "SUMUP_API_KEY saknas i env."
    );
  }

  if (!merchantCode) {
    throw new Error(
      "SUMUP_MERCHANT_CODE saknas i env."
    );
  }

  const successUrl = `${baseUrl()}/shuttle/bekraftelse/${bookingId}?payment=sumup`;

  const response = await fetch(
    "https://api.sumup.com/v0.1/checkouts",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        checkout_reference:
          bookingNumber,

        amount: Number(
          amount.toFixed(2)
        ),

        currency,

        merchant_code:
          merchantCode,

        description,

        return_url: successUrl,
        redirect_url: successUrl,
      }),
    }
  );

  const json = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    console.error(
      "SumUp shuttle checkout error:",
      json
    );

    throw new Error(
      json?.message ||
        json?.error ||
        "Kunde inte skapa betalning."
    );
  }

  return {
    id: json.id,

    checkout_reference:
      json.checkout_reference,

    checkout_url:
      json.checkout_url ||
      json.redirect_url ||
      json.hosted_checkout_url ||
      null,

    raw: json,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error:
          "Method not allowed",
      });
    }

    const body = req.body || {};

    if (!body.departure_id) {
      return res.status(400).json({
        ok: false,
        error:
          "Avgång saknas.",
      });
    }

    if (
      !body.customer_name ||
      !body.customer_email ||
      !body.customer_phone
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Kunduppgifter saknas.",
      });
    }

    const passengersCount =
      Math.max(
        1,
        toNumber(
          body.passengers_count,
          1
        )
      );

    const {
      data: departure,
      error: depError,
    } = await supabaseAdmin
      .from("shuttle_departures")
      .select(`
        *,
        shuttle_routes (
          id,
          name,
          route_code,
          default_price
        )
      `)
      .eq(
        "id",
        body.departure_id
      )
      .single();

    if (depError) {
      throw depError;
    }

    if (!departure) {
      return res.status(404).json({
        ok: false,
        error:
          "Avgången hittades inte.",
      });
    }

    if (
      departure.status !== "open"
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Avgången är inte bokningsbar.",
      });
    }

    const capacity = Number(
      departure.capacity || 0
    );

    const booked = Number(
      departure.booked_count || 0
    );

    const seatsLeft =
      capacity - booked;

    if (
      seatsLeft <
      passengersCount
    ) {
      return res.status(400).json({
        ok: false,

        error: `Det finns bara ${Math.max(
          0,
          seatsLeft
        )} platser kvar.`,
      });
    }

    const route: any =
      Array.isArray(
        departure.shuttle_routes
      )
        ? departure
            .shuttle_routes[0]
        : departure.shuttle_routes;

    let unitPrice = toNumber(
      body.price,
      0
    );

    if (!unitPrice) {
      unitPrice =
        toNumber(
          departure.price,
          0
        ) ||
        toNumber(
          route?.default_price,
          0
        );
    }

    const subtotal =
      unitPrice *
      passengersCount;

    let discountAmount =
      toNumber(
        body.discount_amount,
        0
      );

    let discountCode =
      body.discount_code || null;

    if (discountCode) {
      const {
        data: campaign,
        error: campaignError,
      } = await supabaseAdmin
        .from(
          "shuttle_campaigns"
        )
        .select("*")
        .eq(
          "code",
          String(
            discountCode
          ).toUpperCase()
        )
        .eq(
          "status",
          "active"
        )
        .maybeSingle();

      if (campaignError) {
        throw campaignError;
      }

      if (campaign) {
        if (
          campaign.discount_type ===
          "fixed"
        ) {
          discountAmount =
            toNumber(
              campaign.discount_amount,
              0
            );
        } else {
          discountAmount =
            Math.round(
              subtotal *
                (toNumber(
                  campaign.discount_percent,
                  0
                ) /
                  100)
            );
        }
      }
    }

    const totalAmount =
      Math.max(
        0,
        subtotal -
          discountAmount
      );

    const currency =
      body.currency || "SEK";

    const bookingNumber =
      makeBookingNumber();

    const ticketNumber =
      makeTicketNumber();

    const {
      data: passenger,
      error: passengerError,
    } = await supabaseAdmin
      .from(
        "shuttle_passengers"
      )
      .insert({
        customer_name:
          body.customer_name,

        customer_email:
          body.customer_email,

        customer_phone:
          body.customer_phone,

        total_trips: 0,
        total_spent: 0,

        status: "active",

        updated_at:
          new Date().toISOString(),
      })
      .select()
      .single();

    if (passengerError) {
      throw passengerError;
    }

    const {
      data: booking,
      error: bookingError,
    } = await supabaseAdmin
      .from(
        "shuttle_bookings"
      )
      .insert({
        booking_number:
          bookingNumber,

        departure_id:
          departure.id,

        route_id:
          departure.route_id ||
          route?.id ||
          null,

        customer_name:
          body.customer_name,

        customer_email:
          body.customer_email,

        customer_phone:
          body.customer_phone,

        passengers_count:
          passengersCount,

        ticket_type:
          body.ticket_type ||
          "single_adult",

        subtotal,

        discount_code:
          discountCode,

        discount_amount:
          discountAmount,

        total_amount:
          totalAmount,

        currency,

        status:
          "pending_payment",

        payment_status:
          "unpaid",

        notes:
          body.notes ||
          null,

        updated_at:
          new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      throw bookingError;
    }

    const qrCode = `SHUTTLE:${ticketNumber}:${booking.id}`;

    const {
      data: ticket,
      error: ticketError,
    } = await supabaseAdmin
      .from("shuttle_tickets")
      .insert({
        ticket_number:
          ticketNumber,

        booking_id:
          booking.id,

        passenger_id:
          passenger.id,

        departure_id:
          departure.id,

        route_id:
          departure.route_id ||
          route?.id ||
          null,

        customer_name:
          body.customer_name,

        customer_email:
          body.customer_email,

        customer_phone:
          body.customer_phone,

        ticket_type:
          body.ticket_type ||
          "single_adult",

        passengers_count:
          passengersCount,

        subtotal,

        discount_amount:
          discountAmount,

        total_amount:
          totalAmount,

        currency,

        payment_status:
          "unpaid",

        ticket_status:
          "pending_payment",

        qr_code: qrCode,

        notes:
          body.notes ||
          null,

        updated_at:
          new Date().toISOString(),
      })
      .select()
      .single();

    if (ticketError) {
      throw ticketError;
    }

    const sumup =
      await createSumUpCheckout(
        {
          bookingId:
            booking.id,

          bookingNumber:
            booking
              .booking_number,

          amount:
            totalAmount,

          currency,

          description: `${
            route?.name ||
            "Airport Shuttle"
          } - ${
            booking.booking_number
          }`,
        }
      );

    await supabaseAdmin
      .from(
        "shuttle_bookings"
      )
      .update({
        payment_reference:
          sumup.id ||
          sumup.checkout_reference ||
          null,

        payment_url:
          sumup.checkout_url,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", booking.id);

    await supabaseAdmin
      .from(
        "shuttle_tickets"
      )
      .update({
        payment_reference:
          sumup.id ||
          sumup.checkout_reference ||
          null,

        payment_method:
          "sumup",

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", ticket.id);

    await supabaseAdmin
      .from(
        "shuttle_departures"
      )
      .update({
        booked_count:
          booked +
          passengersCount,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        departure.id
      );

    if (discountCode) {
      const {
        data: currentCampaign,
        error:
          currentCampaignError,
      } = await supabaseAdmin
        .from(
          "shuttle_campaigns"
        )
        .select(
          "id, used_count"
        )
        .eq(
          "code",
          String(
            discountCode
          ).toUpperCase()
        )
        .maybeSingle();

      if (
        currentCampaignError
      ) {
        throw currentCampaignError;
      }

      if (currentCampaign) {
        await supabaseAdmin
          .from(
            "shuttle_campaigns"
          )
          .update({
            used_count:
              Number(
                currentCampaign.used_count ||
                  0
              ) + 1,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            currentCampaign.id
          );
      }
    }

    return res.status(201).json({
      ok: true,

      booking_id:
        booking.id,

      booking_number:
        booking.booking_number,

      ticket_id:
        ticket.id,

      ticket_number:
        ticket.ticket_number,

      checkout_url:
        sumup.checkout_url,

      payment_url:
        sumup.checkout_url,

      redirect_url: `/shuttle/bekraftelse/${booking.id}`,
    });
  } catch (e: any) {
    console.error(
      "/api/public/shuttle/bookings/create error:",
      e?.message || e
    );

    return res.status(500).json({
      ok: false,

      error:
        e?.message ||
        "Kunde inte skapa shuttle-bokning.",
    });
  }
}
