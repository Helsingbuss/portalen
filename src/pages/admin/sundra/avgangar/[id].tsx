import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
};

type DepartureForm = {
  trip_id: string;
  departure_date: string;
  departure_time: string;
  return_date: string;
  return_time: string;
  price: string;
  capacity: string;
  booked_count: string;
  status: string;
  last_booking_date: string;
};

const EMPTY_FORM: DepartureForm = {
  trip_id: "",
  departure_date: "",
  departure_time: "",
  return_date: "",
  return_time: "",
  price: "",
  capacity: "",
  booked_count: "0",
  status: "open",
  last_booking_date: "",
};

function statusLabel(status: string) {
  switch (status) {
    case "open":
      return "Öppen";
    case "closed":
      return "Stängd";
    case "full":
      return "Fullbokad";
    case "cancelled":
      return "Inställd";
    default:
      return status || "—";
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "open":
      return "bg-green-100 text-green-700";
    case "closed":
      return "bg-gray-100 text-gray-700";
    case "full":
      return "bg-orange-100 text-orange-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
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

function tidyTime(time?: string | null) {
  if (!time) return "—";
  const s = String(time);
  if (s.includes(":")) return s.slice(0, 5);
  if (s.length >= 4) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return s;
}

function money(value?: string | number | null) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "—";

  return n.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

export default function SundraDepartureDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [form, setForm] = useState<DepartureForm>(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    loadDeparture(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadTrips() {
    try {
      setLoadingTrips(true);

      const res = await fetch("/api/admin/sundra/trips");
      const json = await res.json().catch(() => ({}));

      setTrips(Array.isArray(json?.trips) ? json.trips : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTrips(false);
    }
  }

  async function loadDeparture(departureId: string) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/sundra/departures/${departureId}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta avgången.");
      }

      const departure = json.departure;

      setForm({
        trip_id: departure.trip_id || "",
        departure_date: departure.departure_date || "",
        departure_time: departure.departure_time
          ? String(departure.departure_time).slice(0, 5)
          : "",
        return_date: departure.return_date || "",
        return_time: departure.return_time
          ? String(departure.return_time).slice(0, 5)
          : "",
        price:
          departure.price === null || departure.price === undefined
            ? ""
            : String(departure.price),
        capacity:
          departure.capacity === null || departure.capacity === undefined
            ? ""
            : String(departure.capacity),
        booked_count:
          departure.booked_count === null ||
          departure.booked_count === undefined
            ? "0"
            : String(departure.booked_count),
        status: departure.status || "open",
        last_booking_date: departure.last_booking_date || "",
      });
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  function update(key: keyof DepartureForm, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSavedMessage("");
  }

  async function save() {
    if (!id || typeof id !== "string") return;

    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      const res = await fetch(`/api/admin/sundra/departures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte spara avgången.");
      }

      setSavedMessage("Sparat ✔");
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  async function removeDeparture() {
    if (!id || typeof id !== "string") return;

    const ok = confirm(
      "Är du säker på att du vill ta bort avgången? Detta går inte att ångra."
    );

    if (!ok) return;

    try {
      setError("");

      const res = await fetch(`/api/admin/sundra/departures/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte ta bort avgången.");
      }

      router.push("/admin/sundra/avganger");
    } catch (e: any) {
      setError(e?.message || "Något gick fel vid borttagning.");
    }
  }

  const selectedTrip = trips.find((trip) => trip.id === form.trip_id);

  const capacity = Number(form.capacity || 0);
  const booked = Number(form.booked_count || 0);
  const seatsLeft = Math.max(0, capacity - booked);
  const fillPercent =
    capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;

  const title = selectedTrip?.title || "Avgång";

  const bookingStatusText =
    form.status === "open" && seatsLeft > 0
      ? "Öppen för bokning"
      : form.status === "full" || seatsLeft <= 0
        ? "Fullbokad"
        : form.status === "cancelled"
          ? "Inställd"
          : "Stängd";

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                {loading ? "Laddar avgång..." : title}
              </h1>
              <p className="text-sm text-[#194C66]/60">
                Hantera datum, kapacitet, pris och bokningsstatus.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => router.push("/admin/sundra/avganger")}
                className="rounded-[25px] border bg-white px-4 py-2 text-sm text-[#194C66] hover:bg-gray-50"
              >
                Tillbaka
              </button>

              {form.trip_id && (
                <button
                  onClick={() =>
                    router.push(`/admin/sundra/resor/${form.trip_id}`)
                  }
                  className="rounded-[25px] border bg-white px-4 py-2 text-sm text-[#194C66] hover:bg-gray-50"
                >
                  Öppna resa
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow">
              Laddar avgång...
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-4">
                <StatCard
                  label="Kapacitet"
                  value={`${capacity || 0}`}
                  sub="platser totalt"
                />
                <StatCard
                  label="Bokade"
                  value={`${booked || 0}`}
                  sub="platser bokade"
                />
                <StatCard
                  label="Lediga"
                  value={`${seatsLeft}`}
                  sub="platser kvar"
                />
                <StatCard
                  label="Beläggning"
                  value={`${fillPercent}%`}
                  sub={bookingStatusText}
                />
              </section>

              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <section className="rounded-xl bg-white p-5 shadow space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-[#194C66]">
                      Avgångsinformation
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Redigera datum, tider, pris och bokningsläge.
                    </p>
                  </div>

                  <Field label="Resa">
                    <select
                      value={form.trip_id}
                      onChange={(e) => update("trip_id", e.target.value)}
                      disabled={loadingTrips}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="">
                        {loadingTrips ? "Laddar resor..." : "Välj resa"}
                      </option>
                      {trips.map((trip) => (
                        <option key={trip.id} value={trip.id}>
                          {trip.title}
                          {trip.destination ? ` – ${trip.destination}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Avgångsdatum">
                      <input
                        type="date"
                        value={form.departure_date}
                        onChange={(e) =>
                          update("departure_date", e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Avgångstid">
                      <input
                        type="time"
                        value={form.departure_time}
                        onChange={(e) =>
                          update("departure_time", e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Returdatum">
                      <input
                        type="date"
                        value={form.return_date}
                        onChange={(e) => update("return_date", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Returtid">
                      <input
                        type="time"
                        value={form.return_time}
                        onChange={(e) => update("return_time", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Pris">
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) => update("price", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Kapacitet / antal platser">
                      <input
                        type="number"
                        value={form.capacity}
                        onChange={(e) => update("capacity", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Bokade platser">
                      <input
                        type="number"
                        value={form.booked_count}
                        onChange={(e) => update("booked_count", e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>

                    <Field label="Sista bokningsdag">
                      <input
                        type="date"
                        value={form.last_booking_date}
                        onChange={(e) =>
                          update("last_booking_date", e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2"
                      />
                    </Field>
                  </div>

                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) => update("status", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="open">Öppen för bokning</option>
                      <option value="closed">Stängd</option>
                      <option value="full">Fullbokad</option>
                      <option value="cancelled">Inställd</option>
                    </select>
                  </Field>
                </section>

                <aside className="h-fit rounded-xl bg-white p-5 shadow">
                  <h2 className="text-lg font-semibold text-[#194C66]">
                    Sammanfattning
                  </h2>

                  <div className="mt-4 rounded-xl border bg-[#f8fafc] p-4">
                    <div className="text-xs uppercase tracking-wide text-[#194C66]/60">
                      {selectedTrip?.destination || "Destination"}
                    </div>

                    <div className="mt-1 text-lg font-semibold text-[#0f172a]">
                      {selectedTrip?.title || "Resa saknas"}
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      {fmtDate(form.departure_date)} kl{" "}
                      {tidyTime(form.departure_time)}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      Retur: {fmtDate(form.return_date)} kl{" "}
                      {tidyTime(form.return_time)}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Pris</span>
                      <span className="font-semibold text-[#194C66]">
                        {money(form.price)}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>
                          {booked}/{capacity} bokade
                        </span>
                        <span>{fillPercent}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-[#194C66]"
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                          form.status
                        )}`}
                      >
                        {statusLabel(form.status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <Summary label="Lediga platser" value={`${seatsLeft}`} />
                    <Summary label="Sista bokningsdag" value={form.last_booking_date || "—"} />
                    <Summary label="Bokningsläge" value={bookingStatusText} />
                  </div>

                  <button
                    onClick={save}
                    disabled={saving || !form.trip_id || !form.departure_date}
                    className="mt-6 w-full rounded-lg bg-[#194C66] px-4 py-3 font-medium text-white hover:bg-[#163b4d] disabled:opacity-50"
                  >
                    {saving ? "Sparar..." : "Spara avgång"}
                  </button>

                  {savedMessage && (
                    <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                      {savedMessage}
                    </div>
                  )}

                  <button
                    onClick={removeDeparture}
                    className="mt-3 w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Ta bort avgång
                  </button>
                </aside>
              </div>

              <section className="rounded-xl bg-white p-5 shadow">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold text-[#194C66]">
                      Resenärer
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Här kommer vi senare visa bokningar, passagerare,
                      betalstatus och check-in.
                    </p>
                  </div>

                  <button
                    disabled
                    className="rounded-[25px] border bg-gray-50 px-4 py-2 text-sm text-gray-400"
                  >
                    Kommer snart
                  </button>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="text-sm text-[#194C66]/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#194C66]">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-[#194C66]">{label}</div>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-[#0f172a]">{value}</span>
    </div>
  );
}


