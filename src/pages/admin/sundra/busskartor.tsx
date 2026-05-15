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

  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState("0");
  const [bulkBlocked, setBulkBlocked] = useState(false);

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
      setSelectedSeatNumbers([]);

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
        setSelectedSeatNumbers([]);
      }
    } catch (e: any) {
      alert(e?.message || "Något gick fel vid borttagning.");
    }
  }

  async function saveSeats(updatedSeats: Seat[]) {
    if (!selectedMap) return;

    try {
      setSavingSeat(true);

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
        throw new Error(json?.error || "Kunde inte spara säten.");
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

  function toggleSeat(seat: SeatMapSeat) {
    setSelectedSeatNumbers((prev) => {
      const exists = prev.includes(seat.seat_number);

      if (exists) {
        return prev.filter((s) => s !== seat.seat_number);
      }

      return [...prev, seat.seat_number];
    });
  }

  function selectAllSeats() {
    const all =
      selectedMap?.sundra_bus_map_seats?.map((seat) => seat.seat_number) || [];

    setSelectedSeatNumbers(all);
  }

  function clearSelectedSeats() {
    setSelectedSeatNumbers([]);
  }

  async function applyBulkChanges() {
    if (!selectedMap) return;

    if (selectedSeatNumbers.length === 0) {
      alert("Markera minst ett säte först.");
      return;
    }

    const price = Number(bulkPrice || 0);

    const updatedSeats =
      selectedMap.sundra_bus_map_seats?.map((seat) => {
        if (!selectedSeatNumbers.includes(seat.seat_number)) return seat;

        return {
          ...seat,
          seat_price: price,
          is_blocked: bulkBlocked,
          is_active: true,
          is_selectable: !bulkBlocked,
        };
      }) || [];

    await saveSeats(updatedSeats);
  }

  async function quickSetPrice(price: number) {
    setBulkPrice(String(price));

    if (!selectedMap) return;

    if (selectedSeatNumbers.length === 0) {
      alert("Markera säten först.");
      return;
    }

    const updatedSeats =
      selectedMap.sundra_bus_map_seats?.map((seat) => {
        if (!selectedSeatNumbers.includes(seat.seat_number)) return seat;

        return {
          ...seat,
          seat_price: price,
          is_blocked: false,
          is_active: true,
          is_selectable: true,
        };
      }) || [];

    await saveSeats(updatedSeats);
  }

  const seatMapSeats: SeatMapSeat[] = useMemo(() => {
    return (selectedMap?.sundra_bus_map_seats || []).map((seat) => ({
      id: seat.id,
      seat_number: seat.seat_number,
      row_number: seat.row_number,
      seat_column: seat.seat_column,
      seat_price: seat.seat_price || 0,

      // Viktigt i admin: alla säten ska gå att klicka/markera även om de är blockerade.
      is_blocked: false,
      is_selectable: true,
      is_available: true,
      status: "available",
    }));
  }, [selectedMap]);

  const selectedSeatsInfo = useMemo(() => {
    const seats = selectedMap?.sundra_bus_map_seats || [];

    return seats.filter((seat) =>
      selectedSeatNumbers.includes(seat.seat_number)
    );
  }, [selectedMap, selectedSeatNumbers]);

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
                          onClick={() => {
                            setSelectedMap(map);
                            setSelectedSeatNumbers([]);
                          }}
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
                        Klicka på flera säten för att markera dem. Ändra sedan
                        pris/blockering på alla markerade samtidigt.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]">
                        {selectedMap.seats_count || 0} platser
                      </span>

                      <span className="rounded-full bg-[#eafaf7] px-3 py-1 text-xs font-semibold text-[#007764]">
                        {selectedSeatNumbers.length} markerade
                      </span>

                      {savingSeat && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Sparar...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-5 rounded-2xl border bg-[#f8fafc] p-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#194C66]">
                          Pris på markerade säten
                        </label>
                        <input
                          type="number"
                          value={bulkPrice}
                          onChange={(e) => setBulkPrice(e.target.value)}
                          className="w-36 rounded-xl border px-3 py-2 text-sm"
                        />
                      </div>

                      <label className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm text-[#194C66]">
                        <input
                          type="checkbox"
                          checked={bulkBlocked}
                          onChange={(e) => setBulkBlocked(e.target.checked)}
                        />
                        Blockera markerade
                      </label>

                      <button
                        onClick={applyBulkChanges}
                        disabled={savingSeat || selectedSeatNumbers.length === 0}
                        className="rounded-full bg-[#194C66] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Applicera på markerade
                      </button>

                      <button
                        onClick={selectAllSeats}
                        className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
                      >
                        Markera alla
                      </button>

                      <button
                        onClick={clearSelectedSeats}
                        className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
                      >
                        Rensa
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => quickSetPrice(0)}
                        className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#194C66] shadow-sm"
                      >
                        Sätt 0 kr
                      </button>

                      <button
                        onClick={() => quickSetPrice(49)}
                        className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#194C66] shadow-sm"
                      >
                        Sätt 49 kr
                      </button>

                      <button
                        onClick={() => quickSetPrice(79)}
                        className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#194C66] shadow-sm"
                      >
                        Sätt 79 kr
                      </button>

                      <button
                        onClick={() => quickSetPrice(99)}
                        className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#194C66] shadow-sm"
                      >
                        Sätt 99 kr
                      </button>

                      <button
                        onClick={() => quickSetPrice(149)}
                        className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#194C66] shadow-sm"
                      >
                        Sätt 149 kr
                      </button>
                    </div>

                    {selectedSeatNumbers.length > 0 && (
                      <div className="mt-4 rounded-xl bg-white p-3 text-xs text-gray-600">
                        <span className="font-semibold text-[#194C66]">
                          Markerade:
                        </span>{" "}
                        {selectedSeatNumbers.join(", ")}
                      </div>
                    )}

                    {selectedSeatsInfo.length > 0 && (
                      <div className="mt-3 text-xs text-gray-500">
                        Nuvarande extra pris på markerade säten visas i kartan.
                      </div>
                    )}
                  </div>

                  <SeatMap
                    seats={seatMapSeats}
                    selectedSeats={selectedSeatNumbers}
                    readonly={false}
                    showLegend
                    showSummary={false}
                    title="Platskarta"
                    subtitle="A1 börjar längst fram i bussen. Klicka på säten för att markera flera."
                    onSeatClick={toggleSeat}
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
