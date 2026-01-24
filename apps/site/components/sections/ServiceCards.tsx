import React from "react";
import Image from "next/image";

type Card = {
  title: string;
  lead: string;
  body: string;
  button: { label: string; href: string };
  imageSrc: string; // /public/...
  iconSrc: string;  // /public/brand/icons/...
};

//
// ======= HÄR ÄNDRAR DU STORLEKAR SNABBT =======
// Desktop (dator/laptop):
const DESKTOP_CARD_MIN = 240; // behåll
const DESKTOP_CARD_MAX = 280; // behåll
const DESKTOP_GAP = 10;       // du vill ha 10 nu

// Mobil (karusell):
const MOBILE_CARD_WIDTH = 300;   // fast bredd så alla blir lika stora
const MOBILE_CARD_MIN_H = 260;   // fast höjd-ish (alla lika stora)
const IMAGE_H = 140;             // bildhöjd
const ICON_SIZE = 50;            // ikon-cirkel storlek
const ICON_TO_TITLE = 20;        // mellan cirkel och rubrik (du sa 20)

// Bild/overlay lyx
const IMAGE_BLUR_PX = 0.9;       // <-- ÄNDRA BLURR-STYRKA HÄR (t.ex 0.81.6)
const OVERLAY_OPACITY = 0.50;    // <-- ÄNDRA OVERLAY-STYRKA HÄR (0.650.95)
// =============================================

const CARDS: Card[] = [
  {
    title: "Företagsresa",
    lead: "Smidig transport till möten, kundevent och personaldagar.",
    body: "Vi anpassar tider, stopp och komfort  ni fokuserar på dagen.",
    button: { label: "Läs mer", href: "/tjanster/foretagsresa" },
    imageSrc: "/company_bus.jpeg",
    iconSrc: "/brand/icons/trust-alt.png",
  },
  {
    title: "Skola & förening",
    lead: "Trygga resor för utflykter, cuper och läger.",
    body: "Tydlig planering, säkerhetsfokus och gott om plats för packning.",
    button: { label: "Läs mer", href: "/tjanster/skola-forening" },
    imageSrc: "/skola_bus.jpg",
    iconSrc: "/brand/icons/workshop.png",
  },
  {
    title: "Bröllop",
    lead: "Gör dagen enkel för gästerna och perfekt i tid.",
    body: "Transport mellan vigsel, fest och hotell  tryggt och bekvämt.",
    button: { label: "Läs mer", href: "/tjanster/brollop" },
    imageSrc: "/wedding_bus.jpeg",
    iconSrc: "/brand/icons/rings-wedding.png",
  },
  {
    title: "Sportresa",
    lead: "Lag- och supporterresor med smart logistik.",
    body: "Plats för utrustning och tidspassat upplägg till match eller cup.",
    button: { label: "Läs mer", href: "/tjanster/sportresa" },
    imageSrc: "/sport_forening_bus.jpeg",
    iconSrc: "/brand/icons/running.png",
  },
  {
    title: "Transfer / Flygbuss",
    lead: "Smidig resa till flyg, från centrala Helsingborg.",
    body: "Boka enkelt via Helsingbuss Airport Shuttle.",
    button: { label: "Till Airport Shuttle", href: "https://hbshuttle.se" },
    imageSrc: "/flygbuss_bus.jpeg",
    iconSrc: "/brand/icons/airplane-journey.png",
  },
];

export default function ServiceCards() {
  return (
    <section style={wrap}>
      {/* Desktop grid */}
      <div className="hb-desktop-only" style={desktopWrap}>
        <div style={desktopGrid}>
          {CARDS.map((item) => (
            <CardItem key={item.title} item={item} />
          ))}
        </div>
      </div>

      {/* Mobile carousel */}
      <div className="hb-mobile-only" style={mobileWrap}>
        <div style={mobileRail} aria-label="Tjänster (karusell)">
          {CARDS.map((item) => (
            <div key={item.title} style={mobileSnap}>
              <CardItem item={item} mobile />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CardItem({ item, mobile }: { item: Card; mobile?: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        overflow: "hidden",
        background: "rgba(255,255,255,0.90)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
        border: "1px solid rgba(255,255,255,0.70)",
        width: mobile ? MOBILE_CARD_WIDTH : "100%",
        minHeight: mobile ? MOBILE_CARD_MIN_H : undefined,
      }}
    >
      {/* IMAGE */}
      <div style={{ height: IMAGE_H, width: "100%", position: "relative", overflow: "hidden" }}>
        <Image
          src={item.imageSrc}
          alt={item.title}
          fill
          sizes={mobile ? "320px" : "280px"}
          style={{
            objectFit: "cover",
            transform: "scale(1.06)",
            filter: `blur(${IMAGE_BLUR_PX}px) saturate(1.08) contrast(1.06)`,
          }}
          priority={false}
        />

        {/* LYXLIG OVERLAY */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            opacity: OVERLAY_OPACITY,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 42%, rgba(0,0,0,0.30) 100%)," +
              "radial-gradient(120% 80% at 22% 14%, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.00) 60%)," +
              "radial-gradient(95% 70% at 78% 16%, rgba(196,154,72,0.28) 0%, rgba(196,154,72,0.00) 58%)," +
              "linear-gradient(90deg, rgba(196,154,72,0.12) 0%, rgba(255,255,255,0.00) 40%, rgba(196,154,72,0.10) 100%)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />
      </div>

      {/* ICON CIRCLE */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: IMAGE_H,
          transform: "translate(-50%, -50%)",
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: 999,
          background: "rgba(255,255,255,0.96)",
          boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
          display: "grid",
          placeItems: "center",
          zIndex: 3,
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <Image
          src={item.iconSrc}
          alt=""
          width={26}
          height={26}
          style={{ opacity: 0.92 }}
        />
      </div>

      {/* CONTENT */}
      <div
        style={{
          padding: "22px 18px 18px",
          paddingTop: 22 + ICON_TO_TITLE,
          display: "grid",
          gap: 10, // mindre luft mellan textblock (som du vill)
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0B1220" }}>{item.title}</div>

          <div style={{ color: "rgba(11,18,32,0.70)", fontSize: 14, lineHeight: 1.5 }}>
            {item.lead}
          </div>

          <div style={{ color: "rgba(11,18,32,0.62)", fontSize: 14, lineHeight: 1.5 }}>
            {item.body}
          </div>
        </div>

        <div style={{ marginTop: 4 }}>
          <a
            href={item.button.href}
            target={item.button.href.startsWith("http") ? "_blank" : undefined}
            rel={item.button.href.startsWith("http") ? "noopener noreferrer" : undefined}
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: 12,
              background: "#2F3640",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
              boxShadow: "0 10px 18px rgba(0,0,0,0.10)",
            }}
          >
            {item.button.label}
          </a>
        </div>
      </div>
    </div>
  );
}

/* Section spacing */
const wrap: React.CSSProperties = {
  width: "100%",
  padding: "18px 16px 64px", // mer luft mellan rubriksektion och cards (du bad om det)
};

/* Desktop */
const desktopWrap: React.CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
  display: "block",
};

const desktopGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: `repeat(5, minmax(${DESKTOP_CARD_MIN}px, ${DESKTOP_CARD_MAX}px))`,
  gap: DESKTOP_GAP,
  justifyContent: "center",
  alignItems: "start",
};

/* Mobile carousel */
const mobileWrap: React.CSSProperties = {
  display: "block",
  margin: "0 auto",
};

const mobileRail: React.CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: `${MOBILE_CARD_WIDTH}px`,
  gap: 12,
  overflowX: "auto",
  paddingBottom: 8,
  scrollSnapType: "x mandatory",
  WebkitOverflowScrolling: "touch",
};

const mobileSnap: React.CSSProperties = {
  scrollSnapAlign: "start",
};
