// src/pages/dashboard.tsx
import {
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  UsersIcon,
  ChartBarIcon,
  TicketIcon,
} from "@heroicons/react/24/solid";
import Layout from "../components/Layout";

export default function Dashboard() {
  return (
    <Layout active="dashboard">
      <h1 className="text-xl font-bold mb-6">Hem</h1>

      {/* Vita boxen */}
      <div className="w-full bg-white rounded-lg shadow p-8">
        {/* Top big cards */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="h-[225px] bg-gradient-to-r from-pink-300 to-purple-300 rounded-lg shadow-md p-6 flex flex-col justify-center">
            <h2 className="text-lg font-bold">Helsingbuss Booking</h2>
            <p className="text-sm">Order, Offerter, Bokning</p>
          </div>
          <div className="h-[225px] bg-gradient-to-r from-purple-300 to-pink-300 rounded-lg shadow-md p-6 flex flex-col justify-center">
            <h2 className="text-lg font-bold">Helsingbuss VisualPlan</h2>
            <p className="text-sm">Grafisk bussplanering, Chaufförsplanering</p>
          </div>
        </div>

        {/* Small app cards */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white border rounded-lg shadow-sm p-5 flex items-center gap-3 h-28 hover:shadow-md transition">
            <UsersIcon className="h-8 w-8 text-red-400" />
            <div>
              <h3 className="font-bold">Helsingbuss CrewCenter</h3>
              <p className="text-sm text-gray-500">
                Chaufförregister, Bokningsagenter
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-5 flex items-center gap-3 h-28 hover:shadow-md transition">
            <BanknotesIcon className="h-8 w-8 text-red-400" />
            <div>
              <h3 className="font-bold">Helsingbuss PriceBoard</h3>
              <p className="text-sm text-gray-500">Hantera dina priser</p>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-5 flex items-center gap-3 h-28 hover:shadow-md transition">
            <ClipboardDocumentListIcon className="h-8 w-8 text-red-400" />
            <div>
              <h3 className="font-bold">Helsingbuss Lejmodul</h3>
              <p className="text-sm text-gray-500">
                Ta emot offerter från samarbetspartners
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-5 flex items-center gap-3 h-28 hover:shadow-md transition">
            <ChartBarIcon className="h-8 w-8 text-red-400" />
            <div>
              <h3 className="font-bold">Trafivo Reports</h3>
              <p className="text-sm text-gray-500">Journalföring, Rapporter</p>
            </div>
          </div>

          <div className="bg-white border rounded-lg shadow-sm p-5 flex items-center gap-3 h-28 hover:shadow-md transition">
            <CalendarDaysIcon className="h-8 w-8 text-red-400" />
            <div>
              <h3 className="font-bold">Helsingbuss Schedule</h3>
              <p className="text-sm text-gray-500">
                Linjebussmodul & Schema
              </p>
            </div>
          </div>

          {/* Ny ruta: Paketresor */}
          <div className="bg-white border rounded-lg shadow-sm p-5 flex items-center gap-3 h-28 hover:shadow-md transition">
            <TicketIcon className="h-8 w-8 text-red-400" />
            <div>
              <h3 className="font-bold">Helsingbuss Paketresor</h3>
              <p className="text-sm text-gray-500">
                Biljetter och biljettpriser till paketresor
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
