const knowItems = [
  {
    title: "Närvaro",
    text: "Vi rekommenderar att du är på plats 15 minuter innan avgång.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M15 8h18a3 3 0 0 1 3 3v29H12V11a3 3 0 0 1 3-3z" />
        <path d="M18 15h12" />
        <path d="M18 21h12" />
        <path d="M18 27h8" />
        <path d="M10 40h28" />
        <path d="M31 8v8h5" />
      </svg>
    )
  },
  {
    title: "Bagage",
    text: "En resväska och ett handbagage ingår i priset.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M16 18h16a4 4 0 0 1 4 4v17H12V22a4 4 0 0 1 4-4z" />
        <path d="M19 18v-4a5 5 0 0 1 10 0v4" />
        <path d="M17 39v3" />
        <path d="M31 39v3" />
        <path d="M18 25h12" />
      </svg>
    )
  },
  {
    title: "Ändringar",
    text: "Fri ombokning upp till 24h innan avresa.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M36 17a14 14 0 0 0-24-3" />
        <path d="M12 14v-7" />
        <path d="M12 14h7" />
        <path d="M12 31a14 14 0 0 0 24 3" />
        <path d="M36 34v7" />
        <path d="M36 34h-7" />
        <path d="M24 17v8l5 3" />
      </svg>
    )
  }
];

export default function TimetableKnowBefore() {
  return (
    <section className="timetable-know-section">
      <div className="timetable-know-inner">
        <div className="timetable-know-heading">
          <h2>Bra att veta</h2>
          <span />
        </div>

        <div className="timetable-know-grid">
          {knowItems.map((item) => (
            <article className="timetable-know-card" key={item.title}>
              <div className="timetable-know-icon">{item.icon}</div>

              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
