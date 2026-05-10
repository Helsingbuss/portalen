import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Refund = {
  id: string;
  booking_id?: string | null;
  booking_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  reason?: string | null;
  method?: string | null;
  created_at?: string | null;
  refunded_at?: string | null;
};

function money(value?: number | null, currency = "SEK") {
  if (value == null) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status?: string | null) {
  if (status === "pending") return "Väntar";
  if (status === "refunded") return "Återbetald";
  if (status === "rejected") return "Nekad";
  return status || "—";
}

function statusClass(status?: string | null) {
  if (status === "refunded") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export default function SundraRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadRefunds() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/refunds");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta återbetalningar.");
      }

      setRefunds(json.refunds || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRefunds();
  }, []);

  async function markRefunded(refund: Refund) {
    if (!confirm(`Markera ${refund.booking_number} som återbetald?`)) return;

    try {
      setSavingId(refund.id);

      const res = await fetch("/api/admin/sundra/refunds/mark-refunded", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refund_id: refund.id,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte markera återbetalning.");
      }

      await loadRefunds();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return refunds;
    return refunds.filter((r) => r.status === filter);
  }, [refunds, filter]);

  const stats = useMemo(() => {
    return {
      total: refunds.length,
      pending: refunds.filter((r) => r.status === "pending").length,
      refunded: refunds.filter((r) => r.status === "refunded").length,
      amount: refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    };
  }, [refunds]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Återbetalningar
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Hantera manuella återbetalningar för Sundra-bokningar.
              </p>
            </div>

            <button
              onClick={loadRefunds}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat title="Totalt" value={stats.total} />
            <Stat title="Väntar" value={stats.pending} />
            <Stat title="Återbetalda" value={stats.refunded} />
            <Stat title="Belopp" value={money(stats.amount)} />
          </div>

          <section className="rounded-3xl bg-white p-5 shadow">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm md:w-72"
            >
              <option value="all">Alla återbetalningar</option>
              <option value="pending">Väntar</option>
              <option value="refunded">Återbetalda</option>
              <option value="rejected">Nekade</option>
            </select>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Alla återbetalningar
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">Laddar...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga återbetalningar hittades.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((r) => (
                  <div key={r.id} className="p-5 hover:bg-[#f8fafc]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-[#0f172a]">
                            {r.booking_number || "—"}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              r.status
                            )}`}
                          >
                            {statusLabel(r.status)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          {r.customer_name || "—"} · {r.customer_email || "—"}
                        </p>

                        {r.reason && (
                          <p className="mt-2 text-sm text-gray-600">
                            Orsak: {r.reason}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-[#194C66]">
                          {money(r.amount, r.currency || "SEK")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.method || "Manuell"}
                        </div>
                      </div>
                    </div>

                    {r.status === "pending" && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => markRefunded(r)}
                          disabled={savingId === r.id}
                          className="rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {savingId === r.id
                            ? "Sparar..."
                            : "Markera som återbetald"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}
