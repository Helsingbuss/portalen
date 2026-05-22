export default function ShuttleHero() {
  return (
    <section className="shuttle-hero-section">
      <div className="shuttle-hero-card">
        <div className="shuttle-hero-card-overlay" />

        <div className="shuttle-hero-text">
          <h1>
            <span>Till flyget.</span>
            <span>Utan stress.</span>
            <span>Vi kör.</span>
          </h1>

          <p>
            Direktbussar mellan Helsingborg,
            <br />
            Lund och Skånes flygplatser.
          </p>
        </div>

        <div className="shuttle-search-preview" aria-hidden="true" />
      </div>
    </section>
  );
}
