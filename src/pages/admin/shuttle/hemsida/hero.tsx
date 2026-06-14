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
    text: "Hantera bildkorten som visas på hbshuttle.se och som är kopplade till databasen.",
    href: "/admin/shuttle/hemsida/highlights",
    status: "Kopplad",
  },
  {
    title: "Intresseanmälningar",
    text: "Se personer som vill bli meddelade när bokningen öppnar.",
    href: "/admin/shuttle/hemsida/intresse",
    status: "Ny",
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
          <div className="mx-auto w-full max-w-[1180px] space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white px-8 py-8 text-center shadow-sm">
              <p className="text-sm font-bold text-[#007764]">
                Helsingbuss Airport Shuttle
              </p>

              <h1 className="mt-3 text-3xl font-bold text-slate-900">
                Hemsida & innehåll
              </h1>

              <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Här samlar vi allt innehåll som styr hbshuttle.se. Du kan hantera
                startsidans delar, bildkort, intresseanmälningar och information
                som kunderna ser inför trafikstarten.
              </p>
            </section>

            <section className="grid justify-center gap-5 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  className="group flex min-h-[190px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#007764]/30 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="max-w-[230px] text-lg font-bold text-slate-900">
                        {section.title}
                      </h2>

                      <span className="rounded-full bg-[#007764]/10 px-3 py-1 text-xs font-bold text-[#007764]">
                        {section.status}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {section.text}
                    </p>
                  </div>

                  <div className="mt-6 text-sm font-bold text-[#007764] group-hover:underline">
                    Öppna →
                  </div>
                </Link>
              ))}
            </section>

            <section className="rounded-3xl border border-emerald-100 bg-emerald-50 px-8 py-6 text-center">
              <h2 className="text-lg font-bold text-slate-900">
                Klart och kopplat
              </h2>

              <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                Bildkort / highlights är kopplade till hbshuttle.se. Nästa viktiga
                koppling är intresseanmälningar, så alla som fyller i “Meddela mig”
                sparas direkt i portalen.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
