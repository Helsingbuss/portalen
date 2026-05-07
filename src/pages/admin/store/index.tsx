import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import Link from "next/link";

type DashboardData = {
  totalRevenue: number;
  paidCount: number;
  unpaidCount: number;
  bookingsCount: number;
  recent: any[];
  pending: any[];
};

function money(n: number) {
  return n.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

export default function StoreDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/store/dashboard")
      .then((res) => res.json())
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-[#194C66]">
              Butik / Kassa
            </h1>

            <Link
              href="/admin/store/checkout"
              className="bg-[#194C66] text-white px-4 py-2 rounded-full text-sm"
            >
              + Ny bokning
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow p-5 text-sm text-gray-500">
              Laddar butik/kassa...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Stat title="Omsättning" value={money(data?.totalRevenue || 0)} />
                <Stat title="Betalda" value={data?.paidCount || 0} />
                <Stat title="Obetalda" value={data?.unpaidCount || 0} />
                <Stat title="Bokningar" value={data?.bookingsCount || 0} />
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <List title="Senaste bokningar" rows={data?.recent || []} />
                <List title="Väntar på betalning" rows={data?.pending || []} />
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-[#194C66]">{value}</div>
    </div>
  );
}

function List({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <h2 className="font-semibold text-[#194C66]">{title}</h2>

      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Inget att visa.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border bg-[#f8fafc] p-3 text-sm"
            >
              <div className="font-semibold text-[#0f172a]">
                {row.booking_number || "—"} · {row.customer_name || "—"}
              </div>

              <div className="mt-1 text-gray-500">
                {row.sundra_trips?.title || "Sundra resa"}
              </div>

              <div className="mt-2 flex justify-between">
                <span>{row.payment_status || "unpaid"}</span>
                <span className="font-semibold">
                  {money(Number(row.total_amount || 0))}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
