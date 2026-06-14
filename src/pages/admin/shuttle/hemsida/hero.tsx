import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const sections = [
  {
    title: "Hero & säsongsbilder",
    text: "Styr startsidans stora bild, rubrik, knapp och säsongsperioder.",
    href: "/admin/shuttle/hemsida/hero",
    status: "Påbörjad",
  },
  {
    title: "Bildkort / highlights",
    text: "Här finns bildkorten vi skapade. De är kopplade till databasen och hbshuttle.se.",
    href: "/admin/shuttle/hemsida/highlights",
    status: "Kopplad",
  },
  {
    title: "Populära flygplatser",
    text: "Styr flygplatskorten på startsidan, status och kommande flygplatser.",
    href: "/admin/shuttle/hemsida/flygplatser",
    status: "Nästa",
  },
  {
    title: "Vanliga frågor",
    text: "Hantera frågor och svar som visas på startsidan.",
    href: "/admin/shuttle/hemsida/faq",
    status: "Ej kopplad",
  },
  {
    title: "Nyhetsbrev",
    text: "Styr texten och innehållet i nyhetsbrevssektionen.",
    href: "/admin/shuttle/hemsida/nyhetsbrev",
    status: "Ej kopplad",
  },
];

export default function ShuttleHeroAdminPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header />

      <div className="flex">
        <AdminMenu />

        <main className="flex-1 px-8 pb-12 pt-28">
          <div className="mx-auto w-full max-w-[1380px] space-y-7">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-[#007764]">
                Helsingbuss Airport Shuttle
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                Hemsida & innehåll
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Här samlar vi allt innehåll som ska kunna styras från portalen och visas på hbshuttle.se.
                Bildkorten är redan skapade och kopplade. Övriga delar bygger vi vidare steg för steg.
              </p>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
              {sections.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg font-bold text-slate-900">
                      {section.title}
                    </h2>

                    <span className="rounded-full bg-[#007764]/10 px-3 py-1 text-xs font-bold text-[#007764]">
                      {section.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {section.text}
                  </p>

                  <div className="mt-5 text-sm font-bold text-[#007764]">
                    Öppna →
                  </div>
                </Link>
              ))}
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Det som är klart just nu
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                Bildkort / highlights är skapad i portalen, sparas i databasen och är kopplad till hbshuttle.se.
                Klicka på Bildkort / highlights ovan för att öppna den sidan.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
