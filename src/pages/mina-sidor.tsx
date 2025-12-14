// src/pages/mina-sidor.tsx
import React, { useState } from "react";
import Head from "next/head";

type NavKey = "overview" | "profile" | "tickets" | "points" | "quiz";

const navItems: { key: NavKey; label: string }[] = [
  { key: "overview", label: "Mina sidor" },
  { key: "profile", label: "Min profil" },
  { key: "tickets", label: "Mina biljetter" },
  { key: "points", label: "Intjänad poäng" },
  { key: "quiz", label: "Quiz ranking" },
];

export default function MinaSidorPage() {
  // TODO: ersätt med riktig användare från Supabase senare
  const userFirstName = "Andreas";

  const [active, setActive] = useState<NavKey>("overview");

  return (
    <>
      <Head>
        <title>Mina sidor – Helsingbuss</title>
      </Head>

      <div className="page">
        {/* TOPPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="logo">Helsingbuss</div>
            <nav className="main-nav">
              <a href="#">Tidtabeller</a>
              <a href="#">Destinationer</a>
              <a href="#">Vanliga frågor</a>
              <a href="#">Spela Quiz och vinn</a>
              <a href="#">Boka buss</a>
            </nav>
          </div>

          <div className="topbar-right">
            <div className="user-pill">
              <div className="user-icon">
                <span>👤</span>
              </div>
              <div className="user-name">{userFirstName}</div>
            </div>
          </div>
        </header>

        {/* HUVUDINNEHÅLL */}
        <main className="shell">
          <div className="card">
            <aside className="sidebar">
              <h2 className="sidebar-title">Mina sidor</h2>

              <ul className="sidebar-nav">
                {navItems.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      className={
                        "sidebar-link" +
                        (active === item.key ? " sidebar-link--active" : "")
                      }
                      onClick={() => setActive(item.key)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
                <li className="sidebar-logout">
                  <button type="button" className="sidebar-link sidebar-link--logout">
                    Logga ut
                  </button>
                </li>
              </ul>
            </aside>

            <section className="content">
              {active === "overview" && <Overview />}
              {active === "profile" && <Placeholder title="Min profil" />}
              {active === "tickets" && <Placeholder title="Mina biljetter" />}
              {active === "points" && <Placeholder title="Intjänad poäng" />}
              {active === "quiz" && <Placeholder title="Quiz ranking" />}
            </section>
          </div>
        </main>
      </div>

      <style jsx>{`
        :global(html),
        :global(body) {
          margin: 0;
          padding: 0;
          font-family: "Open Sans", -apple-system, BlinkMacSystemFont,
            "Segoe UI", system-ui, sans-serif;
          background: #f3f4f6;
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f3f4f6;
        }

        /* TOPPBAR */
        .topbar {
          height: 72px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .logo {
          font-weight: 700;
          font-size: 20px;
          letter-spacing: 0.02em;
          color: #1d2937;
        }

        .main-nav {
          display: flex;
          gap: 20px;
          font-size: 14px;
        }

        .main-nav a {
          text-decoration: none;
          color: #4b5563;
        }

        .main-nav a:hover {
          color: #007764;
        }

        .topbar-right {
          display: flex;
          align-items: center;
        }

        .user-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px;
          border-radius: 999px;
          background: #f3f4f6;
        }

        .user-icon {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .user-name {
          font-size: 13px;
          color: #111827;
          font-weight: 600;
        }

        /* HUVUDKORT */
        .shell {
          flex: 1;
          display: flex;
          justify-content: center;
          padding: 40px 16px 48px;
        }

        .card {
          width: 100%;
          max-width: 1120px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          overflow: hidden;
        }

        /* SIDOMENY */
        .sidebar {
          padding: 24px 24px 24px 28px;
          border-right: 1px solid #f1f5f9;
          background: #f9fafb;
        }

        .sidebar-title {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 700;
          color: #007764;
        }

        .sidebar-nav {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-link {
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 14px;
          color: #4b5563;
          cursor: pointer;
        }

        .sidebar-link--active {
          background: #e6f3f0;
          color: #007764;
          font-weight: 600;
        }

        .sidebar-link--logout {
          color: #b91c1c;
        }

        .sidebar-link--logout:hover {
          background: #fef2f2;
        }

        .sidebar-logout {
          margin-top: 16px;
        }

        /* CONTENT */
        .content {
          padding: 28px 32px 32px;
          background: #ffffff;
        }

        .content-header {
          margin-bottom: 16px;
        }

        .content-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .content-subtitle {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: #6b7280;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .panel {
          border-radius: 16px;
          background: #f9fafb;
          padding: 18px 20px;
          border: 1px solid #e5e7eb;
        }

        .panel-title {
          margin: 0 0 10px 0;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
        }

        .panel-body {
          font-size: 13px;
          color: #6b7280;
        }

        .points-number {
          font-size: 24px;
          font-weight: 700;
          color: #007764;
          margin-bottom: 4px;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          font-size: 11px;
          margin-top: 8px;
        }

        /* RESPONSIVT */
        @media (max-width: 900px) {
          .card {
            grid-template-columns: minmax(0, 1fr);
          }
          .sidebar {
            border-right: none;
            border-bottom: 1px solid #f1f5f9;
          }
        }

        @media (max-width: 640px) {
          .topbar {
            padding: 0 16px;
          }
          .main-nav {
            display: none; /* ev. ersätt med mobilmeny sen */
          }
          .shell {
            padding: 24px 10px 32px;
          }
          .content {
            padding: 20px 18px 24px;
          }
          .grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
}

/* ---------- Innehållskomponenter ---------- */

function Overview() {
  return (
    <>
      <div className="content-header">
        <h1 className="content-title">Mina sidor</h1>
        <p className="content-subtitle">
          Här ser du dina kommande resor, poäng och information kopplad till ditt
          Helsingbuss-konto.
        </p>
      </div>

      <div className="grid">
        <div className="panel">
          <h2 className="panel-title">Kommande resor</h2>
          <div className="panel-body">
            Hittade inga resor ännu.
            <br />
            <span>Så fort du bokar en resa dyker den upp här.</span>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel-title">Intjänad poäng</h2>
          <div className="panel-body">
            <div className="points-number">0 poäng</div>
            <div>Ditt nuvarande poängsaldo visas här.</div>
            <div className="tag">
              🎁
              <span>Res mer – samla fler poäng</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <>
      <div className="content-header">
        <h1 className="content-title">{title}</h1>
        <p className="content-subtitle">
          Denna del kommer vi fylla med riktigt innehåll (formulär, listor osv.) när
          vi kopplar på databasen.
        </p>
      </div>
    </>
  );
}
