// src/components/dashboard/EconomyCard.tsx
import React, { useEffect, useState } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import {
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/solid";

type Props = {
  from: string;
  to: string;
  totals?: any; // 🔥 FIX
  loading?: boolean;
  heightClass?: string;
};

export default function EconomyCard({
  from,
  to,
  totals, // 🔥 FIX (behöver finnas här)
  loading = false,
  heightClass = "h-[420px]",
}: Props) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard/platforms")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const rangeLabel = `${from} – ${to}`;

  return (
    <div className={`bg-white rounded-xl shadow px-5 py-4 flex flex-col ${heightClass}`}>
      
      {/* HEADER */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[#194C66] font-semibold text-lg">
            Trafik & plattformar
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">{rangeLabel}</p>
        </div>

        <button className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-2.5 py-2">
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          Laddar…
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* APP */}
          <Card
            icon={<DevicePhoneMobileIcon className="h-5 w-5 text-blue-600" />}
            title="Appen"
            text={
              data?.app
                ? `${data.app.bookings} bokningar • ${data.app.visits} användare`
                : "Lanseras snart"
            }
            badge="Kommer snart"
            badgeColor="bg-blue-500"
          />

          {/* HELSINGBUSS */}
          <Card
            icon={<GlobeAltIcon className="h-5 w-5 text-green-600" />}
            title="Helsingbuss.se"
            text={
              data?.helsingbuss
                ? `${data.helsingbuss.visits} besök • ${data.helsingbuss.clicks} klick • ${data.helsingbuss.offers} offerter`
                : "Laddar..."
            }
            badge="Live"
            badgeColor="bg-green-500"
          />

          {/* SHUTTLE */}
          <Card
            icon={<PaperAirplaneIcon className="h-5 w-5 text-indigo-600" />}
            title="hbshuttle.se"
            text={
              data?.shuttle
                ? `${data.shuttle.visits} besök • ${data.shuttle.clicks} sökningar • ${data.shuttle.bookings} bokningar`
                : "Laddar..."
            }
            badge="Live"
            badgeColor="bg-green-500"
          />

        </div>
      )}
    </div>
  );
}

/* CARD */
function Card({ icon, title, text, badge, badgeColor }: any) {
  return (
    <div className="flex items-center justify-between bg-[#F9FAFB] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-sm">
          {icon}
        </div>

        <div>
          <p className="text-sm font-medium text-[#111827]">{title}</p>
          <p className="text-xs text-gray-500">{text}</p>
        </div>
      </div>

      <span className={`px-2 py-1 rounded-full text-xs text-white ${badgeColor}`}>
        {badge}
      </span>
    </div>
  );
}
