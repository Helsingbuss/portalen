import Image from "next/image";
import Link from "next/link";

const topLinks = [
  { label: "Kundservice", href: "/kundservice" },
  { label: "Om Airport Shuttle", href: "/om-oss" },
  { label: "Resevillkor", href: "/resevillkor" },
  { label: "Integritetspolicy", href: "/integritetspolicy" },
  { label: "Cookies", href: "/cookies" },
  { label: "Tillgänglighet", href: "/tillganglighet" }
];

const quickLinks = [
  { label: "Köp biljett", href: "/kop" },
  { label: "Tidtabell", href: "/tidtabell" },
  { label: "Trafikinfo", href: "/trafikinfo" },
  { label: "Min biljett", href: "/min-biljett" },
  { label: "Helsingbuss Club", href: "/club" }
];

const infoLinks = [
  { label: "Biljetter och priser", href: "/biljetter-och-priser" },
  { label: "Planera din resa", href: "/planera-din-resa" },
  { label: "Flygplatser", href: "/flygplatser" },
  { label: "Resevillkor", href: "/resevillkor" },
  { label: "Vanliga frågor", href: "/fragor-svar" }
];

export default function ShuttleFooter() {
  return (
    <footer className="shuttle-footer">
      <div className="shuttle-footer-top">
        <div className="shuttle-footer-top-inner">
          {topLinks.map((link) => (
            <Link key={link.href} href={link.href} className="shuttle-footer-top-link">
              <span className="footer-small-icon" aria-hidden="true">✦</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="shuttle-footer-main">
        <div className="shuttle-footer-grid">
          <div className="shuttle-footer-brand">
            <Link href="/" className="shuttle-footer-logo" aria-label="Helsingbuss Airport Shuttle startsida">
              <Image
                src="/images/brand/hb-airport-shuttle-logo.png"
                alt="Helsingbuss Airport Shuttle"
                width={230}
                height={78}
                className="shuttle-footer-logo-img"
              />
            </Link>

            <p>
              Helsingbuss Airport Shuttle gör det enklare att resa till och från
              flygplatsen. Vi fokuserar på trygghet, tydliga avgångar och en
              smidig resa från bokning till ankomst.
            </p>
          </div>

          <div className="shuttle-footer-column">
            <h3>Snabblänkar</h3>
            <ul>
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span>✓</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="shuttle-footer-column">
            <h3>Resa & info</h3>
            <ul>
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span>•</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="shuttle-footer-contact">
            <h3>Kontakt</h3>

            <div className="footer-contact-list">
              <a href="tel:+46104053838">
                <span>☎</span>
                010 - 405 38 38
              </a>

              <a href="mailto:info@helsingbuss.se">
                <span>✉</span>
                info@helsingbuss.se
              </a>

              <p>
                <span>⌖</span>
                Helsingborg
              </p>
            </div>
          </div>

          <div className="shuttle-footer-hours">
            <h3>Chatt / Telefon</h3>

            <div className="footer-hours-list">
              <p>
                <span>◷</span>
                <strong>Mån - Fre:</strong> 09:00 - 17:00
              </p>
              <p>
                <span>◷</span>
                <strong>Lör - Sön:</strong> Begränsad support
              </p>
              <p>
                <span>△</span>
                <strong>Trafikinfo:</strong> Vid aktuella störningar
              </p>
              <p>
                <span>✓</span>
                <strong>Biljetter:</strong> Digitalt via webben
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="shuttle-footer-bottom">
        <div className="shuttle-footer-bottom-inner">
          <p>© Helsingbuss Airport Shuttle 2026</p>

          <div className="shuttle-footer-legal">
            <Link href="/integritetspolicy">Integritet</Link>
            <Link href="/resevillkor">Resevillkor</Link>
            <Link href="/cookies">Cookies</Link>
          </div>

          <div className="shuttle-footer-socials" aria-label="Sociala medier">
            <Link href="#" aria-label="Facebook">f</Link>
            <Link href="#" aria-label="Instagram">◎</Link>
            <Link href="#" aria-label="LinkedIn">in</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
