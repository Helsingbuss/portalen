// src/components/orders/BookingChooser.tsx
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
  placeholder = "Sök bokning…",
}: {
  onPick: (b: PickedBooking) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<Opt[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stäng dropdown om man klickar utanför
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as any)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounce-sökning med abort
  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim();
      if (abortRef.current) abortRef.current.abort();
      if (term.length < 2) {
        setOpts([]);
        setOpen(false);
        setBusy(false);
        setError(null);
        setActiveIndex(-1);
        return;
      }
      try {
        setBusy(true);
        setError(null);
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const u = new URL("/api/bookings/options", window.location.origin);
        u.searchParams.set("search", term);
        const res = await fetch(u.toString(), { signal: ctrl.signal });
        const j = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);

        const nextOpts: Opt[] = j?.options ?? [];
        setOpts(nextOpts);
        setOpen(true);
        setActiveIndex(nextOpts.length ? 0 : -1);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Kunde inte söka bokningar.");
        setOpts([]);
        setOpen(true); // visa fel/”inga träffar”-yta
        setActiveIndex(-1);
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
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      if (j?.booking) {
        onPick(j.booking as PickedBooking);
        setQ(o.label);
        setOpen(false);
        setActiveIndex(-1);
      }
    } catch {
      // Tyst – låt användaren försöka igen
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min((opts.length || 1) - 1, i + 1);
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max(0, (i === -1 ? 0 : i - 1));
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && opts[activeIndex]) pick(opts[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function scrollIntoView(index: number) {
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (item) {
      const parentRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      if (itemRect.top < parentRect.top) {
        list.scrollTop -= (parentRect.top - itemRect.top);
      } else if (itemRect.bottom > parentRect.bottom) {
        list.scrollTop += (itemRect.bottom - parentRect.bottom);
      }
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
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="booking-chooser-listbox"
        aria-autocomplete="list"
      />
      {busy && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#194C66]/60 text-xs">
          Söker…
        </div>
      )}
      {open && (
        <div
          id="booking-chooser-listbox"
          ref={listRef}
          className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-lg border bg-white shadow"
          role="listbox"
        >
          {error && (
            <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}

          {!error && opts.length === 0 && !busy && (
            <div className="px-3 py-2 text-sm text-[#0f172a]/70">
              Inga träffar.
            </div>
          )}

          {opts.map((o, i) => {
            const active = i === activeIndex;
            return (
              <button
                key={o.id}
                type="button"
                data-index={i}
                role="option"
                aria-selected={active}
                className={`block w-full text-left px-3 py-2 hover:bg-[#f5f4f0] ${
                  active ? "bg-[#f5f4f0]" : ""
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => pick(o)}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
