import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminApi } from "@/lib/adminApi";

function formatPayment(row: any) {
  return {
    id: row.id,
    title: row.title,
    customer: row.customer_name,
    amount: Number(row.amount || 0),
    status: row.status,
    createdAt: row.created_at,
    paymentUrl: row.sumup_payment_url,
    reference: row.order_reference,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireAdminApi(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Metoden stöds inte." });
    return;
  }

  const { supabaseAdmin } = auth;

  const { data: orders, error } = await supabaseAdmin
    .from("app_store_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const rows = orders || [];

  const todayRows = rows.filter((row: any) => {
    const created = new Date(row.created_at);
    return created >= todayStart;
  });

  const todaySales = todayRows
    .filter((row: any) => row.status === "paid")
    .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

  const pendingPayments = rows.filter((row: any) =>
    ["pending", "reserved"].includes(row.status)
  ).length;

  const reservedItems = rows.filter((row: any) => row.status === "reserved").length;
  const paidToday = todayRows.filter((row: any) => row.status === "paid").length;

  res.status(200).json({
    todaySales,
    pendingPayments,
    reservedItems,
    paidToday,
    products: [
      {
        id: "shuttle",
        title: "Flygbussbiljett",
        subtitle: "Skapa eller reservera biljett till Airport Shuttle.",
        type: "shuttle_ticket",
        priceFrom: 129,
        available: 48,
        status: "Tillgänglig",
      },
      {
        id: "trip",
        title: "Sundra resa",
        subtitle: "Reservera plats på dagsresa, event eller paketresa.",
        type: "trip_ticket",
        priceFrom: 299,
        available: 32,
        status: "Tillgänglig",
      },
      {
        id: "booking",
        title: "Bokning/offert",
        subtitle: "Skapa betalningslänk kopplad till bokning eller offert.",
        type: "booking",
        priceFrom: 0,
        available: 0,
        status: "Manuell",
      },
      {
        id: "custom",
        title: "Annan betalning",
        subtitle: "Skicka valfri SumUp-länk till kund.",
        type: "custom",
        priceFrom: 0,
        available: 0,
        status: "Manuell",
      },
    ],
    recentPayments: rows.slice(0, 15).map(formatPayment),
  });
}
