const benefits = [
  {
    title: "Flera avgångar",
    subtitle: "varje dag",
    text: "Flexibla tider som passar din resa.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="16" />
        <path d="M24 14v10l6 4" />
        <path d="M35.5 12.5l2.5-2.5" />
        <path d="M10 10l2.5 2.5" />
        <path d="M18 7h12" />
        <path d="M24 4v3" />
      </svg>
    )
  },
  {
    title: "Gratis WiFi",
    subtitle: "ombord",
    text: "Uppkoppling utan extra kostnad.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M9 20c8.5-7.5 21.5-7.5 30 0" />
        <path d="M15 26c5.2-4.7 12.8-4.7 18 0" />
        <path d="M20.5 32c2.2-2 4.8-2 7 0" />
        <circle cx="24" cy="37" r="2" />
        <path d="M24 37h.01" />
      </svg>
    )
  },
  {
    title: "Bekväma säten",
    subtitle: "och gott om plats",
    text: "Res bekvämt med oss.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M16 9v19" />
        <path d="M16 28h17c3.3 0 6 2.7 6 6v5" />
        <path d="M11 39h29" />
        <path d="M19 9h10c4.4 0 8 3.6 8 8v8" />
        <path d="M16 19h21" />
        <path d="M12 32h4" />
      </svg>
    )
  },
  {
    title: "Boka enkelt",
    subtitle: "i mobilen",
    text: "Smidig bokning direkt i mobilen.",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="15" y="6" width="18" height="36" rx="4" />
        <path d="M20 11h8" />
        <path d="M21 32l3 3 6-7" />
        <path d="M23.8 38h.4" />
      </svg>
    )
  }
];

export default function ShuttleBenefitsSection() {
  return (
    <section className="shuttle-benefits-section">
      <div className="shuttle-benefits-inner">
        {benefits.map((benefit) => (
          <article className="shuttle-benefit-card" key={benefit.title}>
            <div className="shuttle-benefit-icon">
              {benefit.icon}
            </div>

            <h3>
              {benefit.title}
              <span>{benefit.subtitle}</span>
            </h3>

            <p>{benefit.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
