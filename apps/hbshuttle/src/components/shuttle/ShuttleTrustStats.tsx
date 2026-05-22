const trustStats = [
  {
    title: "4,8 av 5 i betyg",
    text: "baserat på 2000+ omdömen",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 5.5l5.7 11.6 12.8 1.9-9.3 9 2.2 12.7L24 34.7 12.6 40.7 14.8 28l-9.3-9 12.8-1.9L24 5.5z" />
      </svg>
    )
  },
  {
    title: "Över 10 000",
    text: "nöjda resenärer varje månad",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M18 23a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
        <path d="M30 24a6 6 0 1 0 0-12" />
        <path d="M6 39c1.5-7 6.2-11 12-11s10.5 4 12 11" />
        <path d="M29 29c5.5.5 9.6 4.2 11 10" />
      </svg>
    )
  },
  {
    title: "Tryggt & säkert",
    text: "Din säkerhet är vår prioritet",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 5l16 6v11c0 10.5-6.8 17.5-16 21-9.2-3.5-16-10.5-16-21V11l16-6z" />
        <path d="M16.5 24l5 5 10-11" />
      </svg>
    )
  }
];

export default function ShuttleTrustStats() {
  return (
    <section className="shuttle-trust-section">
      <div className="shuttle-trust-inner">
        {trustStats.map((item) => (
          <article className="shuttle-trust-item" key={item.title}>
            <div className="shuttle-trust-icon">{item.icon}</div>

            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
