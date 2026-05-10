import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Booking = {
  id: string;
  booking_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  status?: string | null;
  payment_status?: string | null;
  passengers_count?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;

  sundra_trips?: {
    title?: string | null;
    destination?: string | null;
  } | null;

  sundra_departures?: {
    departure_date?: string | null;
    departure_time?: string | null;
  } | null;
};

function money(value?: number | null, currency = "SEK") {
  if (value == null) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

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

function statusClass(status?: string | null) {
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "confirmed") return "bg-green-100 text-green-700";
  return "bg-amber-100 text-amber-700";
}

function statusLabel(status?: string | null) {
  if (status === "cancelled") return "Avbokad";
  if (status === "confirmed") return "Bekräftad";
  if (status === "pending") return "Inväntar";
  return status || "—";
}

export default function SundraCancellationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/bookings/tickets");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta bokningar.");
      }

      setBookings(json.bookings || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function cancelBooking(booking: Booking) {
    const reason = reasonMap[booking.id] || "";

    if (!confirm(`Vill du avboka ${booking.booking_number}?`)) return;

    try {
      setSavingId(booking.id);
      setError("");

      const res = await fetch("/api/admin/sundra/bookings/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: booking.id,
          reason,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte avboka.");
      }

      await loadBookings();
    } catch (e: any) {
      setError(e?.message || "Något gick fel vid avbokning.");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return bookings.filter((b) => {
      if (!q) return true;

      return (
        b.booking_number?.toLowerCase().includes(q) ||
        b.customer_name?.toLowerCase().includes(q) ||
        b.customer_email?.toLowerCase().includes(q) ||
        b.sundra_trips?.title?.toLowerCase().includes(q) ||
        b.sundra_trips?.destination?.toLowerCase().includes(q)
      );
    });
  }, [bookings, search]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
      active: bookings.filter((b) => b.status !== "cancelled").length,
    };
  }, [bookings]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div>
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Avbokningar
            </h1>
            <p className="mt-1 text-sm text-[#194C66]/70">
              Hantera avbokningar och markera bokningar som avbokade.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Stat title="Totalt" value={stats.total} />
            <Stat title="Aktiva" value={stats.active} />
            <Stat title="Avbokade" value={stats.cancelled} />
          </div>

          <section className="rounded-3xl bg-white p-5 shadow">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök bokning, kund eller resa..."
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Bokningar
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">Laddar...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga bokningar hittades.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((b) => (
                  <div key={b.id} className="p-5 hover:bg-[#f8fafc]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-[#0f172a]">
                            {b.booking_number || "—"}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              b.status
                            )}`}
                          >
                            {statusLabel(b.status)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          {b.customer_name || "—"} · {b.customer_email || "—"}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {b.sundra_trips?.title || "Sundra resa"} ·{" "}
                          {b.sundra_trips?.destination || "—"}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-[#194C66]">
                          {money(b.total_amount, b.currency || "SEK")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {b.passengers_count || 0} resenärer
                        </div>
                      </div>
                    </div>

                    {b.status === "cancelled" ? (
                      <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                        Avbokad {fmtDate(b.cancelled_at)}.
                        {b.cancellation_reason && (
                          <div className="mt-1">
                            Orsak: {b.cancellation_reason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
                        <input
                          value={reasonMap[b.id] || ""}
                          onChange={(e) =>
                            setReasonMap((prev) => ({
                              ...prev,
                              [b.id]: e.target.value,
                            }))
                          }
                          placeholder="Orsak till avbokning..."
                          className="rounded-xl border px-4 py-3 text-sm"
                        />

                        <button
                          onClick={() => cancelBooking(b)}
                          disabled={savingId === b.id}
                          className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {savingId === b.id ? "Avbokar..." : "Avboka"}
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
