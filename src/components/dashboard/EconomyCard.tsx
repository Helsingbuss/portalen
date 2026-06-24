import React from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import {
  MapPinIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

type Props = {
  from: string;
  to: string;
  totals?: any;
  loading?: boolean;
  heightClass?: string;
};

const departures = [
  {
    line: "811 Flygbuss",
    direction: "Utresa",
    route: "Helsingborg C → Ängelholms Flygplats",
    time: "08:40 – 09:20",
    stops: "Via Helsingborg Stattena och Ängelholm Station",
    badge: "Planerad",
    badgeColor: "bg-emerald-500",
    icon: "airport",
  },
  {
    line: "811 Flygbuss",
    direction: "Hemresa",
    route: "Ängelholms Flygplats → Helsingborg C",
    time: "10:05 – 10:45",
    stops: "Via Ängelholm Station och Helsingborg Stattena",
    badge: "Planerad",
    badgeColor: "bg-emerald-500",
    icon: "return",
  },
  {
    line: "812 Flygbuss",
    direction: "Kommande linje",
    route: "Båstad → Ängelholms Flygplats",
    time: "Tidtabell kommer",
    stops: "Planerad för kommande trafikupplägg",
    badge: "Kommer",
    badgeColor: "bg-sky-500",
    icon: "route",
  },
  {
    line: "831 Flygbuss",
    direction: "Kommande linje",
    route: "Helsingborg → Malmö Airport",
    time: "Tidtabell kommer",
    stops: "Planerad för Sturup/Malmö Airport",
    badge: "Kommer",
    badgeColor: "bg-sky-500",
    icon: "airport",
  },
];

export default function EconomyCard({
  from,
  to,
  totals,
  loading = false,
  heightClass = "h-[420px]",
}: Props) {
  const rangeLabel = `${from} – ${to}`;
  const totalDepartures = totals?.departures ?? departures.length;

  return (
    <div className={`bg-white rounded-xl shadow px-5 py-4 flex flex-col ${heightClass}`}>
      {/* HEADER */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[#194C66] font-semibold text-lg">
            Flygbussavgångar
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            {rangeLabel} · {totalDepartures} linjer/avgångar
          </p>
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
        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {departures.map((departure) => (
            <Card
              key={`${departure.line}-${departure.direction}-${departure.time}`}
              departure={departure}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* CARD */
function Card({ departure }: any) {
  const icon =
    departure.icon === "return" ? (
      <ArrowPathIcon className="h-5 w-5 text-[#007764]" />
    ) : departure.icon === "route" ? (
      <MapPinIcon className="h-5 w-5 text-[#007764]" />
    ) : (
      <PaperAirplaneIcon className="h-5 w-5 text-[#007764]" />
    );

  return (
    <div className="flex items-center justify-between bg-[#F9FAFB] rounded-xl p-4 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-sm shrink-0">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#111827] truncate">
              {departure.line}
            </p>
            <span className="text-[11px] text-[#007764] font-semibold">
              {departure.direction}
            </span>
          </div>

          <p className="text-xs text-gray-700 truncate">
            {departure.route}
          </p>

          <p className="text-xs text-gray-500 truncate">
            {departure.time} · {departure.stops}
          </p>
        </div>
      </div>

      <span className={`px-2 py-1 rounded-full text-xs text-white shrink-0 ${departure.badgeColor}`}>
        {departure.badge}
      </span>
    </div>
  );
}
