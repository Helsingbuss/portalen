import Link from "next/link";

export default function TimetableHero() {
  return (
    <section className="timetable-hero-section">
      <div className="timetable-hero-inner">
        <nav className="timetable-breadcrumb" aria-label="Brödsmulor">
          <Link href="/">Hem</Link>
          <span>›</span>
          <span>Tidtabell</span>
        </nav>

        <div className="timetable-hero-card">
          <div className="timetable-hero-content">
            <p className="timetable-eyebrow">Helsingbuss Airport Shuttle</p>

            <h1>Tidtabell</h1>

            <p className="timetable-hero-text">
              Här hittar du aktuella avgångar för Helsingbuss Airport Shuttle.
              Välj linje för att se avgångar, restider och dagar.
            </p>

            <div className="timetable-hero-actions">
              <Link href="/kop" className="timetable-primary-button">
                Köp biljett
              </Link>

              <Link href="/trafikinfo" className="timetable-secondary-button">
                Se trafikinfo
              </Link>
            </div>
          </div>

          <div className="timetable-hero-info">
            <div className="timetable-status-card">
              <span className="status-dot" />
              <div>
                <strong>Trafiken går enligt plan</strong>
                <p>Eventuella ändringar visas här och i trafikinfo.</p>
              </div>
            </div>

            <div className="timetable-mini-grid">
              <div>
                <span>Linjer</span>
                <strong>3</strong>
              </div>

              <div>
                <span>Avgångar</span>
                <strong>Dagligen</strong>
              </div>

              <div>
                <span>Bokning</span>
                <strong>Online</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
