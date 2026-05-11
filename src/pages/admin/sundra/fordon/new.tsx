import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type BusMap = {
  id: string;
  name: string;
  seats_count?: number | null;
};

export default function NewVehiclePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [maps, setMaps] = useState<BusMap[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(true);

  const [form, setForm] = useState({
    name: "",
    registration_number: "",
    operator_name: "",

    vehicle_type: "coach",

    seats_count: "50",

    bus_map_id: "",

    status: "active",

    notes: "",
  });

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadMaps() {
    try {
      setLoadingMaps(true);

      const res = await fetch("/api/admin/sundra/bus-maps");

      const json = await res.json().catch(() => ({}));

      if (json?.ok) {
        setMaps(json.maps || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMaps(false);
    }
  }

  useEffect(() => {
    loadMaps();
  }, []);

  async function save() {
    try {
      setSaving(true);
      setError("");

      if (!form.name) {
        throw new Error("Fyll i fordonsnamn.");
      }

      const res = await fetch("/api/admin/sundra/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          seats_count: Number(form.seats_count || 0),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || "Kunde inte skapa fordon."
        );
      }

      router.push("/admin/sundra/fordon");
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Lägg till fordon
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa nytt fordon och koppla platskarta.
              </p>
            </div>

            <button
              onClick={() =>
                router.push("/admin/sundra/fordon")
              }
              className="rounded-xl border bg-white px-4 py-2 text-sm"
            >
              Tillbaka
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="mb-5 text-lg font-semibold text-[#194C66]">
                Fordonsinformation
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Fordonsnamn">
                  <input
                    value={form.name}
                    onChange={(e) =>
                      update("name", e.target.value)
                    }
                    placeholder="Mercedes Tourismo 57"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Registreringsnummer">
                  <input
                    value={form.registration_number}
                    onChange={(e) =>
                      update(
                        "registration_number",
                        e.target.value
                      )
                    }
                    placeholder="ABC123"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Operatör">
                  <input
                    value={form.operator_name}
                    onChange={(e) =>
                      update(
                        "operator_name",
                        e.target.value
                      )
                    }
                    placeholder="Helsingbuss"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Busstyp">
                  <select
                    value={form.vehicle_type}
                    onChange={(e) =>
                      update(
                        "vehicle_type",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="coach">
                      Turistbuss
                    </option>

                    <option value="doubledeck">
                      Dubbeldäckare
                    </option>

                    <option value="sprinter">
                      Sprinter
                    </option>
                  </select>
                </Field>

                <Field label="Antal säten">
                  <input
                    type="number"
                    value={form.seats_count}
                    onChange={(e) =>
                      update(
                        "seats_count",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Platskarta">
                  <select
                    value={form.bus_map_id}
                    onChange={(e) =>
                      update(
                        "bus_map_id",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border px-3 py-2"
                    disabled={loadingMaps}
                  >
                    <option value="">
                      {loadingMaps
                        ? "Laddar..."
                        : "Välj platskarta"}
                    </option>

                    {maps.map((map) => (
                      <option
                        key={map.id}
                        value={map.id}
                      >
                        {map.name} ({map.seats_count || 0} säten)
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      update("status", e.target.value)
                    }
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="active">Aktiv</option>

                    <option value="maintenance">
                      Service
                    </option>

                    <option value="inactive">
                      Inaktiv
                    </option>
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Intern notering">
                  <textarea
                    rows={5}
                    value={form.notes}
                    onChange={(e) =>
                      update("notes", e.target.value)
                    }
                    placeholder="Info om fordonet..."
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
                  Fordonet kan sedan kopplas till avgångar
                  och används för platsval och säteskartor.
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="mt-6 w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white hover:bg-[#16384d] disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Skapa fordon"}
                </button>
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
      <div className="mb-1 text-sm font-medium text-[#194C66]">
        {label}
      </div>

      {children}
    </label>
  );
}
