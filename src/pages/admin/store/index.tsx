import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import Link from "next/link";

import StoreStats from "@/components/store/StoreStats";
import StoreSalesChart from "@/components/store/StoreSalesChart";
import RecentBookings from "@/components/store/RecentBookings";
import PendingPayments from "@/components/store/PendingPayments";

export default function StoreDashboard() {
  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24 space-y-6">

          {/* HEADER + KNAPP */}
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

          {/* STATS */}
          <StoreStats />

          {/* CHART */}
          <StoreSalesChart />

          {/* LISTOR */}
          <div className="grid lg:grid-cols-2 gap-4">
            <RecentBookings />
            <PendingPayments />
          </div>

        </main>
      </div>
    </>
  );
}
