import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Trip = {
  id: string;
  title?: string;
  destination?: string;
};

type BusMap = {
  id: string;
  name: string;
  seats_count?: number | null;
  bus_type?: string | null;
  status?: string | null;
};

export default function NewDeparturePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingBusMaps, setLoadingBusMaps] = useState(true);
  const [error, setError] = useState("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [busMaps, setBusMaps] = useState<BusMap[]>([]);

  const [form, setForm] = useState({
    trip_id: "",
    bus_map_id: "",

    departure_date: "",
    departure_time: "",

    return_date: "",
    return_time: "",

    price: "",
    capacity: "50",

    booking_deadline: "",

    departure_location: "",
    destination_location: "",

    status: "open",

    notes: "",
  });

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadTrips() {
    try {
      setLoadingTrips(true);

      const res = await fetch("/api/admin/sundra/trips");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta resor.");
      }

      setTrips(json.trips || []);
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta resor.");
    } finally {
      setLoadingTrips(false);
    }
  }

  async function loadBusMaps() {
    try {
      setLoadingBusMaps(true);

      const res = await fetch("/api/admin/sundra/bus-maps");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta busskartor.");
      }

      const activeMaps = (json.bus_maps || []).filter(
        (map: BusMap) => map.status !== "inactive"
      );

      setBusMaps(activeMaps);
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta busskartor.");
    } finally {
      setLoadingBusMaps(false);
    }
  }

  useEffect(() => {
    loadTrips();
    loadBusMaps();
  }, []);

  async function save() {
    try {
      setSaving(true);
      setError("");

      if (!form.trip_id) {
        throw new Error("Välj en resa.");
      }

      if (!form.departure_date) {
        throw new Error("Välj avgångsdatum.");
      }

      const res = await fetch("/api/admin/sundra/departures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          bus_map_id: form.bus_map_id || null,
          price: Number(form.price || 0),
          capacity: Number(form.capacity || 0),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa avgång.");
      }

      router.push(`/admin/sundra/avgangar/${json.departure.id}`);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  const selectedBusMap = busMaps.find((map) => map.id === form.bus_map_id);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Skapa avgång
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa ny avgång för Sundra-resor.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/sundra/avgangar")}
              className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-[#f8fafc]"
            >
              Tillbaka
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="mb-5 text-lg font-semibold text-[#194C66]">
                Avgångsinformation
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Resa">
                  <select
                    value={form.trip_id}
                    onChange={(e) => update("trip_id", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    disabled={loadingTrips}
                  >
                    <option value="">
                      {loadingTrips ? "Laddar resor..." : "Välj resa"}
                    </option>

                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                        {trip.destination ? ` • ${trip.destination}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="open">Öppen</option>
                    <option value="draft">Utkast</option>
                    <option value="closed">Stängd</option>
                  </select>
                </Field>

                <Field label="Busskarta / säteskarta">
                  <select
                    value={form.bus_map_id}
                    onChange={(e) => {
                      const busMapId = e.target.value;
                      update("bus_map_id", busMapId);

                      const map = busMaps.find((m) => m.id === busMapId);

                      if (map?.seats_count) {
                        update("capacity", String(map.seats_count));
                      }
                    }}
                    className="w-full rounded-xl border px-3 py-2"
                    disabled={loadingBusMaps}
                  >
                    <option value="">
                      {loadingBusMaps
                        ? "Laddar busskartor..."
                        : "Ingen busskarta vald"}
                    </option>

                    {busMaps.map((map) => (
                      <option key={map.id} value={map.id}>
                        {map.name}
                        {map.seats_count ? ` • ${map.seats_count} platser` : ""}
                      </option>
                    ))}
                  </select>

                  {selectedBusMap && (
                    <p className="mt-2 text-xs text-[#194C66]/70">
                      Vald karta: {selectedBusMap.name} ·{" "}
                      {selectedBusMap.seats_count || 0} platser
                    </p>
                  )}
                </Field>

                <Field label="Kapacitet">
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => update("capacity", e.target.value)}
                    placeholder="50"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Avgångsdatum">
                  <input
                    type="date"
                    value={form.departure_date}
                    onChange={(e) => update("departure_date", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Avgångstid">
                  <input
                    type="time"
                    value={form.departure_time}
                    onChange={(e) => update("departure_time", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Returdatum">
                  <input
                    type="date"
                    value={form.return_date}
                    onChange={(e) => update("return_date", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Returtid">
                  <input
                    type="time"
                    value={form.return_time}
                    onChange={(e) => update("return_time", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Pris">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    placeholder="699"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Bokningsstopp">
                  <input
                    type="datetime-local"
                    value={form.booking_deadline}
                    onChange={(e) => update("booking_deadline", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Påstigning">
                  <input
                    value={form.departure_location}
                    onChange={(e) =>
                      update("departure_location", e.target.value)
                    }
                    placeholder="Malmö C"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Destination">
                  <input
                    value={form.destination_location}
                    onChange={(e) =>
                      update("destination_location", e.target.value)
                    }
                    placeholder="Ullared"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Intern notering">
                  <textarea
                    rows={5}
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Intern info till personal/chaufför..."
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Publicering
                </h2>

                <div className="mt-4 rounded-2xl bg-[#f8fafc] p-4 text-sm text-gray-600">
                  Avgången blir direkt bokningsbar om status är satt till:
                  <strong className="ml-1 text-[#194C66]">Öppen</strong>
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="mt-6 w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white hover:bg-[#16384d] disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Skapa avgång"}
                </button>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Sätesval
                </h2>

                <div className="mt-4 rounded-2xl bg-[#f8fafc] p-4 text-sm text-gray-600">
                  Välj busskarta om kunden ska kunna välja plats själv i
                  kassan. Om ingen busskarta väljs kan systemet senare tilldela
                  plats automatiskt utan säteskarta.
                </div>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Tips
                </h2>

                <ul className="mt-4 space-y-3 text-sm text-gray-600">
                  <li>• Kapacitet används för live beläggning.</li>
                  <li>
                    • Väljer du busskarta sätts kapaciteten automatiskt efter
                    antal säten.
                  </li>
                  <li>
                    • Avgången syns direkt på resesidan när den är öppen.
                  </li>
                </ul>
              </section>
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
