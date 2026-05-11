import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import SeatMap, { SeatMapSeat } from "@/components/sundra/SeatMap";

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
  const [savingSeat, setSavingSeat] = useState(false);

  const [selectedMap, setSelectedMap] = useState<BusMap | null>(null);

  const [newName, setNewName] = useState("");
  const [rows, setRows] = useState(13);
  const [template, setTemplate] = useState("standard_52");

  async function loadMaps() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/sundra/bus-maps");
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta platskartor.");
      }

      const loadedMaps = json.bus_maps || [];

      setMaps(loadedMaps);

      if (!selectedMap && loadedMaps.length) {
        setSelectedMap(loadedMaps[0]);
      }

      if (selectedMap) {
        const updatedSelected = loadedMaps.find(
          (map: BusMap) => map.id === selectedMap.id
        );

        if (updatedSelected) {
          setSelectedMap(updatedSelected);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTemplateChange(value: string) {
    setTemplate(value);

    if (value === "standard_52") setRows(13);
    if (value === "tourismo_57") setRows(14);
    if (value === "sprinter_19") setRows(5);
    if (value === "doubledeck_81") setRows(20);
  }

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
          bus_type: template,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa platskarta.");
      }

      setNewName("");

      await loadMaps();

      setSelectedMap(json.bus_map);
    } catch (e: any) {
      alert(e?.message || "Något gick fel");
    }
  }

  async function deleteMap(mapId: string) {
    const confirmed = confirm(
      "Är du säker på att du vill ta bort denna platskarta?\n\nAlla säten kopplade till kartan tas också bort."
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/sundra/bus-maps/${mapId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte ta bort platskartan.");
      }

      const updatedMaps = maps.filter((m) => m.id !== mapId);

      setMaps(updatedMaps);

      if (selectedMap?.id === mapId) {
        setSelectedMap(updatedMaps[0] || null);
      }
    } catch (e: any) {
      alert(e?.message || "Något gick fel vid borttagning.");
    }
  }

  async function saveSeat(seat: Seat) {
    if (!selectedMap) return;

    try {
      setSavingSeat(true);

      const updatedSeats =
        selectedMap.sundra_bus_map_seats?.map((s) =>
          s.id === seat.id ? seat : s
        ) || [];

      const res = await fetch(`/api/admin/sundra/bus-maps/${selectedMap.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...selectedMap,
          seats: updatedSeats,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte spara stol.");
      }

      setSelectedMap(json.bus_map);

      setMaps((prev) =>
        prev.map((m) => (m.id === json.bus_map.id ? json.bus_map : m))
      );
    } catch (e: any) {
      alert(e?.message || "Något gick fel vid sparning.");
    } finally {
      setSavingSeat(false);
    }
  }

  async function editSeat(seat: SeatMapSeat) {
    if (!selectedMap) return;

    const original = selectedMap.sundra_bus_map_seats?.find(
      (s) => s.id === seat.id || s.seat_number === seat.seat_number
    );

    if (!original) return;

    const price = prompt(
      `Extra pris för ${original.seat_number} kr\n\nSkriv 0 om platsen ska vara utan extra kostnad.`,
      String(original.seat_price || 0)
    );

    if (price === null) return;

    const blocked = confirm(
      `Vill du blockera ${original.seat_number}?\n\nOK = blockera platsen\nAvbryt = platsen är bokningsbar`
    );

    await saveSeat({
      ...original,
      seat_price: Number(price || 0),
      is_blocked: blocked,
      is_active: true,
      is_selectable: !blocked,
    });
  }

  const seatMapSeats: SeatMapSeat[] = useMemo(() => {
    return (selectedMap?.sundra_bus_map_seats || []).map((seat) => ({
      id: seat.id,
      seat_number: seat.seat_number,
      row_number: seat.row_number,
      seat_column: seat.seat_column,
      seat_price: seat.seat_price || 0,
      is_blocked: seat.is_blocked,
      is_selectable: seat.is_selectable,
      is_available: !seat.is_blocked && seat.is_active !== false,
      status: seat.is_blocked ? "occupied" : "available",
    }));
  }, [selectedMap]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Platskartor
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/60">
                Skapa platskartor, välj bussmall och sätt extra pris per stol.
              </p>
            </div>

            <button
              onClick={loadMaps}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[340px_1fr]">
            <aside className="space-y-5">
              <section className="rounded-2xl bg-white p-5 shadow">
                <h2 className="font-semibold text-[#194C66]">
                  Skapa platskarta
                </h2>

                <div className="mt-4 space-y-3">
                  <input
                    placeholder="Ex. Tourismo 57 platser"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />

                  <select
                    value={template}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="standard_52">Standard 52 säten</option>
                    <option value="tourismo_57">Turistbuss 57 säten</option>
                    <option value="doubledeck_81">Dubbeldäckare</option>
                    <option value="sprinter_19">Sprinter / minibuss</option>
                    <option value="custom">Egen layout</option>
                  </select>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#194C66]">
                      Antal rader
                    </label>

                    <input
                      type="number"
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                      className="w-full rounded-xl border px-3 py-2"
                    />

                    <p className="mt-1 text-xs text-gray-500">
                      2+2 layout ger 4 säten per rad. För Tourismo 57 används
                      speciallayout med A1–A12, B1–B12, C1–C14 och D1–D18.
                    </p>
                  </div>

                  <button
                    onClick={createMap}
                    className="w-full rounded-full bg-[#194C66] py-3 font-medium text-white"
                  >
                    Skapa platskarta
                  </button>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow">
                <h2 className="font-semibold text-[#194C66]">
                  Alla platskartor
                </h2>

                <div className="mt-4 space-y-2">
                  {loading ? (
                    <div className="text-sm text-gray-500">Laddar...</div>
                  ) : maps.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Inga platskartor skapade.
                    </div>
                  ) : (
                    maps.map((map) => (
                      <div
                        key={map.id}
                        className={`overflow-hidden rounded-xl border ${
                          selectedMap?.id === map.id
                            ? "border-[#194C66] bg-[#eef5f9]"
                            : "bg-white"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedMap(map)}
                          className="w-full p-3 text-left"
                        >
                          <div className="font-semibold text-[#194C66]">
                            {map.name}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            {map.seats_count || 0} platser
                          </div>
                        </button>

                        <div className="flex items-center justify-between border-t bg-white/70 px-3 py-2">
                          <span className="text-[11px] text-gray-400">
                            {map.bus_type || "standard"}
                          </span>

                          <button
                            onClick={() => deleteMap(map.id)}
                            className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Ta bort
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </aside>

            <section className="rounded-2xl bg-white p-5 shadow">
              {!selectedMap ? (
                <div className="text-sm text-gray-500">Välj platskarta</div>
              ) : (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[#194C66]">
                        {selectedMap.name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Klicka på en stol för att ändra extra pris eller
                        blockera platsen.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]">
                        {selectedMap.seats_count || 0} platser
                      </span>

                      {savingSeat && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Sparar...
                        </span>
                      )}
                    </div>
                  </div>

                  <SeatMap
                    seats={seatMapSeats}
                    readonly={false}
                    showLegend
                    showSummary={false}
                    title="Platskarta"
                    subtitle="A1 börjar längst fram i bussen."
                    onSeatClick={editSeat}
                  />
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
