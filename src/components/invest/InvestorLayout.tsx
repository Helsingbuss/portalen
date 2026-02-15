import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

type InvestorLayoutProps = {
  title?: string;
  children: ReactNode;
};

function classNames(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function InvestorLayout({ title, children }: InvestorLayoutProps) {
  const router = useRouter();
  const path = router.pathname || "";

  const pageTitle = title
    ? title + " | Helsingbuss investerare"
    : "Investerare | Helsingbuss";

  const navItems = [
    { href: "/invest/app", label: "Översikt" },
    { href: "/invest/affarsplan", label: "Affärsplan" },
    { href: "/invest/nyckeltal", label: "Nyckeltal & tabeller" },
    { href: "/invest/offertlage", label: "Offertläge" },
    { href: "/invest/dokument", label: "Dokument & avtal" },
  ];

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-[#f5f4f0]">
        {/* TOPBAR – full bredd, ut mot kanterna */}
        <header className="h-16 border-b bg-white">
          <div className="flex h-full items-center justify-between px-6 lg:px-10">
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                Helsingbuss
              </span>
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#194C66]">
                INVESTERARE
              </span>
              <span className="hidden text-xs text-slate-500 sm:inline">
                Insyn i Helsingbuss utveckling
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="hidden sm:inline">
                Frågor?{" "}
                <a
                  href="mailto:invest@helsingbuss.se"
                  className="text-[#194C66] underline"
                >
                  invest@helsingbuss.se
                </a>
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#194C66] text-[11px] font-semibold text-white">
                INV
              </div>
            </div>
          </div>
        </header>

        {/* BODY */}
        <div className="flex px-6 py-8 lg:px-10">
          {/* SIDOMENY – egen kort, samma känsla som innan */}
          <aside className="w-64 shrink-0">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">
                Helsingbuss
              </div>
              <div className="mb-3 text-[11px] text-slate-400">
                Insyn i Helsingbuss utveckling
              </div>

              <nav className="space-y-1 text-sm">
                {navItems.map((item) => {
                  const active = path === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={classNames(
                        "block rounded-lg px-3 py-1.5",
                        active
                          ? "bg-[#194C66]/5 font-medium text-[#194C66]"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 border-t pt-3 text-[11px] text-slate-400">
                Senast uppdaterad rapport visas automatiskt.
              </div>
            </div>
          </aside>

          {/* MAIN-INNEHÅLL */}
          <main className="ml-6 flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}
