import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Departure = {
  id: string;
  trip_id?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  departure_location?: string | null;
  destination_location?: string | null;
  status?: string | null;
  capacity?: number | null;
  booked_count?: number | null;
  sundra_trips?: {
    title?: string | null;
    destination?: string | null;
  } | null;
};

function fmtDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(
      new Date(`${date}T00:00:00`)
    );
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function statusLabel(status?: string | null) {
  if (status === "open") return "Öppen";
  if (status === "closed") return "Stängd";
  if (status === "draft") return "Utkast";
  return status || "—";
}

function statusClass(status?: string | null) {
  if (status === "open") return "bg-green-100 text-green-700";
  if (status === "closed") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-gray-100 text-gray-700";
  return "bg-amber-100 text-amber-700";
}

export default function SundraTimetablesPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  async function loadDepartures() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/departures");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta tidtabeller.");
      }

      setDepartures(json.departures || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartures();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return departures.filter((d) => {
      const matchSearch =
        !q ||
        d.sundra_trips?.title?.toLowerCase().includes(q) ||
        d.sundra_trips?.destination?.toLowerCase().includes(q) ||
        d.departure_location?.toLowerCase().includes(q) ||
        d.destination_location?.toLowerCase().includes(q);

      const matchStatus = status === "all" || d.status === status;

      return matchSearch && matchStatus;
    });
  }, [departures, search, status]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Tidtabeller
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Översikt över Sundra-avgångar, tider, platser och retur.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadDepartures}
                className="rounded-full border bg-white px-4 py-2 text-sm text-[#194C66]"
              >
                Uppdatera
              </button>

              <Link
                href="/admin/sundra/avgangar/new"
                className="rounded-full bg-[#194C66] px-4 py-2 text-sm font-semibold text-white"
              >
                + Skapa avgång
              </Link>
            </div>
          </div>

          <section className="rounded-3xl bg-white p-5 shadow">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök resa, destination, påstigning..."
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              >
                <option value="all">Alla statusar</option>
                <option value="open">Öppna</option>
                <option value="draft">Utkast</option>
                <option value="closed">Stängda</option>
              </select>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Aktuella tidtabeller
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar tidtabeller...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga tidtabeller hittades.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((d) => {
                  const booked = Number(d.booked_count || 0);
                  const capacity = Number(d.capacity || 0);
                  const left = Math.max(0, capacity - booked);

                  return (
                    <div key={d.id} className="p-5 hover:bg-[#f8fafc]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-[#0f172a]">
                            {d.sundra_trips?.title || "Sundra resa"}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {d.sundra_trips?.destination ||
                              d.destination_location ||
                              "—"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            d.status
                          )}`}
                        >
                          {statusLabel(d.status)}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                        <Info
                          label="Påstigning"
                          value={d.departure_location || "—"}
                        />

                        <Info
                          label="Destination"
                          value={d.destination_location || d.sundra_trips?.destination || "—"}
                        />

                        <Info
                          label="Avgång"
                          value={`${fmtDate(d.departure_date)} kl ${fmtTime(
                            d.departure_time
                          )}`}
                        />

                        <Info
                          label="Retur"
                          value={`${fmtDate(d.return_date)} kl ${fmtTime(
                            d.return_time
                          )}`}
                        />

                        <Info
                          label="Kapacitet"
                          value={`${booked}/${capacity} bokade · ${left} lediga`}
                        />
                      </div>

                      <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/admin/sundra/avgangar/${d.id}`}
                          className="rounded-full border bg-white px-4 py-2 text-xs font-semibold text-[#194C66]"
                        >
                          Öppna avgång
                        </Link>

                        <Link
                          href={`/admin/sundra/boarding/${d.id}`}
                          className="rounded-full bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white"
                        >
                          Boarding
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-[#f8fafc] p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 break-words font-semibold text-[#0f172a]">
        {value || "—"}
      </div>
    </div>
  );
}


