import Link from "next/link";

const appFeatures = [
  "Köp biljett direkt i appen",
  "Få live-uppdateringar",
  "Spara dina resor och favoriter"
];

export default function AppPromoSection() {
  return (
    <section className="app-promo-section">
      <div className="app-promo-inner">
        <div className="app-promo-content">
          <h2>
            Allt i fickan.
            <span>Helsingbuss-appen.</span>
          </h2>

          <ul className="app-promo-list">
            {appFeatures.map((feature) => (
              <li key={feature}>
                <span>✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="app-store-buttons">
            <Link href="/appen" className="store-button store-button-apple">
              <span className="store-icon"></span>
              <span>
                <small>Hämta i</small>
                App Store
              </span>
            </Link>

            <Link href="/appen" className="store-button store-button-google">
              <span className="google-play-icon">
                <i />
              </span>
              <span>
                <small>Ladda ned på</small>
                Google Play
              </span>
            </Link>
          </div>
        </div>

        <div className="app-promo-phones" aria-hidden="true">
          <div className="phone-mockup phone-mockup-light">
            <div className="phone-top">
              <span>9:41</span>
              <span>● ● ●</span>
            </div>

            <div className="phone-logo">Helsingbuss</div>
            <div className="phone-subtitle">Airport Shuttle</div>

            <div className="phone-section-title">Mina resor</div>

            <div className="phone-list">
              <div>
                <strong>Helsingborg → Malmö Airport</strong>
                <span>12 maj · 08:30</span>
              </div>
              <div>
                <strong>Malmö Airport → Helsingborg</strong>
                <span>19 maj · 15:45</span>
              </div>
              <div>
                <strong>Köp ny biljett</strong>
                <span>Snabb bokning</span>
              </div>
              <div>
                <strong>Live-trafik</strong>
                <span>Aktuella uppdateringar</span>
              </div>
            </div>
          </div>

          <div className="phone-mockup phone-mockup-dark">
            <div className="phone-top phone-top-dark">
              <span>9:41</span>
              <span>● ● ●</span>
            </div>

            <div className="ticket-title">Enkel biljett</div>
            <div className="ticket-route">
              Helsingborg
              <span>→ Malmö Airport</span>
            </div>

            <div className="ticket-qr">
              <div className="qr-grid" />
            </div>

            <div className="ticket-code">A1B2 C3D4 E5F6</div>

            <div className="ticket-info">
              <div>
                <span>Giltig till</span>
                <strong>12 maj 2025, 08:30</strong>
              </div>
              <div>
                <span>Passagerare</span>
                <strong>1 vuxen</strong>
              </div>
              <div>
                <span>Pris</span>
                <strong>129 kr</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
