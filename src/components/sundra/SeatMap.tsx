import { useMemo } from "react";

export type SeatStatus = "available" | "selected" | "occupied" | "blocked";

export type SeatMapSeat = {
  id?: string;
  seat_number: string;

  row_number?: number | null;
  seat_column?: string | null;

  seat_price?: number | null;

  is_available?: boolean;
  is_occupied?: boolean;
  is_blocked?: boolean;
  is_selectable?: boolean;

  status?: SeatStatus;
};

type SeatMapProps = {
  seats: SeatMapSeat[];

  selectedSeats?: string[];
  maxSelectable?: number;

  readonly?: boolean;
  showLegend?: boolean;
  showSummary?: boolean;
  title?: string;
  subtitle?: string;

  onSeatClick?: (seat: SeatMapSeat) => void;
};

type SeatPosition = {
  seatNumber: string;
  x: number;
  y: number;
};

const SEAT_POSITIONS: SeatPosition[] = [
  { seatNumber: "D15", x: 34, y: 48 },
  { seatNumber: "D16", x: 34, y: 104 },

  { seatNumber: "D14", x: 128, y: 48 },
  { seatNumber: "D13", x: 188, y: 48 },
  { seatNumber: "D12", x: 248, y: 48 },
  { seatNumber: "D11", x: 308, y: 48 },
  { seatNumber: "D10", x: 368, y: 48 },
  { seatNumber: "D9", x: 428, y: 48 },
  { seatNumber: "D8", x: 488, y: 48 },
  { seatNumber: "D7", x: 548, y: 48 },
  { seatNumber: "D6", x: 608, y: 48 },
  { seatNumber: "D5", x: 668, y: 48 },
  { seatNumber: "D4", x: 728, y: 48 },
  { seatNumber: "D3", x: 788, y: 48 },
  { seatNumber: "D2", x: 848, y: 48 },
  { seatNumber: "D1", x: 908, y: 48 },

  { seatNumber: "C14", x: 128, y: 104 },
  { seatNumber: "C13", x: 188, y: 104 },
  { seatNumber: "C12", x: 248, y: 104 },
  { seatNumber: "C11", x: 308, y: 104 },
  { seatNumber: "C10", x: 368, y: 104 },
  { seatNumber: "C9", x: 428, y: 104 },
  { seatNumber: "C8", x: 488, y: 104 },
  { seatNumber: "C7", x: 548, y: 104 },
  { seatNumber: "C6", x: 608, y: 104 },
  { seatNumber: "C5", x: 668, y: 104 },
  { seatNumber: "C4", x: 728, y: 104 },
  { seatNumber: "C3", x: 788, y: 104 },
  { seatNumber: "C2", x: 848, y: 104 },
  { seatNumber: "C1", x: 908, y: 104 },

  { seatNumber: "D17", x: 34, y: 252 },
  { seatNumber: "D18", x: 34, y: 308 },

  { seatNumber: "B12", x: 128, y: 252 },
  { seatNumber: "B11", x: 188, y: 252 },
  { seatNumber: "B10", x: 248, y: 252 },
  { seatNumber: "B9", x: 308, y: 252 },
  { seatNumber: "B8", x: 368, y: 252 },
  { seatNumber: "B7", x: 428, y: 252 },

  { seatNumber: "A12", x: 128, y: 308 },
  { seatNumber: "A11", x: 188, y: 308 },
  { seatNumber: "A10", x: 248, y: 308 },
  { seatNumber: "A9", x: 308, y: 308 },
  { seatNumber: "A8", x: 368, y: 308 },
  { seatNumber: "A7", x: 428, y: 308 },

  { seatNumber: "B6", x: 638, y: 252 },
  { seatNumber: "B5", x: 698, y: 252 },
  { seatNumber: "B4", x: 758, y: 252 },
  { seatNumber: "B3", x: 818, y: 252 },
  { seatNumber: "B2", x: 878, y: 252 },
  { seatNumber: "B1", x: 938, y: 252 },

  { seatNumber: "A6", x: 638, y: 308 },
  { seatNumber: "A5", x: 698, y: 308 },
  { seatNumber: "A4", x: 758, y: 308 },
  { seatNumber: "A3", x: 818, y: 308 },
  { seatNumber: "A2", x: 878, y: 308 },
  { seatNumber: "A1", x: 938, y: 308 },
];

function money(value?: number | null) {
  const n = Number(value || 0);

  if (!n) return "";

  return n.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function hasExtraPrice(seat: SeatMapSeat) {
  return Number(seat.seat_price || 0) > 0;
}

function getStatus(seat: SeatMapSeat, selectedSeats: string[]): SeatStatus {
  if (selectedSeats.includes(seat.seat_number)) return "selected";

  if (seat.status === "occupied") return "occupied";
  if (seat.status === "blocked") return "blocked";

  if (seat.is_blocked === true) return "blocked";
  if (seat.is_occupied === true) return "occupied";

  if (seat.is_available === false && !hasExtraPrice(seat)) return "occupied";

  return "available";
}

function seatMapByNumber(seats: SeatMapSeat[]) {
  const map = new Map<string, SeatMapSeat>();

  seats.forEach((seat) => {
    map.set(String(seat.seat_number).toUpperCase(), seat);
  });

  return map;
}

export default function SeatMap({
  seats,
  selectedSeats = [],
  maxSelectable,
  readonly = false,
  showLegend = true,
  showSummary = true,
  title = "Välj dina platser",
  subtitle = "Klicka på de säten du vill boka.",
  onSeatClick,
}: SeatMapProps) {
  const seatLookup = useMemo(() => seatMapByNumber(seats || []), [seats]);

  const selectedObjects = useMemo(() => {
    return seats.filter((seat) => selectedSeats.includes(seat.seat_number));
  }, [seats, selectedSeats]);

  const selectedTotal = selectedObjects.reduce(
    (sum, seat) => sum + Number(seat.seat_price || 0),
    0
  );

  function clickSeat(seat: SeatMapSeat) {
    if (readonly) return;

    const status = getStatus(seat, selectedSeats);

    if (status === "occupied" || status === "blocked") return;
    if (seat.is_selectable === false) return;

    if (
      maxSelectable &&
      selectedSeats.length >= maxSelectable &&
      !selectedSeats.includes(seat.seat_number)
    ) {
      return;
    }

    onSeatClick?.(seat);
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0f172a]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>

        {showLegend && <Legend />}
      </div>

      <div className="relative overflow-x-auto pb-3">
        <div className="relative h-[430px] min-w-[1160px] rounded-[34px] border-2 border-[#2f3437]/70 bg-white shadow-sm">
          <Door x={260} y={24} width={70} />
          <Door x={430} y={24} width={70} />
          <Door x={610} y={24} width={70} />
          <Door x={820} y={24} width={70} />

          <Door x={260} y={388} width={70} />
          <Door x={430} y={388} width={70} />
          <Door x={610} y={388} width={70} />
          <Door x={820} y={388} width={70} />

          <Driver />

          <Stairs x={526} y={248} />
          <Stairs x={1010} y={248} />

          {SEAT_POSITIONS.map((pos) => {
            const seat = seatLookup.get(pos.seatNumber);

            if (!seat) {
              return (
                <div
                  key={pos.seatNumber}
                  className="absolute flex h-[50px] w-[38px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-[10px] text-gray-300"
                  style={{
                    left: pos.x,
                    top: pos.y,
                  }}
                >
                  {pos.seatNumber}
                </div>
              );
            }

            return (
              <SeatButton
                key={seat.id || seat.seat_number}
                seat={seat}
                selectedSeats={selectedSeats}
                onClick={() => clickSeat(seat)}
                x={pos.x}
                y={pos.y}
              />
            );
          })}
        </div>
      </div>

      {showSummary && (
        <div className="mt-5 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-[#0f172a]">Valda säten</div>
              <div className="mt-1 text-sm text-gray-500">
                {selectedSeats.length === 0
                  ? "Inga säten valda"
                  : selectedSeats.join(", ")}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold text-[#0f172a]">
                Tillval säten
              </div>
              <div className="mt-1 text-xl font-bold text-[#0f172a]">
                {selectedTotal > 0 ? money(selectedTotal) : "0 kr"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-[#b7e7df] bg-[#eafaf7] p-4 text-sm text-[#006b5b]">
        <strong>Information</strong>
        <p className="mt-1">
          Välj de säten du vill boka genom att klicka på dem i kartan ovan.
          Säten med extra pris visas med gul markering.
        </p>
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  selectedSeats,
  onClick,
  x,
  y,
}: {
  seat: SeatMapSeat;
  selectedSeats: string[];
  onClick: () => void;
  x: number;
  y: number;
}) {
  const status = getStatus(seat, selectedSeats);
  const extraPrice = Number(seat.seat_price || 0);

  const isDisabled =
    status === "occupied" ||
    status === "blocked" ||
    seat.is_selectable === false;

  const classes =
    status === "selected"
      ? "border-[#007764] bg-[#007764] text-white shadow-md"
      : status === "occupied" || status === "blocked"
      ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
      : extraPrice > 0
      ? "border-[#d79b00] bg-[#fff3c4] text-[#4a3510] hover:bg-[#ffe89b]"
      : "border-[#47b5a9] bg-[#dff7f3] text-[#0f172a] hover:bg-[#c9f0eb]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`absolute flex h-[50px] w-[38px] items-center justify-center rounded-lg border text-[11px] font-semibold transition ${classes}`}
      style={{
        left: x,
        top: y,
      }}
      title={`${seat.seat_number}${
        seat.seat_price ? ` · ${money(seat.seat_price)}` : ""
      }`}
    >
      <span className="absolute -top-[6px] left-1/2 h-[7px] w-[24px] -translate-x-1/2 rounded-md border border-inherit bg-inherit" />
      <span className="absolute -bottom-[6px] left-1/2 h-[7px] w-[24px] -translate-x-1/2 rounded-md border border-inherit bg-inherit" />
      <span className="absolute left-[-6px] top-1/2 h-[25px] w-[7px] -translate-y-1/2 rounded-md border border-inherit bg-inherit" />
      <span className="absolute right-[-6px] top-1/2 h-[25px] w-[7px] -translate-y-1/2 rounded-md border border-inherit bg-inherit" />

      <span>{seat.seat_number}</span>

      {extraPrice > 0 && (
        <span className="absolute -right-2 -top-2 rounded-full bg-[#d83b4a] px-1.5 py-0.5 text-[8px] font-black text-white">
          +{extraPrice}
        </span>
      )}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-[#0f172a]">
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-full bg-[#007764]" />
        Valt säte
      </div>

      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-full border border-[#47b5a9] bg-[#dff7f3]" />
        Ledigt
      </div>

      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-full border border-[#d79b00] bg-[#fff3c4]" />
        Extra pris
      </div>

      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-full border border-gray-300 bg-gray-100" />
        Upptaget/blockerat
      </div>
    </div>
  );
}

function Door({
  x,
  y,
  width,
}: {
  x: number;
  y: number;
  width: number;
}) {
  return (
    <div
      className="absolute h-2 rounded-full bg-gray-500/70"
      style={{
        left: x,
        top: y,
        width,
      }}
    />
  );
}

function Driver() {
  return (
    <div className="absolute right-[34px] top-[64px] flex items-center gap-4">
      <div className="h-[48px] w-[38px] rounded-xl border border-gray-300 bg-[#f3f4f6]" />

      <div className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full border-[4px] border-[#6b7280] text-[#6b7280]">
        <div className="h-[22px] w-[22px] rounded-full border-[4px] border-[#6b7280]" />
        <div className="absolute h-[4px] w-[44px] bg-[#6b7280]" />
        <div className="absolute h-[44px] w-[4px] bg-[#6b7280]" />
      </div>
    </div>
  );
}

function Stairs({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="absolute flex h-[86px] w-[62px] items-end justify-center rounded bg-[#dddddd]"
      style={{
        left: x,
        top: y,
      }}
    >
      <div className="mb-2 h-[54px] w-[42px] border-b-[4px] border-l-[4px] border-black">
        <div className="mt-[7px] h-[5px] w-[34px] border-t-2 border-gray-400" />
        <div className="mt-[7px] h-[5px] w-[34px] border-t-2 border-gray-400" />
        <div className="mt-[7px] h-[5px] w-[34px] border-t-2 border-gray-400" />
      </div>
    </div>
  );
}
