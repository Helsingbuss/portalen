import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import { Scanner } from "@yudiel/react-qr-scanner";

type PassengerRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  passenger_type?: string | null;
  seat_number?: string | null;
  special_requests?: string | null;
  booking_id?: string;
  booking_number?: string;
  customer_name?: string;
  payment_status?: string;
  checked_in_count?: number;
};

type BoardingData = {
  departure?: any;
  trip?: any;
  bookings?: any[];
  passengers?: PassengerRow[];
  stats?: {
    passengers_total: number;
    checked_in_total: number;
    remaining_total: number;
    bookings_total: number;
  };
};

export default function BoardingPage() {
  const router = useRouter();
  const { departureId } = router.query as { departureId?: string };

  const [data, setData] = useState<BoardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [lastQr, setLastQr] = useState("");
  const [scannedCount, setScannedCount] = useState(1);

  async function loadBoarding() {
    if (!departureId) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/sundra/boarding/${departureId}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta boarding.");
      }

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoarding();

    const interval = setInterval(() => {
      loadBoarding();
    }, 15000);

    return () => clearInterval(interval);
  }, [departureId]);

  async function handleScan(rawQr: string) {
    if (!rawQr?.trim()) return;
    if (rawQr === lastQr) return;

    try {
      setLastQr(rawQr);
      setScanLoading(true);
      setScanResult(null);

      const res = await fetch("/api/admin/sundra/tickets/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qr: rawQr,
          scanned_count: scannedCount,
          scanned_by: "Boardingläge",
          scanner_note: `Scannad från avgång ${departureId}`,
        }),
      });

      const json = await res.json().catch(() => ({}));
      setScanResult(json);

      if (json?.ok && navigator?.vibrate) {
        navigator.vibrate([120, 50, 120]);
      }

      await loadBoarding();

      setTimeout(() => {
        setLastQr("");
      }, 4000);
    } catch (e: any) {
      setScanResult({
        ok: false,
        error: e?.message || "Kunde inte scanna biljett.",
      });
    } finally {
      setScanLoading(false);
    }
  }

  const passengers = data?.passengers || [];
  const stats = data?.stats;

  const checkedInPercent = useMemo(() => {
    if (!stats?.passengers_total) return 0;
    return Math.round(
      (stats.checked_in_total / stats.passengers_total) * 100
    );
  }, [stats]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-4 pt-24 lg:p-6 lg:pt-24 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Boardingläge
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Scanna biljetter och följ incheckning live.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadBoarding}
                className="rounded-full border bg-white px-4 py-2 text-sm text-[#194C66]"
              >
                Uppdatera
              </button>

              <a
                href="/admin/sundra/scanner"
                className="rounded-full bg-[#194C66] px-4 py-2 text-sm font-semibold text-white"
              >
                Öppna scanner
              </a>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl bg-white p-8 shadow">
              Laddar boarding...
            </div>
          ) : (
            <>
              <section className="overflow-hidden rounded-3xl bg-white shadow">
                <div className="grid lg:grid-cols-[1fr_360px]">
                  <div className="p-6">
                    <div className="text-sm font-semibold uppercase tracking-wide text-[#194C66]/70">
                      {data?.trip?.destination || "Sundra"}
                    </div>

                    <h2 className="mt-1 text-3xl font-bold text-[#194C66]">
                      {data?.trip?.title || "Avgång"}
                    </h2>

                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <Info
                        label="Avgång"
                        value={`${fmtDate(data?.departure?.departure_date)} kl ${fmtTime(
                          data?.departure?.departure_time
                        )}`}
                      />
                      <Info
                        label="Retur"
                        value={`${fmtDate(data?.departure?.return_date)} kl ${fmtTime(
                          data?.departure?.return_time
                        )}`}
                      />
                      <Info
                        label="Bokningar"
                        value={stats?.bookings_total ?? 0}
                      />
                      <Info
                        label="Passagerare"
                        value={stats?.passengers_total ?? 0}
                      />
                    </div>
                  </div>

                  <div className="bg-[#194C66] p-6 text-white">
                    <div className="text-sm text-white/70">Ombord</div>

                    <div className="mt-2 text-5xl font-bold">
                      {stats?.checked_in_total || 0}
                      <span className="text-2xl text-white/60">
                        /{stats?.passengers_total || 0}
                      </span>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${checkedInPercent}%` }}
                      />
                    </div>

                    <div className="mt-3 text-sm text-white/80">
                      {checkedInPercent}% incheckade ·{" "}
                      {stats?.remaining_total || 0} kvar
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                <section className="rounded-3xl bg-white p-5 shadow">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#194C66]">
                      Passagerarlista
                    </h2>

                    <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]">
                      Live
                    </span>
                  </div>

                  {passengers.length === 0 ? (
                    <div className="rounded-2xl border bg-[#f8fafc] p-4 text-sm text-gray-500">
                      Inga passagerare hittades för denna avgång.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {passengers.map((p, index) => {
                        const checked = Number(p.checked_in_count || 0) > 0;

                        return (
                          <div
                            key={p.id || index}
                            className={`rounded-2xl border p-4 ${
                              checked
                                ? "border-green-200 bg-green-50"
                                : "bg-[#f8fafc]"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold text-[#0f172a]">
                                  {p.first_name || "—"} {p.last_name || ""}
                                </div>

                                <div className="mt-1 text-sm text-gray-500">
                                  {p.booking_number || "—"} ·{" "}
                                  {p.passenger_type || "Vuxen"}
                                  {p.seat_number ? ` · Plats ${p.seat_number}` : ""}
                                </div>
                              </div>

                              <div
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  checked
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {checked ? "Incheckad" : "Ej incheckad"}
                              </div>
                            </div>

                            {p.special_requests && (
                              <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-gray-600">
                                Önskemål: {p.special_requests}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <aside className="space-y-6">
                  <section className="rounded-3xl bg-white p-5 shadow">
                    <h2 className="font-semibold text-[#194C66]">
                      Snabbscanner
                    </h2>

                    <div className="mt-4 overflow-hidden rounded-2xl border bg-black">
                      <Scanner
                        onScan={(result) => {
                          const value = result?.[0]?.rawValue;
                          if (value) handleScan(value);
                        }}
                        onError={(err) => console.error(err)}
                        styles={{
                          container: {
                            width: "100%",
                            minHeight: "340px",
                          },
                        }}
                      />
                    </div>

                    <label className="mt-4 block">
                      <div className="mb-1 text-sm font-medium text-[#194C66]">
                        Antal som går ombord
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={scannedCount}
                        onChange={(e) =>
                          setScannedCount(
                            Math.max(1, Number(e.target.value || 1))
                          )
                        }
                        className="w-full rounded-xl border px-3 py-3"
                      />
                    </label>

                    {scanLoading && (
                      <div className="mt-4 rounded-xl bg-[#eef5f9] p-3 text-sm text-[#194C66]">
                        Kontrollerar biljett...
                      </div>
                    )}

                    {scanResult && (
                      <div
                        className={`mt-4 rounded-2xl border p-4 ${
                          scanResult.ok
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        <div className="font-bold">
                          {scanResult.ok ? "Godkänd" : "Nekad"}
                        </div>
                        <div className="mt-1 text-sm">
                          {scanResult.message || scanResult.error}
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="rounded-3xl bg-white p-5 shadow">
                    <h2 className="font-semibold text-[#194C66]">
                      Driftinformation
                    </h2>

                    <div className="mt-4 space-y-3 text-sm">
                      <Info label="Avgångs-ID" value={departureId} />
                      <Info
                        label="Senast uppdaterad"
                        value={new Date().toLocaleTimeString("sv-SE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      />
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function fmtDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
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
