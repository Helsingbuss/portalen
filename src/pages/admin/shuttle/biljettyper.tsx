import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";

export default function ShuttleBiljettyperPage() {
  return (
    <>
      <Header />
      <AdminMenu />

      <main className="min-h-screen space-y-6 bg-[#f7f9fb] px-8 py-6 pt-24 md:ml-[280px] md:px-8 lg:px-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#007764]">
            Flygbuss - Airport Shuttle
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Biljettyper
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Här ska du kunna ändra Ekonomi och Plus, vad som ingår i varje biljettyp
            och vilken text som visas på hbshuttle.se.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Plus</h2>
            <p className="mt-2 text-sm text-slate-600">
              Exempel: extra benutrymme, prioriterad ombordstigning och mer bagage.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Ekonomi</h2>
            <p className="mt-2 text-sm text-slate-600">
              Exempel: bekväm sittplats och standardbagage.
            </p>
          </article>
        </section>
      </main>
    </>
  );
}
