import Link from "next/link";

export default function TimetableHelpCTA() {
  return (
    <section className="timetable-help-section">
      <div className="timetable-help-inner">
        <div className="timetable-help-content">
          <span className="timetable-help-label">Behöver du hjälp?</span>

          <h2>Hittar du inte rätt avgång?</h2>

          <p>
            Kontrollera aktuell trafikinfo eller kontakta kundservice så hjälper
            vi dig att hitta rätt resa till eller från flygplatsen.
          </p>
        </div>

        <div className="timetable-help-actions">
          <Link href="/trafikinfo" className="timetable-help-primary">
            Se trafikinfo
          </Link>

          <Link href="/kundservice" className="timetable-help-secondary">
            Kontakta kundservice
          </Link>
        </div>
      </div>
    </section>
  );
}
