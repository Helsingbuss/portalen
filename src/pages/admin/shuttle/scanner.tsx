import { useEffect, useRef, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type ScanResult = {
  ok: boolean;
  result?: string;
  message?: string;
  error?: string;
  summary?: {
    ticket_number?: string;
    customer_name?: string;
    route_name?: string;
    departure_date?: string;
    departure_time?: string;
    passengers_count?: number;
  };
  ticket?: any;
};

function resultStyle(result?: string, ok?: boolean) {
  if (ok || result === "approved") {
    return {
      box: "border-green-200 bg-green-50 text-green-800",
      badge: "bg-green-100 text-green-700",
      title: "Godkänd biljett",
    };
  }

  if (result === "already_checked_in") {
    return {
      box: "border-amber-200 bg-amber-50 text-amber-800",
      badge: "bg-amber-100 text-amber-700",
      title: "Redan incheckad",
    };
  }

  if (result === "unpaid") {
    return {
      box: "border-orange-200 bg-orange-50 text-orange-800",
      badge: "bg-orange-100 text-orange-700",
      title: "Ej betald",
    };
  }

  if (result === "cancelled") {
    return {
      box: "border-red-200 bg-red-50 text-red-800",
      badge: "bg-red-100 text-red-700",
      title: "Avbokad biljett",
    };
  }

  return {
    box: "border-red-200 bg-red-50 text-red-800",
    badge: "bg-red-100 text-red-700",
    title: "Ogiltig biljett",
  };
}

export default function ShuttleScannerPage() {
  const [code, setCode] = useState("");
  const [scannedBy, setScannedBy] = useState("Admin");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [recentResults, setRecentResults] = useState<ScanResult[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function scanTicket(scanValue?: string) {
    const scanCode = String(scanValue || code || "").trim();

    if (!scanCode) {
      setLastResult({
        ok: false,
        result: "invalid",
        error: "Skriv eller scanna en QR-kod först.",
      });
      inputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/admin/shuttle/scan-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scan_code: scanCode,
          scanned_by: scannedBy || "Admin",
        }),
      });

      const json = await res.json().catch(() => ({}));

      const result: ScanResult = {
        ok: Boolean(json?.ok),
        result: json?.result,
        message: json?.message,
        error: json?.error,
        summary: json?.summary,
        ticket: json?.ticket,
      };

      setLastResult(result);
      setRecentResults((prev) => [result, ...prev].slice(0, 8));
      setCode("");

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } catch (e: any) {
      const result: ScanResult = {
        ok: false,
        result: "error",
        error: e?.message || "Kunde inte scanna biljett.",
      };

      setLastResult(result);
      setRecentResults((prev) => [result, ...prev].slice(0, 8));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      scanTicket();
    }
  }

  const style = resultStyle(lastResult?.result, lastResult?.ok);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Airport Shuttle – Scanner
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Scanna QR-koder och checka in passagerare på flygbussen.
              </p>
            </div>

            <button
              onClick={() => inputRef.current?.focus()}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Fokusera scanner
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <div className="rounded-3xl bg-[#194C66] p-6 text-white">
                <h2 className="text-xl font-semibold">Scanna biljett</h2>

                <p className="mt-1 text-sm text-white/75">
                  Använd QR-läsare, kamera-app eller skriv in QR-koden manuellt.
                  Tryck Enter för att scanna.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
                  <input
                    ref={inputRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex. SHUTTLE:AST26123456:booking-id"
                    className="w-full rounded-2xl border-0 px-5 py-4 text-lg font-semibold text-[#0f172a] outline-none ring-4 ring-white/10 focus:ring-white/30"
                    autoComplete="off"
                  />

                  <button
                    onClick={() => scanTicket()}
                    disabled={loading}
                    className="rounded-2xl bg-white px-6 py-4 text-lg font-bold text-[#194C66] disabled:opacity-60"
                  >
                    {loading ? "Scannar..." : "Scanna"}
                  </button>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-white/85">
                    Scannad av
                  </label>

                  <input
                    value={scannedBy}
                    onChange={(e) => setScannedBy(e.target.value)}
                    className="mt-1 w-full max-w-sm rounded-xl border-0 px-4 py-3 text-[#0f172a] outline-none"
                    placeholder="Ex. Förare / Admin"
                  />
                </div>
              </div>

              {lastResult && (
                <div className={`mt-6 rounded-3xl border p-6 ${style.box}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wide opacity-80">
                        Resultat
                      </div>

                      <h2 className="mt-1 text-2xl font-bold">{style.title}</h2>

                      <p className="mt-2 text-sm">
                        {lastResult.message ||
                          lastResult.error ||
                          "Scanningen är genomförd."}
                      </p>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style.badge}`}>
                      {lastResult.result || (lastResult.ok ? "approved" : "invalid")}
                    </span>
                  </div>

                  {lastResult.summary && (
                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                      <Info label="Biljett" value={lastResult.summary.ticket_number || "—"} />
                      <Info label="Kund" value={lastResult.summary.customer_name || "—"} />
                      <Info label="Rutt" value={lastResult.summary.route_name || "—"} />
                      <Info
                        label="Avgång"
                        value={`${lastResult.summary.departure_date || "—"} kl ${
                          lastResult.summary.departure_time || "—"
                        }`}
                      />
                      <Info
                        label="Antal"
                        value={`${lastResult.summary.passengers_count || 1} personer`}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Senaste scanningar
              </h2>

              <div className="mt-5 space-y-3">
                {recentResults.length === 0 ? (
                  <div className="rounded-2xl border bg-[#f8fafc] p-4 text-sm text-gray-500">
                    Inga scanningar ännu.
                  </div>
                ) : (
                  recentResults.map((item, index) => {
                    const s = resultStyle(item.result, item.ok);

                    return (
                      <div
                        key={`${item.result}-${index}`}
                        className={`rounded-2xl border p-4 ${s.box}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">
                            {item.summary?.ticket_number || s.title}
                          </div>

                          <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${s.badge}`}>
                            {item.result || "—"}
                          </span>
                        </div>

                        <div className="mt-1 text-sm opacity-80">
                          {item.summary?.customer_name ||
                            item.message ||
                            item.error ||
                            "—"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}
