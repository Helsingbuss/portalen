import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
};

export default function NewSundraDeparturePage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    trip_id: typeof router.query.trip_id === "string" ? router.query.trip_id : "",
    departure_date: "",
    departure_time: "",
    return_date: "",
    return_time: "",
    price: "",
    capacity: "",
    booked_count: "0",
    status: "open",
    last_booking_date: "",
  });

  useEffect(() => {
    async function loadTrips() {
      try {
        const res = await fetch("/api/admin/sundra/trips");
        const json = await res.json().catch(() => ({}));

        setTrips(Array.isArray(json?.trips) ? json.trips : []);

        if (!form.trip_id && typeof router.query.trip_id === "string") {
          setForm((prev) => ({ ...prev, trip_id: router.query.trip_id as string }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTrips(false);
      }
    }

    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.trip_id]);

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/sundra/departures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa avgången.");
      }

      router.push(`/admin/sundra/avganger/${json.departure.id}`);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  const selectedTrip = trips.find((trip) => trip.id === form.trip_id);

  const capacity = Number(form.capacity || 0);
  const booked = Number(form.booked_count || 0);
  const seatsLeft = Math.max(0, capacity - booked);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Skapa avgång
              </h1>
              <p className="text-sm text-[#194C66]/60">
                Lägg upp ett bokningsbart datum för en Sundra-resa.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/sundra/avganger")}
              className="rounded-[25px] border bg-white px-4 py-2 text-sm text-[#194C66] hover:bg-gray-50"
            >
              Tillbaka
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-xl bg-white p-5 shadow space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Avgångsinformation
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Välj resa, datum, tider, pris och antal platser.
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
                    onChange={(e) => update("departure_date", e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Avgångstid">
                  <input
                    type="time"
                    value={form.departure_time}
                    onChange={(e) => update("departure_time", e.target.value)}
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
                    placeholder="Ex. 495"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Kapacitet / antal platser">
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => update("capacity", e.target.value)}
                    placeholder="Ex. 49"
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
                    onChange={(e) => update("last_booking_date", e.target.value)}
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

              <div className="mt-4 space-y-3 text-sm">
                <Summary label="Resa" value={selectedTrip?.title || "—"} />
                <Summary label="Datum" value={form.departure_date || "—"} />
                <Summary label="Tid" value={form.departure_time || "—"} />
                <Summary label="Pris" value={`${form.price || "0"} SEK`} />
                <Summary label="Kapacitet" value={`${capacity} platser`} />
                <Summary label="Bokade" value={`${booked} platser`} />
                <Summary label="Lediga" value={`${seatsLeft} platser`} />
                <Summary label="Status" value={form.status} />
              </div>

              <button
                onClick={save}
                disabled={saving || !form.trip_id || !form.departure_date}
                className="mt-6 w-full rounded-lg bg-[#194C66] px-4 py-3 font-medium text-white hover:bg-[#163b4d] disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Skapa avgång"}
              </button>

              <p className="mt-3 text-xs text-gray-500">
                När avgången är skapad kan vi senare koppla på hållplatser,
                tider och bokningsflöde.
              </p>
            </aside>
          </div>
        </main>
      </div>
    </>
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
