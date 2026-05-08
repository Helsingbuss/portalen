import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type ScanItem = {
  id: string;

  booking_id?: string;
  departure_id?: string;

  booking_number?: string;

  scanned_count?: number;
  scanned_by?: string;
  scanner_note?: string;

  scan_status?: string;
  scan_source?: string;

  created_at?: string;

  customer_name?: string;
  customer_email?: string;

  passengers_count?: number;
  payment_status?: string;

  trip_title?: string;
  destination?: string;

  departure_date?: string;
  departure_time?: string;

  return_date?: string;
  return_time?: string;
};

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function fmtDateTime(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export default function SundraScansPage() {
  const [loading, setLoading] = useState(true);

  const [scans, setScans] = useState<ScanItem[]>([]);

  const [error, setError] = useState("");

  async function loadScans() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/admin/sundra/tickets/scans"
      );

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error ||
            "Kunde inte hämta scanhistorik."
        );
      }

      setScans(json.scans || []);
    } catch (e: any) {
      setError(
        e?.message ||
          "Kunde inte hämta scanhistorik."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScans();

    const interval = setInterval(() => {
      loadScans();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const totalCheckedIn = scans.reduce(
    (sum, s) => sum + (s.scanned_count || 0),
    0
  );

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-4 pt-24 lg:p-6 lg:pt-24 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Scanhistorik
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Liveöversikt över alla
                biljett-scanningar.
              </p>
            </div>

            <button
              onClick={loadScans}
              className="rounded-full bg-[#194C66] px-5 py-3 text-sm font-semibold text-white"
            >
              Uppdatera
            </button>
          </div>

          {/* STATS */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Scanningar"
              value={scans.length}
            />

            <StatCard
              title="Incheckade resenärer"
              value={totalCheckedIn}
            />

            <StatCard
              title="Live status"
              value="Aktiv"
              green
            />
          </div>

          {/* FEL */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* LOADING */}
          {loading ? (
            <div className="rounded-3xl bg-white p-8 shadow">
              Laddar scanhistorik...
            </div>
          ) : scans.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 shadow text-gray-500">
              Inga scanningar ännu.
            </div>
          ) : (
            <div className="space-y-4">
              {scans.map((scan) => (
                <div
                  key={scan.id}
                  className="rounded-3xl bg-white p-5 shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xl font-bold text-[#194C66]">
                          {scan.trip_title ||
                            "Sundra resa"}
                        </div>

                        <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Check-in
                        </div>
                      </div>

                      <div className="mt-1 text-sm text-gray-500">
                        {scan.destination ||
                          "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-right">
                      <div className="text-xs text-gray-500">
                        Scannad
                      </div>

                      <div className="font-semibold">
                        {fmtDateTime(
                          scan.created_at
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <Info
                      label="Bokning"
                      value={
                        scan.booking_number
                      }
                    />

                    <Info
                      label="Kund"
                      value={
                        scan.customer_name
                      }
                    />

                    <Info
                      label="Incheckade"
                      value={`${scan.scanned_count || 0} personer`}
                    />

                    <Info
                      label="Scannad av"
                      value={
                        scan.scanned_by ||
                        "—"
                      }
                    />

                    <Info
                      label="Avgång"
                      value={`${fmtDate(
                        scan.departure_date
                      )} kl ${fmtTime(
                        scan.departure_time
                      )}`}
                    />

                    <Info
                      label="Betalstatus"
                      value={
                        scan.payment_status
                      }
                    />

                    <Info
                      label="Totalt i bokning"
                      value={`${scan.passengers_count || 0} personer`}
                    />

                    <Info
                      label="Källa"
                      value={
                        scan.scan_source
                      }
                    />
                  </div>

                  {scan.scanner_note && (
                    <div className="mt-4 rounded-2xl border bg-[#f8fafc] p-4 text-sm text-gray-600">
                      <strong>
                        Notering:
                      </strong>{" "}
                      {scan.scanner_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function StatCard({
  title,
  value,
  green,
}: {
  title: string;
  value: any;
  green?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div
        className={`mt-2 text-3xl font-bold ${
          green
            ? "text-green-600"
            : "text-[#194C66]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-2xl border bg-[#f8fafc] p-4">
      <div className="text-xs text-gray-500">
        {label}
      </div>

      <div className="mt-1 font-semibold break-words">
        {value || "—"}
      </div>
    </div>
  );
}
