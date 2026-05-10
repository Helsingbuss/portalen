import { useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import { Scanner } from "@yudiel/react-qr-scanner";

type ScanResult = {
  ok: boolean;
  status?: string;
  message?: string;
  error?: string;

  passengers_total?: number;
  checked_in_now?: number;
  already_checked_in?: number;
  remaining?: number;

  booking?: {
    booking_number?: string;
    customer_name?: string;
    trip_title?: string;
    destination?: string;
    departure_date?: string;
    departure_time?: string;
  };
};

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

export default function SundraScannerPage() {
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(false);

  const [scannedCount, setScannedCount] = useState(1);

  const [result, setResult] =
    useState<ScanResult | null>(null);

  const [lastQr, setLastQr] = useState("");

  async function handleScan(rawQr: string) {
    try {
      if (!rawQr?.trim()) return;

      // STOPPA DUBBELSCAN DIREKT
      if (rawQr === lastQr) return;

      setLastQr(rawQr);

      setLoading(true);

      const res = await fetch(
        "/api/admin/sundra/tickets/scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            qr: rawQr,
            scanned_count: scannedCount,
          }),
        }
      );

      const json = await res.json();

      setResult(json);

      // VIBRATION
      if (
        json?.ok &&
        typeof window !== "undefined" &&
        navigator?.vibrate
      ) {
        navigator.vibrate([120, 50, 120]);
      }

      // Tillåt samma QR igen efter 4 sek
      setTimeout(() => {
        setLastQr("");
      }, 4000);
    } catch (e: any) {
      setResult({
        ok: false,
        error:
          e?.message ||
          "Kunde inte kontrollera biljetten.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-4 pt-24 lg:p-6 lg:pt-24 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Sundra QR Scanner
            </h1>

            <p className="mt-1 text-sm text-[#194C66]/70">
              Scanna biljetter och checka in resenärer.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* SCANNER */}
            <section className="rounded-3xl bg-white p-4 shadow overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#194C66]">
                  Livekamera
                </h2>

                <div className="text-xs rounded-full bg-[#eef5f9] px-3 py-1 text-[#194C66]">
                  LIVE
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border bg-black">
                <Scanner
                  onScan={(result) => {
                    const value =
                      result?.[0]?.rawValue;

                    if (value) {
                      setQr(value);
                      handleScan(value);
                    }
                  }}
                  onError={(error) => {
                    console.error(error);
                  }}
                  styles={{
                    container: {
                      width: "100%",
                      minHeight: "420px",
                    },
                  }}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-sm font-medium text-[#194C66]">
                    Antal som går ombord
                  </div>

                  <input
                    type="number"
                    min={1}
                    value={scannedCount}
                    onChange={(e) =>
                      setScannedCount(
                        Math.max(
                          1,
                          Number(e.target.value || 1)
                        )
                      )
                    }
                    className="w-full rounded-xl border px-3 py-3"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium text-[#194C66]">
                    Senaste QR
                  </div>

                  <input
                    value={qr}
                    readOnly
                    className="w-full rounded-xl border bg-[#f8fafc] px-3 py-3 text-xs"
                  />
                </label>
              </div>

              {/* MANUELL FALLBACK */}
              <div className="mt-6 rounded-2xl border bg-[#f8fafc] p-4">
                <div className="font-medium text-[#194C66]">
                  Manuell QR-data
                </div>

                <textarea
                  rows={5}
                  value={qr}
                  onChange={(e) => setQr(e.target.value)}
                  className="mt-3 w-full rounded-xl border px-3 py-3 text-xs font-mono"
                  placeholder="Klistra in QR-data manuellt..."
                />

                <button
                  onClick={() => handleScan(qr)}
                  disabled={loading || !qr.trim()}
                  className="mt-3 w-full rounded-xl bg-[#194C66] px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {loading
                    ? "Kontrollerar..."
                    : "Checka in manuellt"}
                </button>
              </div>
            </section>

            {/* RESULTAT */}
            <aside className="space-y-4">
              <div className="rounded-3xl bg-white p-5 shadow">
                <h2 className="font-semibold text-[#194C66]">
                  Resultat
                </h2>

                {!result ? (
                  <div className="mt-4 rounded-2xl border bg-[#f8fafc] p-4 text-sm text-gray-500">
                    Ingen biljett scannad ännu.
                  </div>
                ) : result.ok ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                      <div className="text-lg font-bold text-green-800">
                        {result.message}
                      </div>

                      <div className="mt-2 text-sm text-green-700">
                        Biljetten är giltig.
                      </div>
                    </div>

                    <div className="space-y-2 rounded-2xl border bg-[#f8fafc] p-4 text-sm">
                      <Row
                        label="Bokning"
                        value={
                          result.booking
                            ?.booking_number
                        }
                      />

                      <Row
                        label="Kund"
                        value={
                          result.booking
                            ?.customer_name
                        }
                      />

                      <Row
                        label="Resa"
                        value={
                          result.booking
                            ?.trip_title
                        }
                      />

                      <Row
                        label="Destination"
                        value={
                          result.booking
                            ?.destination
                        }
                      />

                      <Row
                        label="Avgång"
                        value={`${fmtDate(
                          result.booking
                            ?.departure_date
                        )} kl ${fmtTime(
                          result.booking
                            ?.departure_time
                        )}`}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat
                        label="Totalt"
                        value={
                          result.passengers_total ||
                          0
                        }
                      />

                      <MiniStat
                        label="Incheckade"
                        value={
                          result.already_checked_in ||
                          0
                        }
                      />

                      <MiniStat
                        label="Kvar"
                        value={result.remaining || 0}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="font-bold text-red-700">
                      Ogiltig biljett
                    </div>

                    <div className="mt-1 text-sm text-red-600">
                      {result.error}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white p-5 shadow">
                <h2 className="font-semibold text-[#194C66]">
                  Hur det fungerar
                </h2>

                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="rounded-xl bg-[#f8fafc] p-3">
                    QR-koden verifieras mot bokning
                    och ticket_hash.
                  </div>

                  <div className="rounded-xl bg-[#f8fafc] p-3">
                    Systemet kontrollerar betalstatus
                    och antal resenärer.
                  </div>

                  <div className="rounded-xl bg-[#f8fafc] p-3">
                    Alla scanningar loggas för att
                    stoppa dubbel incheckning.
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/10 pb-2">
      <span className="text-gray-500">
        {label}
      </span>

      <span className="text-right font-semibold">
        {value || "—"}
      </span>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-2xl bg-[#194C66] p-4 text-center text-white">
      <div className="text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-white/80">
        {label}
      </div>
    </div>
  );
}


