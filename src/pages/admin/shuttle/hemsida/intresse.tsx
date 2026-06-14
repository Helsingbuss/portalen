import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Signup = {
  id: number;
  email: string;
  source: string;
  consent: boolean;
  status: string;
  created_at: string;
};

export default function ShuttleInterestPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSignups() {
      try {
        const response = await fetch("/api/admin/shuttle/interest");

        if (!response.ok) {
          setSignups([]);
          return;
        }

        const data = await response.json();
        setSignups(Array.isArray(data.signups) ? data.signups : []);
      } catch (error) {
        console.error("Could not load interest signups:", error);
        setSignups([]);
      } finally {
        setLoading(false);
      }
    }

    loadSignups();
  }, []);

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
                Intresseanmälningar
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Här visas personer som vill bli meddelade när bokningen öppnar.
              </p>

              <div className="mt-5 rounded-xl bg-[#007764]/10 px-4 py-3 text-sm font-bold text-[#007764]">
                Totalt: {signups.length} anmälningar
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  E-postlista
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-slate-600">Laddar...</div>
              ) : signups.length === 0 ? (
                <div className="p-6 text-sm text-slate-600">
                  Inga intresseanmälningar ännu.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-3">E-post</th>
                        <th className="px-6 py-3">Källa</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Datum</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {signups.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {item.email}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {item.source || "hbshuttle.se"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              {item.status || "new"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString("sv-SE")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
