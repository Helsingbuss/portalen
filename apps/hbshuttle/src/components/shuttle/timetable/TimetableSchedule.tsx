"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type RouteKey = "helsingborg-malmo" | "helsingborg-angelholm" | "lund-malmo";
type Direction = "outbound" | "return";

type DepartureRow = {
  from: string;
  departure: string;
  arrival: string;
  duration: string;
  days: string;
};

type RouteData = {
  from: string;
  to: string;
  outboundRows: DepartureRow[];
  returnRows: DepartureRow[];
};

const timetableData: Record<RouteKey, RouteData> = {
  "helsingborg-malmo": {
    from: "Helsingborg",
    to: "Malmö Airport",
    outboundRows: [
      { from: "Helsingborg C", departure: "03:45", arrival: "04:25", duration: "40 min", days: "Varje dag" },
      { from: "Helsingborg C", departure: "05:15", arrival: "05:55", duration: "40 min", days: "Varje dag" },
      { from: "Helsingborg C", departure: "06:45", arrival: "07:25", duration: "40 min", days: "Varje dag" },
      { from: "Helsingborg C", departure: "08:15", arrival: "08:55", duration: "40 min", days: "Varje dag" },
      { from: "Helsingborg C", departure: "09:45", arrival: "10:25", duration: "40 min", days: "Varje dag" }
    ],
    returnRows: [
      { from: "Malmö Airport", departure: "05:10", arrival: "05:50", duration: "40 min", days: "Varje dag" },
      { from: "Malmö Airport", departure: "06:40", arrival: "07:20", duration: "40 min", days: "Varje dag" },
      { from: "Malmö Airport", departure: "08:10", arrival: "08:50", duration: "40 min", days: "Varje dag" },
      { from: "Malmö Airport", departure: "10:10", arrival: "10:50", duration: "40 min", days: "Varje dag" },
      { from: "Malmö Airport", departure: "12:10", arrival: "12:50", duration: "40 min", days: "Varje dag" }
    ]
  },

  "helsingborg-angelholm": {
    from: "Helsingborg",
    to: "Ängelholm Airport",
    outboundRows: [
      { from: "Helsingborg C", departure: "04:30", arrival: "05:05", duration: "35 min", days: "Varje dag" },
      { from: "Helsingborg C", departure: "07:00", arrival: "07:35", duration: "35 min", days: "Varje dag" },
      { from: "Helsingborg C", departure: "11:30", arrival: "12:05", duration: "35 min", days: "Varje dag" },
      { from: "Helsingborg C", departure: "15:15", arrival: "15:50", duration: "35 min", days: "Varje dag" },
      { from: "Helsingborg C", departure: "18:45", arrival: "19:20", duration: "35 min", days: "Varje dag" }
    ],
    returnRows: [
      { from: "Ängelholm Airport", departure: "06:10", arrival: "06:45", duration: "35 min", days: "Varje dag" },
      { from: "Ängelholm Airport", departure: "08:30", arrival: "09:05", duration: "35 min", days: "Varje dag" },
      { from: "Ängelholm Airport", departure: "12:45", arrival: "13:20", duration: "35 min", days: "Varje dag" },
      { from: "Ängelholm Airport", departure: "16:40", arrival: "17:15", duration: "35 min", days: "Varje dag" },
      { from: "Ängelholm Airport", departure: "20:10", arrival: "20:45", duration: "35 min", days: "Varje dag" }
    ]
  },

  "lund-malmo": {
    from: "Lund",
    to: "Malmö Airport",
    outboundRows: [
      { from: "Lund C", departure: "04:10", arrival: "04:40", duration: "30 min", days: "Varje dag" },
      { from: "Lund C", departure: "06:10", arrival: "06:40", duration: "30 min", days: "Varje dag" },
      { from: "Lund C", departure: "09:10", arrival: "09:40", duration: "30 min", days: "Varje dag" },
      { from: "Lund C", departure: "13:10", arrival: "13:40", duration: "30 min", days: "Varje dag" },
      { from: "Lund C", departure: "17:10", arrival: "17:40", duration: "30 min", days: "Varje dag" }
    ],
    returnRows: [
      { from: "Malmö Airport", departure: "05:20", arrival: "05:50", duration: "30 min", days: "Varje dag" },
      { from: "Malmö Airport", departure: "07:20", arrival: "07:50", duration: "30 min", days: "Varje dag" },
      { from: "Malmö Airport", departure: "10:20", arrival: "10:50", duration: "30 min", days: "Varje dag" },
      { from: "Malmö Airport", departure: "14:20", arrival: "14:50", duration: "30 min", days: "Varje dag" },
      { from: "Malmö Airport", departure: "18:20", arrival: "18:50", duration: "30 min", days: "Varje dag" }
    ]
  }
};

const routeKeys: RouteKey[] = [
  "helsingborg-malmo",
  "helsingborg-angelholm",
  "lund-malmo"
];

export default function TimetableSchedule() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>("helsingborg-malmo");
  const [direction, setDirection] = useState<Direction>("outbound");

  const activeData = timetableData[activeRoute];

  const currentRouteLabel = useMemo(() => {
    if (direction === "outbound") {
      return `${activeData.from} → ${activeData.to}`;
    }

    return `${activeData.to} → ${activeData.from}`;
  }, [activeData, direction]);

  const rows = direction === "outbound" ? activeData.outboundRows : activeData.returnRows;

  function toggleDirection() {
    setDirection((current) => (current === "outbound" ? "return" : "outbound"));
  }

  function selectRoute(routeKey: RouteKey) {
    setActiveRoute(routeKey);
    setDirection("outbound");
  }

  return (
    <section className="timetable-section">
      <div className="timetable-container">
        <nav className="timetable-breadcrumbs" aria-label="Brödsmulor">
          <Link href="/">Hem</Link>
          <span>›</span>
          <span>Tidtabell</span>
        </nav>

        <div className="timetable-heading">
          <h1>Tidtabell</h1>
          <p>
            Här hittar du aktuella avgångar. Tiderna kan variera
            <br />
            vid helgdagar och storhelger.
          </p>
        </div>

        <div className="timetable-route-tabs">
          {routeKeys.map((routeKey) => {
            const route = timetableData[routeKey];

            return (
              <button
                key={routeKey}
                type="button"
                className={activeRoute === routeKey ? "active" : ""}
                onClick={() => selectRoute(routeKey)}
              >
                {route.from} → {route.to}
              </button>
            );
          })}
        </div>

        <div className="timetable-direction-bar">
          <div>
            <span>Vald riktning</span>
            <strong>{currentRouteLabel}</strong>
          </div>

          <button type="button" onClick={toggleDirection}>
            <span>↔</span>
            Vänd riktning
          </button>
        </div>

        <div className="timetable-table-card">
          <div className="timetable-table-scroll">
            <table className="timetable-table">
              <thead>
                <tr>
                  <th>Från</th>
                  <th>Avgång</th>
                  <th>Ankomst</th>
                  <th>Restid</th>
                  <th>Måndag - Söndag</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.from}-${row.departure}-${index}`}>
                    <td>{row.from}</td>
                    <td>{row.departure}</td>
                    <td>{row.arrival}</td>
                    <td>{row.duration}</td>
                    <td>{row.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="timetable-more-button" type="button">
            Visa fler avgångar
            <span>⌄</span>
          </button>
        </div>
      </div>
    </section>
  );
}
