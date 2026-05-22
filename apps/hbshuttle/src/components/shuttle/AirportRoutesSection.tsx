import Link from "next/link";

type AirportRouteCard = {
  from: string;
  to: string;
  priceFrom: number;
  href: string;
  image: string;
};

const airportRoutes: AirportRouteCard[] = [
  {
    from: "Helsingborg",
    to: "Malmö Airport",
    priceFrom: 129,
    href: "/kop?from=helsingborg&to=malmo-airport",
    image: "/images/airports/malmo-airport-1.jpg"
  },
  {
    from: "Lund",
    to: "Malmö Airport",
    priceFrom: 129,
    href: "/kop?from=lund&to=malmo-airport",
    image: "/images/airports/malmo-airport-2.jpg"
  },
  {
    from: "Helsingborg",
    to: "Ängelholm Airport",
    priceFrom: 129,
    href: "/kop?from=helsingborg&to=angelholm-airport",
    image: "/images/airports/angelholm-airport.jpg"
  }
];

export default function AirportRoutesSection() {
  return (
    <section className="airport-routes-section">
      <div className="airport-routes-inner">
        <div className="airport-routes-heading">
          <span className="airport-routes-icon" aria-hidden="true">
            ✈
          </span>

          <div>
            <h2>Vi kör till dessa flygplatser</h2>
            <div className="airport-routes-heading-line" />
          </div>
        </div>

        <div className="airport-routes-grid">
          {airportRoutes.map((route) => (
            <Link
              key={`${route.from}-${route.to}`}
              href={route.href}
              className="airport-route-card"
              style={{ backgroundImage: `url(${route.image})` }}
            >
              <div className="airport-route-overlay" />

              <div className="airport-route-price">
                <span>Från</span>
                <strong>{route.priceFrom} kr</strong>
              </div>

              <div className="airport-route-content">
                <h3>
                  {route.from} <span>→</span>
                  <br />
                  {route.to}
                </h3>

                <div className="airport-route-arrow" aria-hidden="true">
                  →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
