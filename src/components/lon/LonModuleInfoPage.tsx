import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Card = [string, string];

export default function LonModuleInfoPage({
  title,
  intro,
  status,
  cards,
}: {
  title: string;
  intro: string;
  status: string;
  cards: Card[];
}) {
  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {title}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {intro}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/admin/lon/lonearter"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Lönearter
                </a>

                <a
                  href="/admin/lon/lonekoring"
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Lönekörningar
                </a>
              </div>
            </div>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Status:</strong> {status}
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {cards.map(([heading, text]) => (
                <InfoCard key={heading} title={heading}>
                  {text}
                </InfoCard>
              ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Nästa byggsteg
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Den här modulen är nu klickbar och finns i portalen. När vi bygger nästa nivå lägger vi till databas, formulär, listor, redigering och koppling till lönekörning så att underlaget kan räknas med automatiskt.
              </p>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-base font-bold text-[#194C66]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </div>
  );
}
