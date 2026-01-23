import React from "react";

type Card = {
  key: string;
  title: string;
  subtitle: string;
  text: string;
  cta: string;
  href?: string;
  iconLetter: string; // placeholder tills du lägger in riktiga ikoner
  image?: string;     // placeholder (valfritt). Lämna tom så blir det premium-gradient.
};

const cards: Card[] = [
  {
    key: "foretagsresa",
    title: "Företagsresa",
    subtitle: "Smidig transport till möten, kundevent och personaldagar.",
    text: "Vi anpassar tider, stopp och komfort  ni fokuserar på dagen.",
    cta: "Läs mer",
    href: "#",
    iconLetter: "F",
  },
  {
    key: "skola-forening",
    title: "Skola & förening",
    subtitle: "Trygga resor för utflykter, cuper och läger.",
    text: "Tydlig planering, säkerhetsfokus och gott om plats för packning.",
    cta: "Läs mer",
    href: "#",
    iconLetter: "S",
  },
  {
    key: "brollop",
    title: "Bröllop",
    subtitle: "Gör dagen enkel för gästerna och perfekt i tid.",
    text: "Transport mellan vigsel, fest och hotell  tryggt och bekvämt.",
    cta: "Läs mer",
    href: "#",
    iconLetter: "B",
  },
  {
    key: "sportresa",
    title: "Sportresa",
    subtitle: "Lag- och supporterresor med smart logistik.",
    text: "Plats för utrustning och tidspassat upplägg till match eller cup.",
    cta: "Läs mer",
    href: "#",
    iconLetter: "S",
  },
  {
    key: "transfer",
    title: "Transfer / Flygbuss",
    subtitle: "Smidig resa till flyg, från centrala Helsingborg",
    text: "Boka enkelt via Helsingbuss Airport Shuttle.",
    cta: "Till Airport Shuttle",
    href: "/boka",
    iconLetter: "T",
  },
];

function CardItem({ item }: { item: Card }) {
  return (
    <article className="hb-svc-card">
      {/* Bildyta (placeholder). Du kan senare sätta item.image och byta till riktig bild. */}
      <div
        className="hb-svc-media"
        style={
          item.image
            ? { backgroundImage: `url(${item.image})` }
            : undefined
        }
        aria-hidden
      />

      {/* Ikon-cirkel (placeholder-bokstav). Byt till din ikon senare. */}
      <div className="hb-svc-icon" aria-hidden>
        {item.iconLetter}
      </div>

      <div className="hb-svc-body">
        <h3 className="hb-svc-title">{item.title}</h3>
        <p className="hb-svc-sub">{item.subtitle}</p>
        <p className="hb-svc-text">{item.text}</p>

        <a className="hb-svc-btn" href={item.href || "#"}>
          {item.cta}
        </a>
      </div>
    </article>
  );
}

export default function ServiceCards() {
  return (
    <section className="hb-svc-wrap" aria-label="Tjänster">
      <div className="hb-svc-inner">
        {/* Desktop: grid */}
        <div className="hb-svc-grid">
          {cards.map((c) => (
            <CardItem key={c.key} item={c} />
          ))}
        </div>

        {/* Mobil: karusell (scroll-snap) */}
        <div className="hb-svc-carousel" aria-label="Tjänster (scroll)">
          {cards.map((c) => (
            <div key={c.key} className="hb-svc-slide">
              <CardItem item={c} />
            </div>
          ))}
        </div>
      </div>

      {/* OBS: ingen styled-jsx (så TS klagar inte). Vanlig <style> funkar. */}
      <style>{`
        .hb-svc-wrap{
          width: 100%;
          padding: 28px 0 34px;
          background: transparent; /* LÅT DIN LYXBAGRUND SYNAS GENOM ALLT */
        }

        .hb-svc-inner{
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 18px;
        }

        /* Desktop grid */
        .hb-svc-grid{
          display: none;
          gap: 18px;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          align-items: stretch;
        }

        /* Mobil karusell */
        .hb-svc-carousel{
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding: 6px 2px 14px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .hb-svc-carousel::-webkit-scrollbar{ height: 8px; }
        .hb-svc-slide{
          scroll-snap-align: start;
          min-width: 78%;
        }

        /* Kort */
        .hb-svc-card{
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          background: rgba(255,255,255,0.86);
          box-shadow: 0 10px 28px rgba(0,0,0,0.12);
          border: 1px solid rgba(255,255,255,0.55);
          min-height: 246px;
        }

        /* Bildyta */
        .hb-svc-media{
          height: 86px;
          background-size: cover;
          background-position: center;
          /* Premium placeholder-gradient tills du sätter riktiga bilder */
          background-image:
            radial-gradient(120px 60px at 20% 20%, rgba(255,255,255,0.55), rgba(255,255,255,0)),
            linear-gradient(135deg, rgba(32,54,66,0.22), rgba(177,227,221,0.22));
        }

        /* Ikon-cirkel */
        .hb-svc-icon{
          position: absolute;
          top: 63px;
          left: 50%;
          transform: translateX(-50%);
          width: 46px;
          height: 46px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 15px;
          color: rgba(32,54,66,0.85);
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 10px 18px rgba(0,0,0,0.10);
        }

        .hb-svc-body{
          padding: 18px 16px 18px;
          padding-top: 30px;
        }

        .hb-svc-title{
          margin: 8px 0 6px;
          font-size: 15px;
          font-weight: 800;
          color: #1d2937;
        }

        .hb-svc-sub{
          margin: 0 0 10px;
          font-size: 12.5px;
          font-weight: 600;
          color: rgba(29,41,55,0.72);
        }

        .hb-svc-text{
          margin: 0 0 12px;
          font-size: 12.5px;
          color: rgba(29,41,55,0.78);
          line-height: 1.35;
        }

        .hb-svc-btn{
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(34,34,34,0.82);
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          font-size: 12.5px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.12);
        }
        .hb-svc-btn:hover{ background: rgba(34,34,34,0.92); }

        /* BREAKPOINTS */
        @media (min-width: 900px){
        .hb-svc-icon{ top: 73px; }
          .hb-svc-carousel{ display:none; }
          .hb-svc-grid{ display:grid; }
          .hb-svc-slide{ min-width: auto; }

          .hb-svc-media{ height: 96px; }
          .hb-svc-card{ min-height: 260px; }
          .hb-svc-title{ font-size: 15px; }
        }
      `}</style>
    </section>
  );
}



