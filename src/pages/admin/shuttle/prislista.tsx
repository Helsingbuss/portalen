import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";

export default function ShuttlePrislistaPage() {
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
            Prislista
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Här ska priserna styras per linje, från-hållplats, till-hållplats,
            resenärstyp och biljettyp. Då kan varje sträcka få rätt pris.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Kommande prisstruktur
          </h2>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Linje</th>
                  <th className="px-4 py-3">Från</th>
                  <th className="px-4 py-3">Till</th>
                  <th className="px-4 py-3">Resenärstyp</th>
                  <th className="px-4 py-3">Biljettyp</th>
                  <th className="px-4 py-3">Pris</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="px-4 py-3">811</td>
                  <td className="px-4 py-3">Helsingborg C</td>
                  <td className="px-4 py-3">Ängelholms Flygplats</td>
                  <td className="px-4 py-3">Vuxen</td>
                  <td className="px-4 py-3">Ekonomi</td>
                  <td className="px-4 py-3">149 kr</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
