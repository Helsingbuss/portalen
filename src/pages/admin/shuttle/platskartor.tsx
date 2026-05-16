import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleBusMapsPage() {
  const [maps, setMaps] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    bus_type: "",
    seats_count: "",
    description: "",
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
    await fetch("/api/admin/shuttle/bus-maps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setForm({
      name: "",
      bus_type: "",
      seats_count: "",
      description: "",
    });

    loadMaps();
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Platskartor
            </h1>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                placeholder="Namn"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                placeholder="Busstyp"
                value={form.bus_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    bus_type: e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                type="number"
                placeholder="Antal platser"
                value={form.seats_count}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    seats_count: e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                placeholder="Beskrivning"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />
            </div>

            <button
              onClick={save}
              className="mt-5 rounded-xl bg-[#194C66] px-5 py-3 text-white"
            >
              Spara platskarta
            </button>
          </div>

          <div className="rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Alla platskartor
              </h2>
            </div>

            <div className="divide-y">
              {maps.map((map) => (
                <div
                  key={map.id}
                  className="flex items-center justify-between p-5"
                >
                  <div>
                    <div className="font-semibold">
                      {map.name}
                    </div>

                    <div className="text-sm text-gray-500">
                      {map.bus_type}
                    </div>
                  </div>

                  <div className="text-sm font-medium">
                    {map.seats_count} platser
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
