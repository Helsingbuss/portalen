import { useEffect, useMemo, useRef, useState } from "react";

export type PickedBooking = {
  id: string;
  booking_number?: string | null;

  contact_person?: string | null;
  customer_phone?: string | null;
  passengers?: number | null;
  notes?: string | null;

  departure_place?: string | null;
  destination?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;

  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;
};

type Opt = { id: string; label: string; booking_number?: string | null };

export default function BookingChooser({
  onPick,
  placeholder = "SÃ¶k bokningâ€¦",
}: {
  onPick: (b: PickedBooking) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<Opt[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // stÃ¤ng dropdown om man klickar utanfÃ¶r
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // debounce-sÃ¶kning
  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim();
      if (term.length < 2) {
        setOpts([]);
        return;
      }
      try {
        setBusy(true);
        const u = new URL("/api/bookings/options", window.location.origin);
        u.searchParams.set("search", term);
        const res = await fetch(u.toString());
        const j = await res.json();
        setOpts(j?.options ?? []);
        setOpen(true);
      } catch {
        setOpts([]);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function pick(o: Opt) {
    try {
      const u = new URL("/api/bookings/one", window.location.origin);
      u.searchParams.set("id", o.id);
      const res = await fetch(u.toString());
      const j = await res.json();
      if (res.ok && j?.booking) {
        onPick(j.booking as PickedBooking);
        setQ(o.label);
        setOpen(false);
      }
    } catch {
      // tyst â€“ lÃ¥t anvÃ¤ndaren fÃ¶rsÃ¶ka igen
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className="border rounded px-3 py-2 w-full"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => opts.length && setOpen(true)}
      />
      {busy && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#194C66]/60 text-xs">
          SÃ¶kerâ€¦
        </div>
      )}
      {open && opts.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-lg border bg-white shadow">
          {opts.map((o) => (
            <button
              key={o.id}
              type="button"
              className="block w-full text-left px-3 py-2 hover:bg-[#f5f4f0]"
              onClick={() => pick(o)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

