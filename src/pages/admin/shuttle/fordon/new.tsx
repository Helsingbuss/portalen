import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function NewShuttleVehiclePage() {
  const router = useRouter();

  const [maps, setMaps] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    registration_number: "",
    operator_name: "",
    vehicle_model: "",
    bus_type: "",
    seats_count: "",
    shuttle_bus_map_id: "",

    wifi: false,
    usb_outlets: false,
    toilet: false,
    wheelchair_accessible: false,

    notes: "",
  });

  useEffect(() => {
    loadMaps();
  }, []);

  async function loadMaps() {
    const res = await fetch(
      "/api/admin/shuttle/bus-maps"
    );

    const json = await res.json();

    setMaps(json.bus_maps || []);
  }

  async function save() {
    await fetch("/api/admin/shuttle/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    router.push("/admin/shuttle/fordon");
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Lägg till fordon
            </h1>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                placeholder="Fordon"
                className="rounded-xl border px-4 py-3"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />

              <input
                placeholder="Regnummer"
                className="rounded-xl border px-4 py-3"
                value={form.registration_number}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    registration_number: e.target.value,
                  }))
                }
              />

              <input
                placeholder="Operatör"
                className="rounded-xl border px-4 py-3"
                value={form.operator_name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    operator_name: e.target.value,
                  }))
                }
              />

              <input
                placeholder="Modell"
                className="rounded-xl border px-4 py-3"
                value={form.vehicle_model}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicle_model: e.target.value,
                  }))
                }
              />

              <input
                placeholder="Busstyp"
                className="rounded-xl border px-4 py-3"
                value={form.bus_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    bus_type: e.target.value,
                  }))
                }
              />

              <input
                type="number"
                placeholder="Platser"
                className="rounded-xl border px-4 py-3"
                value={form.seats_count}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    seats_count: e.target.value,
                  }))
                }
              />

              <select
                value={form.shuttle_bus_map_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shuttle_bus_map_id:
                      e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              >
                <option value="">
                  Välj platskarta
                </option>

                {maps.map((map) => (
                  <option
                    key={map.id}
                    value={map.id}
                  >
                    {map.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.wifi}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      wifi: e.target.checked,
                    }))
                  }
                />
                Wifi
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.usb_outlets}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      usb_outlets:
                        e.target.checked,
                    }))
                  }
                />
                USB-uttag
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.toilet}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      toilet:
                        e.target.checked,
                    }))
                  }
                />
                Toalett
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    form.wheelchair_accessible
                  }
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      wheelchair_accessible:
                        e.target.checked,
                    }))
                  }
                />
                Rullstolsanpassad
              </label>
            </div>

            <textarea
              placeholder="Anteckningar"
              className="mt-6 min-h-[120px] w-full rounded-xl border px-4 py-3"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
            />

            <button
              onClick={save}
              className="mt-6 rounded-xl bg-[#194C66] px-5 py-3 text-white"
            >
              Spara fordon
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
