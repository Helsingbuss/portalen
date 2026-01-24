import React from "react";
import Link from "next/link";
import Image from "next/image";

// =============================================
// ======= HÄR ÄNDRAR DU STORLEKAR SNABBT =======
// Desktop (dator/laptop):
const DESKTOP_CARD_MIN = 240; // gör större/mindre (t.ex. 360)
const DESKTOP_CARD_MAX = 280; // max-bredd per kort
const DESKTOP_GAP = 15;       // avstånd mellan kort

// Mobil (karusell):
const MOBILE_CARD_WIDTH = 300; // fast bredd så alla blir lika stora
const MOBILE_CARD_MIN_H = 260; // fast höjd-ish (alla lika stora)
const IMAGE_H = 100;           // bildhöjd (påverkar även ikonens placering)
const ICON_SIZE = 46;          // ikon-cirkel storlek
// =============================================

type CardItem = {
  title: string;
  textTop: string;
  textBottom: string;
  buttonText: string;
  href: string;
  iconSrc: string; // /brand/icons/...
};

const items: CardItem[] = [
  {
    title: "Företagsresa",
    textTop: "Smidig transport till möten, kundevent och personaldagar.",
    textBottom: "Vi anpassar tider, stopp och komfort – ni fokuserar på dagen.",
    buttonText: "Läs mer",
    href: "/tjanster/foretagsresa",
    iconSrc: "/brand/icons/trust-alt.png",
  },
  {
    title: "Skola & förening",
    textTop: "Trygga resor för utflykter, cuper och läger.",
    textBottom: "Tydlig planering, säkerhetsfokus och gott om plats för packning.",
    buttonText: "Läs mer",
    href: "/tjanster/skola-forening",
    iconSrc: "/brand/icons/workshop.png",
  },
  {
    title: "Bröllop",
    textTop: "Gör dagen enkel för gästerna och perfekt i tid.",
    textBottom: "Transport mellan vigsel, fest och hotell – tryggt och bekvämt.",
    buttonText: "Läs mer",
    href: "/tjanster/brollop",
    iconSrc: "/brand/icons/rings-wedding.png",
  },
  {
    title: "Sportresa",
    textTop: "Lag- och supporterresor med smart logistik.",
    textBottom: "Plats för utrustning och tidspassat upplägg till match eller cup.",
    buttonText: "Läs mer",
    href: "/tjanster/sportresa",
    iconSrc: "/brand/icons/running.png",
  },
  {
    title: "Transfer / Flygbuss",
    textTop: "Smidig resa till flyg, från centrala Helsingborg.",
    textBottom: "Boka enkelt via Helsingbuss Airport Shuttle.",
    buttonText: "Till Airport Shuttle",
    href: "https://hbshuttle.se",
    iconSrc: "/brand/icons/airplane-journey.png",
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ServiceCards() {
  // Förhindrar sidscroll från själva sektionen (extra skydd)
  const sectionStyle: React.CSSProperties = {
    width: "100%",
    overflowX: "clip",
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "0 16px 26px",
  };

  // Desktop grid (ingen horisontell scroll)
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(5, minmax(${DESKTOP_CARD_MIN}px, 1fr))`,
    gap: DESKTOP_GAP,
    alignItems: "stretch",
  };

  // Begränsa så kort inte blir för breda (och orsakar overflow)
  const gridWrapStyle: React.CSSProperties = {
    width: "100%",
  };

  // Mobil karusell (endast den får scrolla)
  const carouselStyle: React.CSSProperties = {
    display: "flex",
    gap: 14,
    overflowX: "auto",
    padding: "2px 2px 10px",
    scrollSnapType: "x mandatory",
    WebkitOverflowScrolling: "touch",
    overscrollBehaviorX: "contain",
  };

  // Responsive: Visa grid på desktop, karusell på mobil
  // Vi gör det utan styled-jsx: via inline "display" och media-query i globals
  // Därför använder vi klassnamn.
  return (
    <section style={sectionStyle}>
      <div style={innerStyle}>
        <div className="hb-servicecards-gridwrap" style={gridWrapStyle}>
          <div className="hb-servicecards-grid" style={gridStyle}>
            {items.map((item) => (
              <Card key={item.title} item={item} desktop />
            ))}
          </div>

          <div className="hb-servicecards-carousel" style={carouselStyle}>
            {items.map((item) => (
              <Card key={item.title + "-m"} item={item} desktop={false} />
            ))}
          </div>
        </div>
      </div>

      {/* Minimal global CSS via vanlig <style> (INTE jsx-prop) */}
      <style>{`
        /* Desktop: visa grid, dölj karusell */
        @media (min-width: 900px) {
          .hb-servicecards-grid { display: grid !important; }
          .hb-servicecards-carousel { display: none !important; }
        }

        /* Mobil: visa karusell, dölj grid */
        @media (max-width: 899px) {
          .hb-servicecards-grid { display: none !important; }
          .hb-servicecards-carousel { display: flex !important; }
        }
      `}</style>
    </section>
  );
}

function Card({ item, desktop }: { item: CardItem; desktop: boolean }) {
  const cardW = desktop
    ? "auto"
    : `${MOBILE_CARD_WIDTH}px`;

  const minH = desktop ? undefined : `${MOBILE_CARD_MIN_H}px`;

  // “Boxarna större” på desktop = mer luft inuti + maxbredd kontrolleras av grid + DESKTOP_* konstanter
  // Ikon-halva i bild/halva i vitt = top = IMAGE_H, translateY(-50%)
  // “Rubriken 2 steg ner” = mer paddingTop + marginTop på title
  const cardStyle: React.CSSProperties = {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    background: "rgba(255,255,255,0.86)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
    border: "1px solid rgba(255,255,255,0.65)",
    width: cardW,
    minHeight: minH,
    scrollSnapAlign: desktop ? undefined : "start",
  };

  const imageWrapStyle: React.CSSProperties = {
    height: IMAGE_H,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  };

  // Kant-till-kant “bild”
  const imageBgStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(210,224,224,0.95), rgba(240,248,248,0.80))",
  };

  // Ikon-cirkeln: centrerad + 50/50 överlapp
  const iconCircleStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: IMAGE_H, // samma som image-höjden
    transform: "translate(-50%, -50%)",
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 999,
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
    display: "grid",
    placeItems: "center",
    zIndex: 3,
    border: "1px solid rgba(0,0,0,0.06)",
  };

  // Mer luft från cirkeln till rubriken (”2 steg ner”)
  // Vi flyttar ner rubriken genom:
  // 1) paddingTop lite mer
  // 2) title marginTop lite mer
  const contentStyle: React.CSSProperties = {
    padding: "22px 18px 18px",
    paddingTop: 44, // <-- detta ger luft under cirkeln
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
    margin: "10px 0 8px", // <-- mer luft under cirkeln
    lineHeight: 1.2,
    textAlign: "left",
  };

  const pStyle: React.CSSProperties = {
    margin: "0 0 10px",
    color: "rgba(17,24,39,0.72)",
    fontSize: 13.5,
    lineHeight: 1.55, // mindre “luft mellan raderna” än innan
  };

  const btnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    background: "rgba(17,24,39,0.82)",
    color: "white",
    fontWeight: 800,
    fontSize: 13,
    textDecoration: "none",
    boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
    marginTop: 6,
  };

  // Begränsa maxbredd på desktop-kort (så grid inte gör dem gigantiska)
  if (desktop) {
    const max = clamp(DESKTOP_CARD_MAX, DESKTOP_CARD_MIN, 500);
    cardStyle.maxWidth = `${max}px`;
    cardStyle.minWidth = `${DESKTOP_CARD_MIN}px`;
  }

  const isExternal = item.href.startsWith("http");

  const Button = (
    <span style={btnStyle}>
      {item.buttonText}
    </span>
  );

  return (
    <div style={cardStyle}>
      {/* IMAGE */}
      <div style={imageWrapStyle}>
        <div style={imageBgStyle} />
      </div>

      {/* ICON */}
      <div style={iconCircleStyle}>
        <Image
          src={item.iconSrc}
          alt=""
          width={22}
          height={22}
          style={{ objectFit: "contain" }}
          priority={false}
        />
      </div>

      {/* CONTENT */}
      <div style={contentStyle}>
        <div style={titleStyle}>{item.title}</div>

        <p style={pStyle}>{item.textTop}</p>
        <p style={pStyle}>{item.textBottom}</p>

        {isExternal ? (
          <a href={item.href} target="_blank" rel="noreferrer">
            {Button}
          </a>
        ) : (
          <Link href={item.href}>{Button}</Link>
        )}
      </div>
    </div>
  );
}
