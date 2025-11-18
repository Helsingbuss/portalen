import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { sendDriverOrderMail } from "@/lib/sendDriverMail";




const supabase = (admin as any).supabaseAdmin || (admin as any).supabase || (admin as any).default;

function pickYmd(v?: string | null) {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

async function nextOrderNumber(): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(2);
  const prefix = `KO${yy}`;
  const { data, error } = await supabase
    .from("driver_orders")
    .select("order_number")
    .ilike("order_number", `${prefix}%`)
    .order("order_number", { ascending: false })
    .limit(50);
  if (error) return `${prefix}${String(1).padStart(4, "0")}`;

  let max = 0;
  for (const r of data || []) {
    const raw = (r as any).order_number as string | null;
    if (!raw) continue;
    const m = raw.replace(/\s+/g, "").match(new RegExp(`^${prefix}(\\d{1,6})$`, "i"));
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const b = req.body || {};
    const order_number = await nextOrderNumber();

    // status: "draft" (spara som utkast) eller "sent" (skapa & skicka)
    const status: "draft" | "sent" = b.status === "draft" ? "draft" : "sent";

    let payload = {
      order_number,
      status,
      booking_id: b.booking_id ?? null,
      offer_id: b.offer_id ?? null,

      driver_name: b.driver_name ?? null,
      driver_email: b.driver_email ?? null,
      vehicle_reg: b.vehicle_reg ?? null,

      contact_name: b.contact_name ?? null,
      contact_phone: b.contact_phone ?? null,
      passengers: typeof b.passengers === "number" ? b.passengers : Number(b.passengers ?? null) || null,
      notes: b.notes ?? null,

      out_from: b.out_from ?? b.from ?? null,
      out_to: b.out_to ?? b.to ?? null,
      out_date: pickYmd(b.out_date ?? b.date),
      out_time: b.out_time ?? b.time ?? null,

      ret_from: b.ret_from ?? null,
      ret_to: b.ret_to ?? null,
      ret_date: pickYmd(b.ret_date),
      ret_time: b.ret_time ?? null,
    };

    // Om booking_id Ã¤r satt men inga fÃ¤lt skickas â€“ prova autofill frÃ¥n "bookings"
    if (payload.booking_id && !payload.out_from && !payload.out_to) {
      try {
        const bk = await supabase
          .from("bookings")
          .select("departure_place, destination, departure_date, departure_time, return_departure, return_destination, return_date, return_time, passengers, contact_name, contact_phone, vehicle_reg")
          .eq("id", payload.booking_id)
          .single();
        if (!bk.error && bk.data) {
          payload = {
            ...payload,
            out_from: payload.out_from ?? (bk.data as any).departure_place ?? null,
            out_to: payload.out_to ?? (bk.data as any).destination ?? null,
            out_date: payload.out_date ?? pickYmd((bk.data as any).departure_date),
            out_time: payload.out_time ?? (bk.data as any).departure_time ?? null,
            ret_from: payload.ret_from ?? (bk.data as any).return_departure ?? null,
            ret_to: payload.ret_to ?? (bk.data as any).return_destination ?? null,
            ret_date: payload.ret_date ?? pickYmd((bk.data as any).return_date),
            ret_time: payload.ret_time ?? (bk.data as any).return_time ?? null,
            passengers: payload.passengers ?? (bk.data as any).passengers ?? null,
            contact_name: payload.contact_name ?? (bk.data as any).contact_name ?? null,
            contact_phone: payload.contact_phone ?? (bk.data as any).contact_phone ?? null,
            vehicle_reg: payload.vehicle_reg ?? (bk.data as any).vehicle_reg ?? null,
          };
        }
      } catch {}
    }

    const ins = await supabase.from("driver_orders").insert(payload).select("*").single();
    if (ins.error) return res.status(500).json({ ok: false, error: ins.error.message || "Kunde inte skapa kÃ¶rorder" });

    const order = ins.data;

    if (status === "sent") {
      try {
        await sendDriverOrderMail(order.driver_email, order.id, {
          order_number,
          date: order.out_date,
          time: order.out_time,
          from: order.out_from,
          to: order.out_to,
          ret_date: order.ret_date,
          ret_time: order.ret_time,
          ret_from: order.ret_from,
          ret_to: order.ret_to,
          vehicle_reg: order.vehicle_reg,
          contact_name: order.contact_name,
          contact_phone: order.contact_phone,
          passengers: order.passengers,
        });
      } catch (e: any) {
        console.warn("[driver-orders/create] mail fail:", e?.message || e);
      }
    }

    return res.status(200).json({ ok: true, order });
  } catch (e: any) {
    console.error("[driver-orders/create] error:", e?.message || e);
    return res.status(500).json({ ok: false, error: e?.message || "Internt fel" });
  }
}

