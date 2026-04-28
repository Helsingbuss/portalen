import { useState } from "react";

const ticketTypes = [
  { label: "Enkel - Vuxen", price: 199 },
  { label: "Enkel - Ungdom/Student", price: 149 },
  { label: "Enkel - Barn (0-12)", price: 99 },

  { label: "Tur & Retur - Vuxen", price: 349 },
  { label: "Tur & Retur - Ungdom/Student", price: 249 },

  { label: "10 resor (12 mån)", price: 1500 },
  { label: "20 resor (12 mån)", price: 2800 },
  { label: "40 resor (12 mån)", price: 5200 },

  { label: "7 dagar obegränsat", price: 699 },
  { label: "30 dagar obegränsat", price: 1999 },
  { label: "90 dagar obegränsat", price: 4999 },
];

const stops = ["Helsingborg C", "Ängelholm", "Landskrona", "Malmö C"];

export default function FlygbussModal({ open, onClose, onAdd }: any) {
  const [date, setDate] = useState("");
  const [qty, setQty] = useState(1);
  const [stop, setStop] = useState(stops[0]);
  const [ticket, setTicket] = useState(ticketTypes[0]);

  if (!open) return null;

  const total = ticket.price * qty;

  function handleAdd() {
    if (!date) return alert("Välj datum");

    onAdd({
      name: "Flygbuss Helsingborg → Kastrup",
      price: ticket.price,
      ticketType: ticket.label,
      date,
      qty,
      stop,
      type: "flygbuss",
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-5">

        <h2 className="text-lg font-semibold text-[#194C66]">
          Flygbuss Helsingborg → Kastrup
        </h2>

        {/* Biljettyp */}
        <div>
          <label className="text-sm font-medium">Biljettyp</label>
          <select
            value={ticket.label}
            onChange={(e) =>
              setTicket(
                ticketTypes.find(t => t.label === e.target.value)!
              )
            }
            className="w-full border rounded px-3 py-2 mt-1"
          >
            {ticketTypes.map((t) => (
              <option key={t.label} value={t.label}>
                {t.label} – {t.price} kr
              </option>
            ))}
          </select>
        </div>

        {/* Datum */}
        <div>
          <label className="text-sm font-medium">Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2 mt-1"
          />
        </div>

        {/* Hållplats */}
        <div>
          <label className="text-sm font-medium">Påstigning</label>
          <select
            value={stop}
            onChange={(e) => setStop(e.target.value)}
            className="w-full border rounded px-3 py-2 mt-1"
          >
            {stops.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Antal */}
        <div>
          <label className="text-sm font-medium">Antal</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-full border rounded px-3 py-2 mt-1"
          />
        </div>

        {/* Total */}
        <div className="flex justify-between font-semibold border-t pt-3">
          <span>Totalt</span>
          <span>{total} kr</span>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose}>Avbryt</button>

          <button
            onClick={handleAdd}
            className="bg-[#194C66] text-white px-5 py-2 rounded"
          >
            Lägg till
          </button>
        </div>

      </div>
    </div>
  );
}
