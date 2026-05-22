"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type MenuItem = {
  label: string;
  href: string;
  isClub?: boolean;
};

const mainMenuItems: MenuItem[] = [
  { label: "Köp", href: "/kop" },
  { label: "Tidtabell", href: "/tidtabell" },
  { label: "Trafikinfo", href: "/trafikinfo" },
  { label: "Min biljett", href: "/min-biljett" },
  { label: "Language", href: "/language" },
  { label: "Helsingbuss Club", href: "/club", isClub: true }
];

const hamburgerMenuItems: MenuItem[] = [
  { label: "Biljetter och priser", href: "/biljetter-och-priser" },
  { label: "Planera din resa", href: "/planera-din-resa" },
  { label: "Flygplatser", href: "/flygplatser" },
  { label: "Trafikinformation", href: "/trafikinfo" },
  { label: "Om Helsingbuss Airport Shuttle", href: "/om-oss" }
];

export default function ShuttleNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="shuttle-header">
      <nav className="shuttle-navbar" aria-label="Huvudmeny">
        <div className="shuttle-nav-left">
          <Link
            href="/"
            className="shuttle-logo"
            aria-label="Helsingbuss Airport Shuttle startsida"
          >
            <Image
              src="/images/brand/hb-airport-shuttle-logo.png"
              alt="Helsingbuss Airport Shuttle"
              width={210}
              height={70}
              priority
              className="shuttle-logo-img"
            />
          </Link>
        </div>

        <div className="shuttle-nav-center">
          {mainMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shuttle-menu-link ${item.isClub ? "is-club" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="shuttle-nav-right">
          <Link href="/kop" className="shuttle-book-button">
            Boka resa
          </Link>

          <button
            type="button"
            className={`shuttle-menu-button ${menuOpen ? "is-open" : ""}`}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Stäng meny" : "Öppna meny"}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="shuttle-more-menu">
          <div className="shuttle-more-menu-card">
            <div className="shuttle-more-menu-top">
              <div className="shuttle-more-menu-heading">
                <p>Meny</p>
                <span>Hitta resa, priser, trafikinfo och flygplatser.</span>
              </div>

              <button type="button" onClick={() => setMenuOpen(false)}>
                Stäng
              </button>
            </div>

            <div className="shuttle-more-links">
              {hamburgerMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shuttle-more-link"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="shuttle-more-link-text">{item.label}</span>
                  <span className="shuttle-more-link-arrow">→</span>
                </Link>
              ))}
            </div>

            <div className="shuttle-more-bottom">
              <Link
                href="/logga-in"
                className="shuttle-login-button"
                onClick={() => setMenuOpen(false)}
              >
                Logga in
              </Link>

              <Link
                href="/club"
                className="shuttle-club-card"
                onClick={() => setMenuOpen(false)}
              >
                <div className="shuttle-club-badge">HB</div>

                <div className="shuttle-club-content">
                  <strong>Helsingbuss Club</strong>
                  <small>
                    Tjäna poäng på varje resa och samla dina biljetter på ett
                    ställe.
                  </small>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
