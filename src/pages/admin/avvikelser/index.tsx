import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Avvikelse = {
  id: string;
  booking_number?: string | null;
  title: string;
  type: string;
  severity: string;
  status: string;
  reported_at: string;
};

function badgeColor(status: string) {
  switch ((status || "").toLowerCase()) {
    case "öppen":
      return "bg-red-100 text-red-700";
    case "pågår":
      return "bg-yellow-100 text-yellow-700";
    case "klar":
      return "bg-green-100 text-green-700";
    case "arkiverad":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function safeDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("sv-SE");
}

export default function AvvikelserPage() {
  const [data, setData] = useState<Avvikelse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/admin/avvikelser");
        const json = await res.json().catch(() => []);

        if (!res.ok) {
          throw new Error(json?.error || `Serverfel: ${res.status}`);
        }

        if (Array.isArray(json)) {
          setData(json);
        } else if (Array.isArray(json?.data)) {
          setData(json.data);
        } else if (Array.isArray(json?.rows)) {
          setData(json.rows);
        } else {
          console.error("Fel format från /api/admin/avvikelser:", json);
          setData([]);
        }
      } catch (e: any) {
        setError(e?.message || "Kunde inte hämta avvikelser.");
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    return data.filter((row) => {
      const q = search.toLowerCase().trim();

      const matchesSearch =
        !q ||
        row.title?.toLowerCase().includes(q) ||
        row.booking_number?.toLowerCase().includes(q) ||
        row.type?.toLowerCase().includes(q) ||
        row.severity?.toLowerCase().includes(q) ||
        row.status?.toLowerCase().includes(q);

      const matchesStatus = !status || row.status === status;
      const matchesSeverity = !severity || row.severity === severity;
      const matchesType = !type || row.type === type;

      return matchesSearch && matchesStatus && matchesSeverity && matchesType;
    });
  }, [data, search, status, severity, type]);

  const stats = useMemo(() => {
    return {
      total: data.length,
      open: data.filter((x) => x.status === "öppen").length,
      ongoing: data.filter((x) => x.status === "pågår").length,
      critical: data.filter((x) => x.severity === "kritisk").length,
      done: data.filter((x) => x.status === "klar").length,
    };
  }, [data]);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setSeverity("");
    setType("");
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Avvikelser
              </h1>
              <p className="text-sm text-[#194C66]/60">
                Hantera avvikelser, uppföljningar och interna åtgärder.
              </p>
            </div>

            <a
              href="/admin/avvikelser/new"
              className="bg-[#194C66] text-white px-4 py-2 rounded-[25px] hover:bg-[#163b4d] text-sm"
            >
              + Ny avvikelse
            </a>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StatCard label="Totalt" value={stats.total} />
            <StatCard label="Öppna" value={stats.open} />
            <StatCard label="Pågår" value={stats.ongoing} />
            <StatCard label="Kritiska" value={stats.critical} />
            <StatCard label="Klara" value={stats.done} />
          </section>

          <section className="bg-white rounded-xl shadow p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm text-[#194C66]/70 mb-1">
                Sök
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Bokningsnr, titel, typ..."
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-[#194C66]/70 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Alla</option>
                <option value="öppen">Öppen</option>
                <option value="pågår">Pågår</option>
                <option value="klar">Klar</option>
                <option value="arkiverad">Arkiverad</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#194C66]/70 mb-1">
                Allvar
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Alla</option>
                <option value="låg">Låg</option>
                <option value="normal">Normal</option>
                <option value="hög">Hög</option>
                <option value="kritisk">Kritisk</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#194C66]/70 mb-1">
                Typ
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Alla</option>
                <option value="försening">Försening</option>
                <option value="fordon">Fordon</option>
                <option value="chaufför">Chaufför</option>
                <option value="kund">Kund</option>
                <option value="trafik">Trafik</option>
                <option value="säkerhet">Säkerhet</option>
                <option value="övrigt">Övrigt</option>
              </select>
            </div>

            <div className="md:col-span-5 flex justify-end">
              <button
                onClick={resetFilters}
                className="rounded-[25px] border px-4 py-2 text-sm text-[#194C66] bg-white"
              >
                Återställ filter
              </button>
            </div>
          </section>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow overflow-hidden">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar avvikelser...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga avvikelser hittades.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#e5eef3] text-[#194C66] text-left">
                  <tr>
                    <th className="p-3">Datum</th>
                    <th className="p-3">Bokning</th>
                    <th className="p-3">Titel</th>
                    <th className="p-3">Typ</th>
                    <th className="p-3">Allvar</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t hover:bg-[#f9fafb] cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/admin/avvikelser/${row.id}`)
                      }
                    >
                      <td className="p-3">{safeDate(row.reported_at)}</td>
                      <td className="p-3">{row.booking_number || "—"}</td>
                      <td className="p-3 font-medium text-[#0f172a]">
                        {row.title || "—"}
                      </td>
                      <td className="p-3">{row.type || "—"}</td>
                      <td className="p-3">{row.severity || "—"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeColor(
                            row.status
                          )}`}
                        >
                          {row.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="text-sm text-[#194C66]/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#194C66]">
        {value}
      </div>
    </div>
  );
}
