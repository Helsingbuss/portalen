"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { OffcanvasMenu } from "./OffcanvasMenu";

export default function SiteHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Kant-till-kant bar */}
      <header className="hb-bar" role="banner">
        <div className="hb-inner">
          {/* Logo (vit) */}
          <Link href="/" className="hb-logo" aria-label="Helsingbuss">
            <Image
              src="/vit_logo.png"
              alt="Helsingbuss"
              width={210}
              height={54}
              priority
            />
          </Link>

          {/* Desktop actions (göms på mobil) */}
          <div className="hb-actions">
            <Link className="hb-cta" href="/boka-buss">
              Boka buss
            </Link>
          </div>

          {/* Hamburgare (alltid synlig) */}
          <button
            type="button"
            className="hb-burger"
            aria-label="Öppna meny"
            aria-expanded={open ? "true" : "false"}
            onClick={() => setOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Offcanvas */}
      <OffcanvasMenu open={open} onClose={() => setOpen(false)} />

      <style jsx>{`
        .hb-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 60;

          /* snygg overlay utan bakgrundsbild */
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.55) 0%,
            rgba(0, 0, 0, 0.22) 55%,
            rgba(0, 0, 0, 0) 100%
          );
        }

        .hb-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .hb-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          user-select: none;
        }

        .hb-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hb-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          background: rgba(176, 122, 42, 0.95);
          color: #fff;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .hb-cta:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
        }

        .hb-burger {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(0, 0, 0, 0.26);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          cursor: pointer;
          padding: 0;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .hb-burger span {
          display: block;
          width: 18px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
        }

        /* MOBIL: bara logo + hamburgare */
        @media (max-width: 820px) {
          .hb-actions {
            display: none;
          }
          .hb-inner {
            padding: 16px 16px;
          }
        }
      `}</style>
    </>
  );
}

