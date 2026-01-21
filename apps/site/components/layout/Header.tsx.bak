"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import OffcanvasMenu from "./OffcanvasMenu";

const BRAND = "#194C66";          // din färg
const EDGE_DESKTOP = 50;          // hur långt in från kanten (som dina röda streck ungefär)
const EDGE_MOBILE = 18;

const LOGO_PATH = "/brand/vit_logo.png"; // <-- ÄNDRA om din fil heter något annat i public/brand

function IconGlobe({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.93 9h-3.15a15.7 15.7 0 00-1.3-5.02A8.02 8.02 0 0119.93 11zM12 4c.9 0 2.26 2.18 3.04 7H8.96C9.74 6.18 11.1 4 12 4zM4.07 13h3.15c.2 1.78.68 3.55 1.3 5.02A8.02 8.02 0 014.07 13zm3.15-2H4.07A8.02 8.02 0 018.52 5.98 15.7 15.7 0 007.22 11zm1.74 2h6.08c-.78 4.82-2.14 7-3.04 7-.9 0-2.26-2.18-3.04-7zm7.82 5.02c.62-1.47 1.1-3.24 1.3-5.02h3.15a8.02 8.02 0 01-4.45 5.02z"
      />
    </svg>
  );
}

function IconSearch({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 2a8 8 0 105.29 14.01l4.35 4.35 1.41-1.41-4.35-4.35A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"
      />
    </svg>
  );
}

function IconMenu({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 7h16v2H4V7zm0 8h16v2H4v-2zm0-4h16v2H4v-2z" />
    </svg>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // stäng sök om man klickar utanför
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!searchOpen) return;
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setSearchOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [searchOpen]);

  // fokus på input när den öppnas
  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 0);
  }, [searchOpen]);

  const styles = useMemo(() => {
    return {
      header: {
        position: "absolute" as const,
        inset: "0 0 auto 0",
        zIndex: 50,
        width: "100%",
        pointerEvents: "none" as const, // vi aktiverar pointerEvents på inner så hover funkar utan block
      },

      inner: {
        height: 84,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: EDGE_DESKTOP,
        paddingRight: EDGE_DESKTOP,
        pointerEvents: "auto" as const,
      },

      left: { display: "flex", alignItems: "center", gap: 14 },

      logo: {
        height: 34,
        width: "auto",
        display: "block",
        filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.35))",
      },

      right: {
        display: "flex",
        alignItems: "center",
        gap: 18,
        color: "rgba(255,255,255,0.92)",
      },

      login: {
        height: 38,
        padding: "0 16px",
        borderRadius: 999,
        background: BRAND,
        color: "white",
        border: "1px solid rgba(255,255,255,0.12)",
        fontWeight: 700,
        fontSize: 14,
        lineHeight: "38px",
        textDecoration: "none",
        boxShadow: "0 14px 30px rgba(0,0,0,0.22)",
        whiteSpace: "nowrap" as const,
      },

      iconBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        margin: 0,
        width: 30,
        height: 30,
        border: "none",
        background: "transparent",
        color: "rgba(255,255,255,0.92)",
        cursor: "pointer",
        transition: "color 160ms ease, transform 160ms ease",
      },

      // popover/pill som dyker upp vid sök-ikonen (SMAL, inte hel bar)
      searchWrap: { position: "relative" as const, display: "inline-flex", alignItems: "center" },

      searchPill: {
        position: "absolute" as const,
        right: 30, // så den hamnar bakom ikonen men inte under den
        top: "50%",
        transform: "translateY(-50%)",
        width: 220, // SMALARE
        height: 42,
        borderRadius: 999,
        background: BRAND,
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 18px 38px rgba(0,0,0,0.28)",
        display: searchOpen ? "flex" : "none",
        alignItems: "center",
        padding: "0 14px",
        gap: 10,
      },

      searchInput: {
        width: "100%",
        height: 42,
        border: "none",
        outline: "none",
        background: "transparent",
        color: "white",
        fontSize: 14,
      },

      hintIcon: { color: "rgba(255,255,255,0.85)", flex: "0 0 auto" as const },

      // när du scrollar ner: visa bara 2 ikoner (sök + meny) och gör dem lite större
      compactRight: scrolled
        ? { gap: 16 }
        : {},

      compactIcon: scrolled
        ? { width: 28, height: 28 }
        : {},
    };
  }, [scrolled, searchOpen]);

  return (
    <header style={styles.header}>
      <div style={styles.inner} className="hb-header-inner">
        <div style={styles.left}>
          <Link href="/" aria-label="Helsingbuss">
            {/* vanlig <img> så du slipper bråka med next/image här */}
            <img src={LOGO_PATH} alt="Helsingbuss" style={styles.logo} />
          </Link>
        </div>

        <div style={{ ...styles.right, ...styles.compactRight }} className="hb-right">
          {/* Desktop: logga in + globe + search + menu */}
          {!scrolled && (
            <Link href="/logga-in" style={styles.login}>
              Logga in
            </Link>
          )}

          {!scrolled && (
            <button
              type="button"
              style={styles.iconBtn}
              className="hb-ico"
              aria-label="Språk"
              onClick={() => {}}
            >
              <IconGlobe />
            </button>
          )}

          <div style={styles.searchWrap} ref={wrapRef} className="hb-searchwrap" onMouseEnter={() => setSearchOpen(true)} onMouseLeave={() => setSearchOpen(false)}>
            <div style={styles.searchPill} className="hb-searchpill" aria-hidden={!searchOpen}>
              <span style={styles.hintIcon}>
                <IconSearch size={18} />
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Vad letar du efter?"
                style={styles.searchInput}
              />
            </div>

            <button
              type="button"
              style={{ ...styles.iconBtn, ...styles.compactIcon }}
              className="hb-ico"
              aria-label="Sök"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <IconSearch />
            </button>
          </div>

          <button
            type="button"
            style={{ ...styles.iconBtn, ...styles.compactIcon }}
            className="hb-ico"
            aria-label="Meny"
            onClick={() => {}}
          >
            <IconMenu />
          </button>
        </div>
      </div>

      <style jsx>{`
        /* Mobil: bara logo + hamburgare (du sa exakt detta) */
        @media (max-width: 240px) {
          .hb-header-inner {
            padding-left: ${EDGE_MOBILE}px !important;
            padding-right: ${EDGE_MOBILE}px !important;
            height: 72px !important;
          }
          .hb-right :global(a),
          .hb-right :global(button[aria-label="Språk"]),
          .hb-searchwrap {
            display: none !important;
          }
        }

        /* Hover-färg på ikoner = din färg */
        .hb-ico:hover {
          color: ${BRAND} !important;
          transform: translateY(-1px);
        }

        /* Gör pillen lite lyxigare */
        .hb-searchpill {
          backdrop-filter: blur(10px);
        }
      `}</style>
    </header>
  );
}





