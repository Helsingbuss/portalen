import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

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
                Hero & säsongsbilder
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Här ska du kunna styra startsidans stora hero-bild, rubrik,
                text, knapp och säsongsbilder.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Sidan är skapad
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Nästa steg blir att koppla hero och säsongsbilder till databasen.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
