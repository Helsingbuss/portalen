"use client";

import { useState } from "react";
import Link from "next/link";

type TravelDate = {
  id: string;
  day: string;
  date: string;
};

type Departure = {
  id: string;
  departureTime: string;
  arrivalTime: string;
  from: string;
  to: string;
  duration: string;
  price: number;
};

const dates: TravelDate[] = [
  { id: "2024-04-22", day: "Mån", date: "22 apr" },
  { id: "2024-04-23", day: "Tis", date: "23 apr" },
  { id: "2024-04-24", day: "Ons", date: "24 apr" },
  { id: "2024-04-25", day: "Tor", date: "25 apr" },
  { id: "2024-04-26", day: "Fre", date: "26 apr" }
];

const departures: Departure[] = [
  {
    id: "dep-0515",
    departureTime: "05:15",
    arrivalTime: "05:55",
    from: "Helsingborg C",
    to: "Malmö Airport",
    duration: "40 min",
    price: 129
  },
  {
    id: "dep-0645",
    departureTime: "06:45",
    arrivalTime: "07:25",
    from: "Helsingborg C",
    to: "Malmö Airport",
    duration: "40 min",
    price: 129
  },
  {
    id: "dep-0815",
    departureTime: "08:15",
    arrivalTime: "08:55",
    from: "Helsingborg C",
    to: "Malmö Airport",
    duration: "40 min",
    price: 129
  },
  {
    id: "dep-0945",
    departureTime: "09:45",
    arrivalTime: "10:25",
    from: "Helsingborg C",
    to: "Malmö Airport",
    duration: "40 min",
    price: 129
  }
];

export default function BookingDepartureSection() {
  const [activeDate, setActiveDate] = useState("2024-04-24");

  return (
    <section className="booking-section">
      <div className="booking-container">
        <nav className="booking-breadcrumbs" aria-label="Brödsmulor">
          <Link href="/">Hem</Link>
          <span>›</span>
          <span>Boka resa</span>
        </nav>

        <div className="booking-layout">
          <aside className="booking-summary-card">
            <h1>Din resa</h1>

            <div className="booking-summary-route">
              <strong>Helsingborg C</strong>
              <span>→</span>
              <strong>Malmö Airport</strong>
            </div>

            <div className="booking-summary-info">
              <div>
                <span>Datum</span>
                <strong>24 apr 2024</strong>
              </div>

              <div>
                <span>Resenärer</span>
                <strong>1 vuxen</strong>
              </div>
            </div>

            <button type="button" className="booking-change-button">
              <span>↺</span>
              Ändra sökning
            </button>
          </aside>

          <div className="booking-departures-card">
            <div className="booking-card-top">
              <h2>Välj avgång</h2>

              <div className="booking-date-nav" aria-label="Välj datum">
                <button type="button" className="booking-date-arrow" aria-label="Föregående dagar">
                  ‹
                </button>

                <div className="booking-date-tabs">
                  {dates.map((date) => (
                    <button
                      key={date.id}
                      type="button"
                      className={`booking-date-tab ${activeDate === date.id ? "is-active" : ""}`}
                      onClick={() => setActiveDate(date.id)}
                    >
                      <span>{date.day}</span>
                      <strong>{date.date}</strong>
                    </button>
                  ))}
                </div>

                <button type="button" className="booking-date-arrow" aria-label="Nästa dagar">
                  ›
                </button>
              </div>
            </div>

            <div className="booking-departure-list">
              {departures.map((departure) => (
                <article className="booking-departure-row" key={departure.id}>
                  <div className="booking-time-block">
                    <strong>{departure.departureTime}</strong>
                    <span>{departure.from}</span>
                  </div>

                  <div className="booking-route-dot">
                    <span />
                  </div>

                  <div className="booking-time-block">
                    <strong>{departure.arrivalTime}</strong>
                    <span>{departure.to}</span>
                  </div>

                  <div className="booking-duration">
                    <span>⏱</span>
                    {departure.duration}
                  </div>

                  <div className="booking-price">
                    {departure.price} kr
                  </div>

                  <button type="button" className="booking-select-button">
                    Välj
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="booking-benefit-strip">
          <article>
            <span>✈</span>
            <div>
              <h3>Snabb bokning</h3>
              <p>Boka på bara några klick.</p>
            </div>
          </article>

          <article>
            <span>▣</span>
            <div>
              <h3>Säkra betalningar</h3>
              <p>Betala tryggt och enkelt.</p>
            </div>
          </article>

          <article>
            <span>▯</span>
            <div>
              <h3>Biljett i mobilen</h3>
              <p>Din biljett direkt i appen.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
