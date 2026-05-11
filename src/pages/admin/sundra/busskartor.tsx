import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Seat = {
  id: string;
  seat_number: string;
  row_number: number | null;
  seat_column: string | null;

  seat_type?: string | null;
  seat_label?: string | null;

  seat_price?: number | null;

  is_active?: boolean;
  is_selectable?: boolean;
  is_blocked?: boolean;
};

type BusMap = {
  id: string;
  name: string;
  bus_type?: string | null;

  seats_count?: number | null;

  description?: string | null;
  status?: string | null;

  sundra_bus_map_seats?: Seat[];
};

export default function BusskartorPage() {
  const [maps, setMaps] = useState<BusMap[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMap, setSelectedMap] = useState<BusMap | null>(null);

  const [newName, setNewName] = useState("");
  const [rows, setRows] = useState(14);

  async function loadMaps() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/sundra/bus-maps");
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta busskartor.");
      }

      setMaps(json.bus_maps || []);

      if (!selectedMap && json.bus_maps?.length) {
        setSelectedMap(json.bus_maps[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaps();
  }, []);

  async function createMap() {
    try {
      if (!newName.trim()) {
        alert("Ange namn");
        return;
      }

      const res = await fetch("/api/admin/sundra/bus-maps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName,
          rows,
          columns: ["A", "B", "C", "D"],
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa busskarta.");
      }

      setNewName("");

      await loadMaps();

      setSelectedMap(json.bus_map);
    } catch (e: any) {
      alert(e?.message || "Något gick fel");
    }
  }

  async function saveSeat(seat: Seat) {
    if (!selectedMap) return;

    const updatedSeats =
      selectedMap.sundra_bus_map_seats?.map((s) =>
        s.id === seat.id ? seat : s
      ) || [];

    const res = await fetch(
      `/api/admin/sundra/bus-maps/${selectedMap.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...selectedMap,
          seats: updatedSeats,
        }),
      }
    );

    const json = await res.json();

    if (json?.ok) {
      setSelectedMap(json.bus_map);

      setMaps((prev) =>
        prev.map((m) => (m.id === json.bus_map.id ? json.bus_map : m))
      );
    }
  }

  const groupedSeats = useMemo(() => {
    if (!selectedMap?.sundra_bus_map_seats) return {};

    return selectedMap.sundra_bus_map_seats.reduce(
      (acc: any, seat: Seat) => {
        const row = seat.row_number || 0;

        if (!acc[row]) acc[row] = [];

        acc[row].push(seat);

        return acc;
      },
      {}
    );
  }, [selectedMap]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Busskartor
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/60">
                Skapa säteskartor för bussar och sätt priser per stol.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[320px,1fr]">
            <aside className="rounded-2xl bg-white p-5 shadow">
              <h2 className="font-semibold text-[#194C66]">
                Skapa busskarta
              </h2>

              <div className="mt-4 space-y-3">
                <input
                  placeholder="Ex. Tourismo 57 platser"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                />

                <input
                  type="number"
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                  className="w-full rounded-xl border px-3 py-2"
                />

                <button
                  onClick={createMap}
                  className="w-full rounded-full bg-[#194C66] py-3 font-medium text-white"
                >
                  Skapa busskarta
                </button>
              </div>

              <div className="mt-6 space-y-2">
                {maps.map((map) => (
                  <button
                    key={map.id}
                    onClick={() => setSelectedMap(map)}
                    className={`w-full rounded-xl border p-3 text-left ${
                      selectedMap?.id === map.id
                        ? "border-[#194C66] bg-[#eef5f9]"
                        : "bg-white"
                    }`}
                  >
                    <div className="font-semibold text-[#194C66]">
                      {map.name}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      {map.seats_count || 0} platser
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-2xl bg-white p-5 shadow">
              {!selectedMap ? (
                <div className="text-sm text-gray-500">
                  Välj busskarta
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-[#194C66]">
                        {selectedMap.name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Klicka på stol för att ändra pris och inställningar.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {Object.keys(groupedSeats).map((row) => (
                      <div
                        key={row}
                        className="flex items-center gap-3"
                      >
                        <div className="w-10 text-sm font-semibold text-gray-500">
                          {row}
                        </div>

                        <div className="flex gap-2">
                          {groupedSeats[row].map((seat: Seat) => (
                            <button
                              key={seat.id}
                              onClick={() => {
                                const price = prompt(
                                  `Pris för ${seat.seat_number}`,
                                  String(seat.seat_price || 0)
                                );

                                if (price === null) return;

                                saveSeat({
                                  ...seat,
                                  seat_price: Number(price || 0),
                                });
                              }}
                              className={`flex h-14 w-14 flex-col items-center justify-center rounded-xl border text-xs ${
                                seat.is_blocked
                                  ? "bg-red-100 border-red-300"
                                  : Number(seat.seat_price || 0) > 0
                                  ? "bg-amber-100 border-amber-300"
                                  : "bg-[#eef5f9] border-[#d7e6ee]"
                              }`}
                            >
                              <span className="font-semibold">
                                {seat.seat_number}
                              </span>

                              <span className="text-[10px]">
                                {seat.seat_price || 0} kr
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
