// src/pages/mina-sidor.tsx
import React from "react";
import Head from "next/head";
import Link from "next/link";

const fakeUser = {
  firstName: "Andreas",
  email: "andreas@example.com",
  points: 2350,
};

export default function MinaSidor() {
  return (
    <>
      <Head>
        <title>Mina sidor – Helsingbuss</title>
      </Head>

      <div className="page">
        <div className="shell">
          {/* ====== TOPPHEADER ====== */}
          <header className="appHeader">
            <div className="brand">
              <div className="brandMark">H</div>
              <span className="brandText">Helsingbuss</span>
            </div>

            {/* Huvudmeny – länka om till riktiga sidor sen */}
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
                Spela quiz och vinn
              </Link>
              <Link href="#" className="topNavButton">
                Boka buss
              </Link>
            </nav>

            {/* Användare uppe till höger */}
            <div className="userChip">
              <div className="avatar">
                {fakeUser.firstName.charAt(0).toUpperCase()}
              </div>
              <div className="userMeta">
                <span className="userName">{fakeUser.firstName}</span>
                <span className="userLabel">Inloggad</span>
              </div>
            </div>
          </header>

          {/* ====== HUVUDLAYOUT ====== */}
          <main className="mainLayout">
            {/* VÄNSTERMENY – samma punkter som i din skiss */}
            <aside className="sideNav">
              <h2 className="sideNavTitle">Mina sidor</h2>
              <nav className="sideNavList">
                <button className="sideNavItem sideNavItemActive" type="button">
                  Mina sidor
                </button>
                <button className="sideNavItem" type="button">
                  Min profil
                </button>
                <button className="sideNavItem" type="button">
                  Mina biljetter
                </button>
                <button className="sideNavItem" type="button">
                  Intjänad poäng
                </button>
                <button className="sideNavItem" type="button">
                  Quiz ranking
                </button>
                <button
                  className="sideNavItem sideNavLogout"
                  type="button"
                  onClick={() => {
                    // TODO: ersätt med riktig logout
                    console.log("Logga ut klickad");
                  }}
                >
                  Logga ut
                </button>
              </nav>
            </aside>

            {/* HÖGER – DASHBOARD / INNEHÅLL */}
            <section className="content">
              <header className="contentHeader">
                <div>
                  <p className="breadcrumb">Mina sidor</p>
                  <h1 className="contentTitle">
                    Hej {fakeUser.firstName}, välkommen tillbaka 👋
                  </h1>
                  <p className="contentSub">
                    Här hittar du dina kommande resor, biljetter och poäng i
                    Helsingbuss Kundklubb.
                  </p>
                </div>
                <div className="pointsCard">
                  <span className="pointsLabel">Intjänade poäng</span>
                  <span className="pointsValue">
                    {fakeUser.points.toLocaleString("sv-SE")}
                  </span>
                  <span className="pointsHint">
                    Poäng kan användas på framtida kampanjer.
                  </span>
                </div>
              </header>

              {/* Kort / widgetar */}
              <div className="grid">
                <article className="card">
                  <h2 className="cardTitle">Kommande resor</h2>
                  <p className="cardTextMuted">
                    Du har just nu inga bokade resor. När du köper en biljett
                    via Helsingbuss hamnar den här.
                  </p>
                  <button
                    type="button"
                    className="cardButton"
                    onClick={() =>
                      window.open("https://www.helsingbuss.se", "_blank")
                    }
                  >
                    Boka nästa resa
                  </button>
                </article>

                <article className="card">
                  <h2 className="cardTitle">Mina biljetter</h2>
                  <p className="cardTextMuted">
                    Här kommer du kunna se dina aktiva och tidigare biljetter,
                    ladda ner e-biljetter och hitta information om avgångar.
                  </p>
                  <ul className="bulletList">
                    <li>Snabb åtkomst till e-biljetter</li>
                    <li>Information om avgångstider</li>
                    <li>Historik på tidigare resor</li>
                  </ul>
                </article>

                <article className="card fullWidth">
                  <h2 className="cardTitle">Quiz & kampanjer</h2>
                  <p className="cardTextMuted">
                    När du deltar i våra quiz och kampanjer hamnar dina
                    resultat och vinster här. Perfekt för Pride-resor,
                    shoppingresor och specialturer.
                  </p>
                  <div className="pillRow">
                    <span className="pill">Kommande quiz</span>
                    <span className="pill pillMuted">Ingen kampanj aktiv</span>
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
          background: #f3f4f6;
          color: #111827;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            "Open Sans", sans-serif;
        }

        .shell {
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px 16px 40px;
        }

        /* HEADER */

        .appHeader {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brandMark {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: #007764;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .brandText {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .topNav {
          display: flex;
          justify-content: center;
          gap: 18px;
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
          padding: 6px 14px;
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
          padding: 4px 10px 4px 4px;
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
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 24px;
          align-items: flex-start;
        }

        .sideNav {
          background: #ffffff;
          border-radius: 18px;
          padding: 20px 18px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
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
          padding: 8px 12px;
          font-size: 13px;
          color: #374151;
          cursor: pointer;
        }

        .sideNavItem:hover {
          background: #f3f4f6;
        }

        .sideNavItemActive {
          background: #007764;
          color: #ffffff;
          font-weight: 600;
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
          padding: 24px 24px 28px;
          box-shadow: 0 22px 50px rgba(15, 23, 42, 0.12);
        }

        .contentHeader {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
          margin-bottom: 24px;
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
          min-width: 220px;
          padding: 12px 14px;
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
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .card {
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          padding: 16px 18px 18px;
          background: #ffffff;
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

        .cardButton {
          margin-top: 4px;
          border-radius: 999px;
          border: none;
          background: #007764;
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          cursor: pointer;
        }
        .cardButton:hover {
          background: #006254;
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
        }

        @media (max-width: 640px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .content {
            padding: 18px 16px 22px;
          }
        }
      `}</style>
    </>
  );
}
