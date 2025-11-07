// src/components/trips/DeparturesEditor.tsx
import React from "react";

export type DepartureRow = {
  dep_date: string;        // YYYY-MM-DD
  dep_time: string;        // HH:mm
  line_name?: string;      // t.ex. "Linje 101"
  stops?: string[];        // ["Helsingborg C", "Ã„ngelholm", ...]
};

export default function DeparturesEditor({
  value,
  onChange,
}: {
  value: DepartureRow[];
  onChange: (rows: DepartureRow[]) => void;
}) {
  const add = () =>
    onChange([...(value || []), { dep_date: "", dep_time: "", line_name: "", stops: [] }]);

  const upd = (i: number, patch: Partial<DepartureRow>) => {
    const rows = [...value];
    rows[i] = { ...rows[i], ...patch };
    onChange(rows);
  };

  const del = (i: number) => {
    const rows = [...value];
    rows.splice(i, 1);
    onChange(rows);
  };

  const setStops = (i: number, csv: string) => {
    const stops = csv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    upd(i, { stops });
  };

  return (
    <div className="space-y-3">
      {(value || []).map((row, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
          <div>
            <div className="text-xs text-[#194C66]/70 mb-1">Datum</div>
            <input
              type="date"
              className="border rounded px-3 py-2 w-full"
              value={row.dep_date || ""}
              onChange={(e) => upd(i, { dep_date: e.target.value })}
            />
          </div>
          <div>
            <div className="text-xs text-[#194C66]/70 mb-1">Tid</div>
            <input
              type="time"
              className="border rounded px-3 py-2 w-full"
              value={row.dep_time || ""}
              onChange={(e) => upd(i, { dep_time: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-[#194C66]/70 mb-1">Linje</div>
            <input
              placeholder="t.ex. Linje 101"
              className="border rounded px-3 py-2 w-full"
              value={row.line_name || ""}
              onChange={(e) => upd(i, { line_name: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-[#194C66]/70 mb-1">HÃ¥llplatser (kommaseparerade)</div>
            <input
              placeholder="Helsingborg C, Ã„ngelholm, Halmstad ..."
              className="border rounded px-3 py-2 w-full"
              value={(row.stops || []).join(", ")}
              onChange={(e) => setStops(i, e.target.value)}
            />
          </div>
          <div className="md:col-span-6">
            <button
              type="button"
              onClick={() => del(i)}
              className="text-sm underline text-[#8a1f1f]"
            >
              Ta bort avgÃ¥ng
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={add} className="px-4 py-2 rounded border text-sm">
        + LÃ¤gg till avgÃ¥ng
      </button>
    </div>
  );
}

