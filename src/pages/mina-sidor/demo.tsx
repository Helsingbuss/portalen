// src/pages/mina-sidor-demo.tsx
import React from "react";
import Head from "next/head";
import Link from "next/link";
import {
  User,
  Ticket,
  MapPin,
  Star,
  Trophy,
  LogOut,
} from "lucide-react";

const fakeUser = {
  firstName: "Demo",
  lastName: "Resenär",
  email: "demo@helsingbuss.se",
  points: 2350,
  level: "Silvermedlem",
};

const demoTrips = [
  {
    id: "1",
    title: "Shoppingresa – Gekås Ullared",
    date: "Lör 15 mars 2026",
    time: "Avgång 06.30 · Hemresa 18.00",
    from: "Påstigning: Helsingborg C",
    passengers: "2 resenärer",
    ticketNo: "HB-20260315-AB12",
    type: "Shoppingresa",
  },
  {
    id: "2",
    title: "PrideXpress – Stockholm Pride",
    date: "Fre 31 juli 2026",
    time: "Avgång 07.00 · Hemresa 23.30",
    from: "Påstigning: Malmö C",
    passengers: "1 resenär",
    ticketNo: "HB-20260731-PRDX",
    type: "PrideXpress",
  },
  {
    id: "3",
    title: "Weekendkryssning – Helsingfors 48h",
    date: "Tor 10 sep 2026",
    time: "Avgång 14.00 · Åter 12.30 (söndag)",
    from: "Påstigning: Helsingborg C (anslutningsbuss)",
    passengers: "3 resenärer",
    ticketNo: "HB-20260910-CRUI",
    type: "Kryssning",
  },
];

export default function MinaSidorDemo() {
  const isDemo = true;

  return (
    <>
      <Head>
        <title>Demo – Mina sidor | Helsingbuss</title>
      </Head>

      <div className="page">
        <div className="shell">
          {/* ==== DEMO-BANNER HÖGST UPP ==== */}
          {isDemo && (
            <div className="demoBanner">
              <strong>Demo-version</strong> – den här sidan visar ett exempel
              på hur Mina sidor kommer att se ut. Inga riktiga bokningar eller
              kunduppgifter visas.
            </div>
          )}

          {/* ====== TOPPHEADER ====== */}
          <header className="appHeader">
            <div className="brand">
              <div className="brandMark">H</div>
              <div className="brandTextBlock">
                <span className="brandText">Helsingbuss</span>
                <span className="brandSub">Mina sidor – demo</span>
              </div>
              {isDemo && <span className="brandDemoTag">DEMO</span>}
            </div>

            {/* Huvudmeny – kopplas till riktiga sidor senare */}
            <nav className="topNav">
              <Link href="#" className="topNavLink">
                Tidtabeller
              </Link>
              <Link href="#" className="topNavLink">
                Destinationer
              </Link>
              <Link href="#" className="topNavLink">
                Vanliga frågor
              </Link>
              <Link href="#" className="topNavLink">
                Kundservice
              </Link>
              <Link href="#" className="topNavButton">
                Boka resa
              </Link>
            </nav>

            {/* Användare uppe till höger */}
            <div className="userChip">
              <div className="avatar">
                {fakeUser.firstName.charAt(0).toUpperCase()}
              </div>
              <div className="userMeta">
                <span className="userName">
                  {fakeUser.firstName} {fakeUser.lastName}
                </span>
                <span className="userLabel">{fakeUser.level}</span>
              </div>
            </div>
          </header>

          {/* ====== HUVUDLAYOUT ====== */}
          <main className="mainLayout">
            {/* VÄNSTERMENY */}
            <aside className="sideNav">
              <h2 className="sideNavTitle">Mina sidor</h2>
              <nav className="sideNavList">
                <button
                  className="sideNavItem sideNavItemActive"
                  type="button"
                >
                  <User className="sideNavIcon" size={16} />
                  <span>Översikt</span>
                </button>
                <button className="sideNavItem" type="button">
                  <User className="sideNavIcon" size={16} />
                  <span>Min profil</span>
                </button>
                <button className="sideNavItem" type="button">
                  <Ticket className="sideNavIcon" size={16} />
                  <span>Mina biljetter</span>
                </button>
                <button className="sideNavItem" type="button">
                  <MapPin className="sideNavIcon" size={16} />
                  <span>Kommande resor</span>
                </button>
                <button className="sideNavItem" type="button">
                  <Star className="sideNavIcon" size={16} />
                  <span>Intjänad poäng</span>
                </button>
                <button className="sideNavItem" type="button">
                  <Trophy className="sideNavIcon" size={16} />
                  <span>Quiz & tävlingar</span>
                </button>
                <button
                  className="sideNavItem sideNavLogout"
                  type="button"
                  onClick={() => {
                    alert(
                      "I demoversionen gör Logga ut ingenting – här kommer vi koppla riktig inloggning senare 🙂"
                    );
                  }}
                >
                  <LogOut className="sideNavIcon" size={16} />
                  <span>Logga ut</span>
                </button>
              </nav>
            </aside>

            {/* HÖGER – DASHBOARD */}
            <section className="content">
              <header className="contentHeader">
                <div>
                  <p className="breadcrumb">
                    Mina sidor {isDemo ? "· Demo" : ""}
                  </p>
                  <h1 className="contentTitle">
                    Hej {fakeUser.firstName}, här samlar vi hela din resa 👋
                  </h1>
                  <p className="contentSub">
                    Detta är en demo av hur Helsingbuss kundklubb och Mina sidor
                    kan se ut. När systemet är live ser du här dina riktiga
                    biljetter, resor, poäng och personliga erbjudanden.
                  </p>
                </div>
                <div className="pointsCard">
                  <span className="pointsLabel">
                    {isDemo ? "Demo-poäng" : "Intjänade poäng"}
                  </span>
                  <span className="pointsValue">
                    {fakeUser.points.toLocaleString("sv-SE")}
                  </span>
                  <span className="pointsHint">
                    I skarpt läge visar vi dina verkliga bonuspoäng och nivå.
                  </span>
                </div>
              </header>

              {/* Demo-kort / widgetar */}
              <div className="grid">
                {/* ====== KOMMANDE RESOR ====== */}
                <article className="card cardHighlight">
                  <h2 className="cardTitle">Kommande resor</h2>
                  <p className="cardTextMuted">
                    Här ser du exempel på hur dina bokade resor kommer visas.
                    I skarpt läge kan du klicka dig vidare till biljetten direkt.
                  </p>

                  <div className="tripList">
                    {demoTrips.map((trip) => (
                      <div key={trip.id} className="tripItem">
                        <div className="tripHeaderRow">
                          <div>
                            <p className="tripTitle">{trip.title}</p>
                            <p className="tripMeta">
                              {trip.date} · {trip.time}
                            </p>
                            <p className="tripMetaSmall">
                              {trip.from} · {trip.passengers}
                            </p>
                          </div>
                          <span className="statusPill">{trip.type}</span>
                        </div>

                        <div className="tripFooterRow">
                          <span className="tripTicket">
                            Biljettnummer:{" "}
                            <strong>{trip.ticketNo}</strong>
                          </span>
                          <button
                            type="button"
                            className="tripLinkBtn"
                            onClick={() =>
                              alert(
                                "I demoversionen är knappen bara för visning – här kommer vi öppna e-biljetten."
                              )
                            }
                          >
                            Visa demo-biljett
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* ====== MINA BILJETTER ====== */}
                <article className="card">
                  <h2 className="cardTitle">Mina biljetter</h2>
                  <p className="cardTextMuted">
                    Här kan kunden i framtiden se alla aktiva och tidigare
                    biljetter, ladda ner e-biljetten igen och se detaljer om
                    avgångar och påstigning.
                  </p>
                  <ul className="bulletList">
                    <li>Översikt över alla biljetter i ett flöde</li>
                    <li>Snabb nedladdning av PDF-biljett</li>
                    <li>Klart markerade statusar: kommande, använda, avbokade</li>
                  </ul>
                </article>

                {/* ====== KUNDKLUBB / QUIZ ====== */}
                <article className="card fullWidth">
                  <h2 className="cardTitle">Quiz, kampanjer & kundklubb</h2>
                  <p className="cardTextMuted">
                    Denna ytan kan användas för PrideXpress, shoppingkampanjer
                    och quiz där kunden samlar poäng och kan vinna resor, rabatt
                    eller andra förmåner.
                  </p>
                  <div className="pillRow">
                    <span className="pill">PrideXpress-quiz</span>
                    <span className="pill">Shoppingresa-bonus</span>
                    <span className="pill pillMuted">
                      Inga riktiga kampanjer i denna demo
                    </span>
                  </div>
                </article>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ==== STYLES ==== */}
      <style jsx>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(circle at top, #e0f2f1 0, #f3f4f6 55%);
          color: #111827;
          font-family: "Open Sans", system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .shell {
          max-width: 1320px; /* 🔹 lite bredare */
          margin: 0 auto;
          padding: 20px 20px 40px;
        }

        .demoBanner {
          margin-bottom: 16px;
          padding: 8px 12px;
          border-radius: 10px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 12px;
        }

        /* HEADER */

        .appHeader {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 32px; /* lite mer luft mellan logotyp / meny / användare */
          margin-bottom: 28px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brandMark {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: #007764;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
        }

        .brandTextBlock {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .brandText {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .brandSub {
          font-size: 11px;
          color: #6b7280;
        }

        .brandDemoTag {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          background: #fee2e2;
          color: #b91c1c;
          font-weight: 600;
          text-transform: uppercase;
        }

        .topNav {
          display: flex;
          justify-content: center;
          gap: 22px; /* lite glesare */
          font-size: 14px;
        }

        .topNavLink {
          color: #4b5563;
          text-decoration: none;
          padding: 6px 0;
        }
        .topNavLink:hover {
          color: #111827;
        }

        .topNavButton {
          padding: 6px 16px;
          border-radius: 999px;
          background: #007764;
          color: #ffffff;
          text-decoration: none;
          font-weight: 600;
        }
        .topNavButton:hover {
          background: #006254;
        }

        .userChip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px 6px 6px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: #e5f4f0;
          color: #007764;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .userMeta {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .userName {
          font-size: 13px;
          font-weight: 600;
        }
        .userLabel {
          font-size: 11px;
          color: #6b7280;
        }

        /* LAYOUT */

        .mainLayout {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr); /* 🔹 bredare sidomeny */
          gap: 28px; /* lite mer gap */
          align-items: flex-start;
        }

        .sideNav {
          background: #ffffff;
          border-radius: 18px;
          padding: 22px 20px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
        }

        .sideNavTitle {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: #111827;
        }

        .sideNavList {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sideNavItem {
          text-align: left;
          width: 100%;
          border: none;
          background: transparent;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 13px;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sideNavItem:hover {
          background: #f3f4f6;
        }

        .sideNavItemActive {
          background: #007764;
          color: #ffffff;
          font-weight: 600;
        }

        .sideNavIcon {
          flex-shrink: 0;
        }

        .sideNavLogout {
          margin-top: 8px;
          color: #b91c1c;
        }
        .sideNavLogout:hover {
          background: #fef2f2;
        }

        .content {
          background: #ffffff;
          border-radius: 24px;
          padding: 26px 26px 30px;
          box-shadow: 0 22px 50px rgba(15, 23, 42, 0.12);
        }

        .contentHeader {
          display: flex;
          justify-content: space-between;
          gap: 28px;
          align-items: flex-start;
          margin-bottom: 26px;
        }

        .breadcrumb {
          margin: 0 0 4px 0;
          font-size: 12px;
          color: #6b7280;
        }

        .contentTitle {
          margin: 0 0 6px 0;
          font-size: 22px;
          font-weight: 700;
        }

        .contentSub {
          margin: 0;
          font-size: 13px;
          color: #4b5563;
        }

        .pointsCard {
          min-width: 230px;
          padding: 12px 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #007764, #00a98b);
          color: #ecfdf5;
        }
        .pointsLabel {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.85;
        }
        .pointsValue {
          display: block;
          font-size: 24px;
          font-weight: 700;
          margin-top: 4px;
        }
        .pointsHint {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          opacity: 0.9;
        }

        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
          gap: 20px; /* lite bredare kort */
        }

        .card {
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          padding: 16px 18px 18px;
          background: #ffffff;
        }

        .cardHighlight {
          border-color: #bbf7d0;
          box-shadow: 0 12px 30px rgba(22, 163, 74, 0.12);
        }

        .card.fullWidth {
          grid-column: 1 / -1;
        }

        .cardTitle {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .cardTextMuted {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #6b7280;
        }

        .bulletList {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
          color: #4b5563;
        }
        .bulletList li + li {
          margin-top: 4px;
        }

        .pillRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pill {
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          background: #ecfdf5;
          color: #047857;
        }
        .pillMuted {
          background: #f3f4f6;
          color: #6b7280;
        }

        /* --- KOMMANDE RESOR-LISTA --- */

        .tripList {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tripItem {
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          padding: 10px 12px;
          background: #f9fafb;
        }

        .tripHeaderRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .tripTitle {
          margin: 0 0 2px 0;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .tripMeta {
          margin: 0;
          font-size: 12px;
          color: #4b5563;
        }

        .tripMetaSmall {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: #6b7280;
        }

        .statusPill {
          align-self: flex-start;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          background: #ecfdf5;
          color: #047857;
          white-space: nowrap;
        }

        .tripFooterRow {
          margin-top: 6px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .tripTicket {
          font-size: 11px;
          color: #4b5563;
        }

        .tripLinkBtn {
          border: none;
          background: #ffffff;
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          color: #007764;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(15, 23, 42, 0.12);
        }
        .tripLinkBtn:hover {
          background: #ecfdf5;
        }

        /* RESPONSIVE */

        @media (max-width: 900px) {
          .appHeader {
            grid-template-columns: 1fr;
            row-gap: 16px;
          }
          .topNav {
            justify-content: flex-start;
            flex-wrap: wrap;
          }
          .mainLayout {
            grid-template-columns: 1fr;
          }
          .contentHeader {
            flex-direction: column;
          }
          .grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .content {
            padding: 18px 16px 22px;
          }
        }
      `}</style>
    </>
  );
}
