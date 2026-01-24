"use client";

import React from "react";
import Link from "next/link";

//
// ======= HÄR ÄNDRAR DU STORLEKAR SNABBT =======
// Desktop (dator/laptop):
const DESKTOP_CARD_MIN = 240; // gör större/mindre (t.ex. 360)
const DESKTOP_CARD_MAX = 280; // max-bredd per kort
const DESKTOP_GAP = 15;       // avstånd mellan kort

// Mobil (karusell):
const MOBILE_CARD_WIDTH = 300;   // fast bredd så alla blir lika stora
const MOBILE_CARD_MIN_H = 260;   // fast höjd-ish (alla lika stora)
const IMAGE_H = 100;             // bildhöjd (påverkar även ikonens placering)
const ICON_SIZE = 46;            // ikon-cirkel storlek
// =============================================

type CardItem = {
  key: string;
  title: string;
  p1: string;
  p2?: string;
  href: string;
  cta: string;
  iconLetter: string;
};

const items: CardItem[] = [
  {
    key: "foretag",
    title: "Företagsresa",
    p1: "Smidig transport till möten, kundevent och personaldagar.",
    p2: "Vi anpassar tider, stopp och komfort – ni fokuserar på dagen.",
    href: "/tjanster/foretag",
    cta: "Läs mer",
    iconLetter: "F",
  },
  {
    key: "skola",
    title: "Skola & förening",
    p1: "Trygga resor för utflykter, cuper och läger.",
    p2: "Tydlig planering, säkerhetsfokus och gott om plats för packning.",
    href: "/tjanster/skola",
    cta: "Läs mer",
    iconLetter: "S",
  },
  {
    key: "brollop",
    title: "Bröllop",
    p1: "Gör dagen enkel för gästerna och perfekt i tid.",
    p2: "Transport mellan vigsel, fest och hotell – tryggt och bekvämt.",
    href: "/tjanster/brollop",
    cta: "Läs mer",
    iconLetter: "B",
  },
  {
    key: "sport",
    title: "Sportresa",
    p1: "Lag- och supporterresor med smart logistik.",
    p2: "Plats för utrustning och tidspassat upplägg till match eller cup.",
    href: "/tjanster/sport",
    cta: "Läs mer",
    iconLetter: "S",
  },
  {
    key: "transfer",
    title: "Transfer / Flygbuss",
    p1: "Smidig resa till flyg, från centrala Helsingborg",
    p2: "Boka enkelt via Helsingbuss Airport Shuttle.",
    href: "https://hbshuttle.se",
    cta: "Till Airport Shuttle",
    iconLetter: "T",
  },
];

function Card({ item }: { item: CardItem }) {
  return (
    <div className="hb-svc-card">
      {/* IMAGE (kant-till-kant) */}
      <div className="hb-svc-img" aria-hidden="true">
        <div className="hb-svc-img__fill" />
      </div>

      {/* ICON CIRCLE (centrerad + 50/50 överlapp) */}
      <div className="hb-svc-ic">
        <span className="hb-svc-ic__txt">{item.iconLetter}</span>
      </div>

      {/* CONTENT */}
      <div className="hb-svc-content">
        <h3 className="hb-svc-title">{item.title}</h3>
        <p className="hb-svc-p">{item.p1}</p>
        {item.p2 ? <p className="hb-svc-p hb-svc-p2">{item.p2}</p> : null}

        <div className="hb-svc-btnrow">
          <Link className="hb-svc-btn" href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined}>
            {item.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ServiceCards() {
  return (
    <section className="hb-svc-wrap" aria-label="Tjänster">
      {/* Desktop grid */}
      <div className="hb-svc-grid">
        {items.map((it) => (
          <Card key={it.key} item={it} />
        ))}
      </div>

      {/* Mobil karusell */}
      <div className="hb-svc-carousel" aria-hidden="true">
        {items.map((it) => (
          <div key={it.key} className="hb-svc-slide">
            <Card item={it} />
          </div>
        ))}
      </div>

      <style>{`
        .hb-svc-wrap{
          padding: 10px 14px 28px;
        }

        /* CARD */
        .hb-svc-card{
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(255,255,255,0.70);
          box-shadow: 0 12px 30px rgba(0,0,0,0.10);
          min-height: ${MOBILE_CARD_MIN_H}px; /* mobil-lika stora */
        }

        /* IMAGE */
        .hb-svc-img{
          height: ${IMAGE_H}px;
          width: 100%;
          position: relative;
          overflow: hidden;
        }
        .hb-svc-img__fill{
          position: absolute;
          inset: 0; /* HELT ut i kanterna */
          background:
            linear-gradient(180deg, rgba(210,224,224,0.95), rgba(240,248,248,0.80));
        }

        /* ICON */
        .hb-svc-ic{
          position: absolute;
          left: 50%;
          top: ${IMAGE_H}px; /* samma som image-höjden */
          transform: translate(-50%, -50%); /* 50/50 över bild/vitt */
          width: ${ICON_SIZE}px;
          height: ${ICON_SIZE}px;
          border-radius: 999px;
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 10px 18px rgba(0,0,0,0.12);
          display: grid;
          place-items: center;
          z-index: 3;
        }
        .hb-svc-ic__txt{
          font-weight: 900;
          font-size: 14px;
          color: #1D2937;
        }

        /* CONTENT (mindre "luft") */
        .hb-svc-content{
          padding: 18px 18px 16px;
          padding-top: 26px; /* pga ikonöver-lapp */
        }
        .hb-svc-title{
          margin: 0 0 6px;
          font-weight: 900;
          color: #0f172a;
          font-size: 16px;
        }
        .hb-svc-p{
          margin: 0;
          line-height: 1.35;
          color: rgba(15, 23, 42, 0.70);
          font-size: 13px;
        }
        .hb-svc-p2{
          margin-top: 10px; /* mindre än innan */
        }

        .hb-svc-btnrow{
          margin-top: 14px;
        }
        .hb-svc-btn{
          display: inline-block;
          padding: 9px 14px;
          border-radius: 10px;
          background: rgba(0,0,0,0.72);
          color: #fff;
          font-weight: 800;
          font-size: 13px;
          text-decoration: none;
        }

        /* DESKTOP GRID */
        .hb-svc-grid{
          display: none;
          gap: ${DESKTOP_GAP}px;
          justify-content: center;
        }
        .hb-svc-carousel{
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding: 6px 2px 0;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .hb-svc-slide{
          width: ${MOBILE_CARD_WIDTH}px;
          min-width: ${MOBILE_CARD_WIDTH}px; /* alla lika breda */
          scroll-snap-align: start;
        }

        @media (min-width: 980px){
          .hb-svc-carousel{ display:none; }
          .hb-svc-grid{
            display: grid;
            grid-template-columns: repeat(5, minmax(${DESKTOP_CARD_MIN}px, ${DESKTOP_CARD_MAX}px));
          }
          .hb-svc-card{
            min-height: unset; /* desktop får växa naturligt */
          }
        }
      `}</style>
    </section>
  );
}
