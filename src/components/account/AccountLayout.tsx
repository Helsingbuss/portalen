// src/components/account/AccountLayout.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";

type AccountUser = {
  firstName: string;
  email: string;
};

type AccountLayoutProps = {
  user: AccountUser;
  children: ReactNode;
};

const navItems = [
  { href: "/", label: "Mina sidor" },
  { href: "/profil", label: "Min profil" },
  { href: "/biljetter", label: "Mina biljetter" },
  { href: "/poang", label: "Intjänad poäng" },
  { href: "/quiz", label: "Quiz ranking" },
];

export function AccountLayout({ user, children }: AccountLayoutProps) {
  const router = useRouter();
  const activePath = router.pathname;

  return (
    <div className="hb-account-root">
      {/* TOPP-HEADER */}
      <header className="hb-account-header">
        <div className="hb-account-header-inner">
          <div className="hb-account-logo">
            <span className="hb-logo-mark" />
            <span className="hb-logo-text">Helsingbuss</span>
          </div>

          <div className="hb-account-user">
            <div className="hb-account-user-avatar">
              {user.firstName.charAt(0).toUpperCase()}
            </div>
            <span className="hb-account-user-name">{user.firstName}</span>
          </div>
        </div>
      </header>

      {/* SIDLAYOUT */}
      <main className="hb-account-main">
        <div className="hb-account-layout">
          {/* VÄNSTER MENY */}
          <nav className="hb-account-sidebar" aria-label="Mina sidor">
            <ul>
              {navItems.map((item) => {
                const isActive = activePath === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        "hb-account-navlink" +
                        (isActive ? " hb-account-navlink--active" : "")
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}

              <li className="hb-account-nav-logout">
                <button
                  type="button"
                  className="hb-account-navlink hb-account-navlink--logout"
                  onClick={() => {
                    // TODO: Byt mot riktig utloggning sen
                    window.location.href = "https://www.helsingbuss.se/";
                  }}
                >
                  Logga ut
                </button>
              </li>
            </ul>
          </nav>

          {/* INNEHÅLL */}
          <section className="hb-account-content">{children}</section>
        </div>
      </main>
    </div>
  );
}
