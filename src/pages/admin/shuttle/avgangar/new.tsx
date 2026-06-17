import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Route = {
  id: string;
  name?: string | null;
  route_code?: string | null;
  from_city?: string | null;
  to_city?: string | null;
  to_airport?: string | null;
};

type Stop = {
  id: string;
  name: string;
  city?: string | null;
};

type LineStop = {
  id: string;
  line_id: string;
  stop_id: string;
  stop_order?: number | null;
  departure_time?: string | null;
  arrival_time?: string | null;
  price?: number | null;
  is_active?: boolean | null;
  shuttle_stops?: Stop | null;
};

type Line = {
  id: string;
  route_id?: string | null;
  name: string;
  code?: string | null;
  start_city?: string | null;
  end_city?: string | null;
  shuttle_routes?: Route | null;
  shuttle_line_stops?: LineStop[];
};

type DepartureStopForm = {
  line_stop_id: string;
  stop_id: string;
  stop_name: string;
  city: string;
  stop_order: number;
  scheduled_time: string;
  price: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function tidyTime(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = String(time || "00:00").split(":").map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;

  const total = h * 60 + m + minutes;
  const next = ((total % 1440) + 1440) % 1440;

  const hh = String(Math.floor(next / 60)).padStart(2, "0");
  const mm = String(next % 60).padStart(2, "0");

  return `${hh}:${mm}`;
}

function lineLabel(line: Line) {
  const code = line.code ? `${line.code} – ` : "";
  const from = line.start_city || line.shuttle_routes?.from_city || "Från";
  const to =
    line.end_city ||
    line.shuttle_routes?.to_city ||
    line.shuttle_routes?.to_airport ||
    "Till";

  return `${code}${line.name} (${from} → ${to})`;
}

function getLineRouteId(line: Line | null) {
  return line?.route_id || line?.shuttle_routes?.id || "";
}

function getSortedLineStops(line: Line | null) {
  return [...(line?.shuttle_line_stops || [])]
    .filter((stop) => stop.is_active !== false)
    .sort((a, b) => Number(a.stop_order || 0) - Number(b.stop_order || 0));
}

function buildStopsFromLine(
  line: Line | null,
  baseTime: string,
  defaultPrice: string,
  reverse = false
): DepartureStopForm[] {
  const sorted = getSortedLineStops(line);
  const source = reverse ? [...sorted].reverse() : sorted;

  return source.map((lineStop, index) => {
    const stop = lineStop.shuttle_stops;

    return {
      line_stop_id: lineStop.id,
      stop_id: lineStop.stop_id,
      stop_name: stop?.name || "Hållplats",
      city: stop?.city || "",
      stop_order: index + 1,
      scheduled_time:
        tidyTime(lineStop.departure_time) ||
        tidyTime(lineStop.arrival_time) ||
        addMinutes(baseTime, index * 5),
      price: String(lineStop.price ?? defaultPrice ?? "0"),
    };
  });
}

function firstStopName(stops: DepartureStopForm[]) {
  return stops[0]?.stop_name || "";
}

function lastStopName(stops: DepartureStopForm[]) {
  return stops[stops.length - 1]?.stop_name || "";
}

export default function NewShuttleDeparturePage() {
  const router = useRouter();

  const [lines, setLines] = useState<Line[]>([]);
  const [lineId, setLineId] = useState("");

  const selectedLine = useMemo(() => {
    return lines.find((line) => line.id === lineId) || null;
  }, [lines, lineId]);

  const [departureDate, setDepartureDate] = useState(todayISO());
  const [departureTime, setDepartureTime] = useState("08:00");
  const [price, setPrice] = useState("199");
  const [capacity, setCapacity] = useState("49");

  const [departureStops, setDepartureStops] = useState<DepartureStopForm[]>([]);

  const [hasReturn, setHasReturn] = useState(false);
  const [returnDate, setReturnDate] = useState(todayISO());
  const [returnTime, setReturnTime] = useState("18:00");
  const [returnPrice, setReturnPrice] = useState("199");
  const [returnCapacity, setReturnCapacity] = useState("49");
  const [returnStops, setReturnStops] = useState<DepartureStopForm[]>([]);

  const [bookingDeadline, setBookingDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingLines, setLoadingLines] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadLines() {
    try {
      setLoadingLines(true);
      setError("");

      const res = await fetch("/api/admin/shuttle/lines");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Kunde inte hämta linjer.");
      }

      const loadedLines = Array.isArray(json.lines) ? json.lines : [];
      setLines(loadedLines);

      if (!lineId && loadedLines[0]?.id) {
        setLineId(loadedLines[0].id);
      }
    } catch (e: any) {
      setError(e?.message || "Kunde inte hämta linjer.");
    } finally {
      setLoadingLines(false);
    }
  }

  useEffect(() => {
    loadLines();
  }, []);

  useEffect(() => {
    if (!selectedLine) return;

    const outbound = buildStopsFromLine(selectedLine, departureTime, price, false);
    setDepartureStops(outbound);

    if (hasReturn) {
      const ret = buildStopsFromLine(selectedLine, returnTime, returnPrice, true);
      setReturnStops(ret);
    }
  }, [selectedLine?.id]);

  function updateDepartureStop(
    index: number,
    key: keyof DepartureStopForm,
    value: string
  ) {
    setDepartureStops((prev) =>
      prev.map((stop, i) => (i === index ? { ...stop, [key]: value } : stop))
    );
  }

  function updateReturnStop(
    index: number,
    key: keyof DepartureStopForm,
    value: string
  ) {
    setReturnStops((prev) =>
      prev.map((stop, i) => (i === index ? { ...stop, [key]: value } : stop))
    );
  }

  function regenerateOutboundTimes() {
    setDepartureStops((prev) =>
      prev.map((stop, index) => ({
        ...stop,
        scheduled_time: addMinutes(departureTime, index * 5),
        price: stop.price || price,
      }))
    );
  }

  function regenerateReturnTimes() {
    setReturnStops((prev) =>
      prev.map((stop, index) => ({
        ...stop,
        scheduled_time: addMinutes(returnTime, index * 5),
        price: stop.price || returnPrice,
      }))
    );
  }

  function toggleReturn(value: boolean) {
    setHasReturn(value);

    if (value) {
      setReturnDate(returnDate || departureDate);
      setReturnPrice(returnPrice || price);
      setReturnCapacity(returnCapacity || capacity);
      setReturnStops(buildStopsFromLine(selectedLine, returnTime, returnPrice || price, true));
    } else {
      setReturnStops([]);
    }
  }

  async function saveDeparture() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const routeId = getLineRouteId(selectedLine);

      if (!selectedLine?.id) {
        setError("Välj linje först.");
        return;
      }

      if (!routeId) {
        setError("Vald linje saknar kopplad rutt. Gå till linjer och koppla linjen till en rutt.");
        return;
      }

      if (!departureDate || !departureTime) {
        setError("Datum och tid för utresa måste fyllas i.");
        return;
      }

      if (departureStops.length === 0) {
        setError("Linjen saknar hållplatser. Lägg till hållplatser på linjen först.");
        return;
      }

      if (hasReturn && (!returnDate || !returnTime)) {
        setError("Returdatum och returtid måste fyllas i.");
        return;
      }

      if (hasReturn && returnStops.length === 0) {
        setError("Retur saknar hållplatser.");
        return;
      }

      const res = await fetch("/api/admin/shuttle/departures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route_id: routeId,
          line_id: selectedLine.id,

          departure_date: departureDate,
          departure_time: departureTime,
          price,
          capacity,

          departure_location:
            firstStopName(departureStops) || selectedLine.start_city || null,
          destination_location:
            lastStopName(departureStops) || selectedLine.end_city || null,

          stops: departureStops,

          has_return: hasReturn,
          return_date: hasReturn ? returnDate : null,
          return_time: hasReturn ? returnTime : null,
          return_price: hasReturn ? returnPrice : null,
          return_capacity: hasReturn ? returnCapacity : null,

          return_departure_location: hasReturn
            ? firstStopName(returnStops)
            : null,
          return_destination_location: hasReturn
            ? lastStopName(returnStops)
            : null,
          return_stops: hasReturn ? returnStops : [],

          booking_deadline: bookingDeadline || null,
          notes,
          status: "open",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Kunde inte skapa avgång.");
      }

      setSuccess(
        hasReturn
          ? "Utresa och retur är skapade med hållplatser."
          : "Avgången är skapad med hållplatser."
      );

      setTimeout(() => {
        router.push("/admin/shuttle/avgangar");
      }, 700);
    } catch (e: any) {
      setError(e?.message || "Kunde inte skapa avgång.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Skapa avgång
            </h1>

            <p className="mt-1 text-sm text-[#194C66]/70">
              Välj linje, datum och tid. Hållplatser hämtas automatiskt från linjen.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow xl:col-span-2">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Grunduppgifter
              </h2>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm text-[#194C66]/80">
                    Linje
                  </span>

                  <select
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                    disabled={loadingLines}
                  >
                    <option value="">
                      {loadingLines ? "Laddar linjer..." : "Välj linje"}
                    </option>

                    {lines.map((line) => (
                      <option key={line.id} value={line.id}>
                        {lineLabel(line)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <SectionTitle title="Utresa" />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Field label="Datum">
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => {
                      setDepartureDate(e.target.value);
                      if (!hasReturn) setReturnDate(e.target.value);
                    }}
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                  />
                </Field>

                <Field label="Starttid">
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                  />
                </Field>

                <Field label="Pris">
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                    inputMode="decimal"
                  />
                </Field>

                <Field label="Platser">
                  <input
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                    inputMode="numeric"
                  />
                </Field>
              </div>

              <StopsEditor
                title="Hållplatser för utresa"
                stops={departureStops}
                onChange={updateDepartureStop}
                onRegenerate={regenerateOutboundTimes}
              />

              <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-3xl border border-[#194C66]/15 bg-white p-5 shadow-sm">
                <input
                  type="checkbox"
                  checked={hasReturn}
                  onChange={(e) => toggleReturn(e.target.checked)}
                  className="h-5 w-5"
                />

                <div>
                  <p className="font-semibold text-[#194C66]">
                    Lägg till retur
                  </p>
                  <p className="text-sm text-gray-600">
                    Returen vänder hållplatserna automatiskt och får egen tid/pris.
                  </p>
                </div>
              </label>

              {hasReturn && (
                <>
                  <SectionTitle title="Retur" />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Field label="Returdatum">
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full rounded-xl border px-3 py-3 text-sm"
                      />
                    </Field>

                    <Field label="Returtid">
                      <input
                        type="time"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        className="w-full rounded-xl border px-3 py-3 text-sm"
                      />
                    </Field>

                    <Field label="Returpris">
                      <input
                        value={returnPrice}
                        onChange={(e) => setReturnPrice(e.target.value)}
                        className="w-full rounded-xl border px-3 py-3 text-sm"
                        inputMode="decimal"
                      />
                    </Field>

                    <Field label="Returplatser">
                      <input
                        value={returnCapacity}
                        onChange={(e) => setReturnCapacity(e.target.value)}
                        className="w-full rounded-xl border px-3 py-3 text-sm"
                        inputMode="numeric"
                      />
                    </Field>
                  </div>

                  <StopsEditor
                    title="Hållplatser för retur"
                    stops={returnStops}
                    onChange={updateReturnStop}
                    onRegenerate={regenerateReturnTimes}
                  />
                </>
              )}

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Bokningsstopp">
                  <input
                    type="datetime-local"
                    value={bookingDeadline}
                    onChange={(e) => setBookingDeadline(e.target.value)}
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                  />
                </Field>

                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm text-[#194C66]/80">
                    Intern notering
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[100px] w-full rounded-xl border px-3 py-3 text-sm"
                    placeholder="Ex. extra info, trafikledning, fordon..."
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={saveDeparture}
                  disabled={saving}
                  className="rounded-full bg-[#194C66] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Sparar..."
                    : hasReturn
                      ? "Skapa utresa + retur"
                      : "Skapa avgång"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Förhandsvisning
              </h2>

              <PreviewBox
                title="Utresa"
                from={firstStopName(departureStops)}
                to={lastStopName(departureStops)}
                date={departureDate}
                time={departureTime}
                price={price}
                capacity={capacity}
              />

              {hasReturn && (
                <PreviewBox
                  title="Retur"
                  from={firstStopName(returnStops)}
                  to={lastStopName(returnStops)}
                  date={returnDate}
                  time={returnTime}
                  price={returnPrice}
                  capacity={returnCapacity}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-[#194C66]/80">{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="mb-4 mt-8 text-base font-semibold text-[#194C66]">
      {title}
    </h3>
  );
}

function StopsEditor({
  title,
  stops,
  onChange,
  onRegenerate,
}: {
  title: string;
  stops: DepartureStopForm[];
  onChange: (index: number, key: keyof DepartureStopForm, value: string) => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="mt-5 rounded-3xl border border-[#e5eef3] bg-[#f8fafc] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold text-[#194C66]">{title}</h4>
          <p className="text-sm text-gray-500">
            Tider och pris kan ändras per hållplats.
          </p>
        </div>

        <button
          type="button"
          onClick={onRegenerate}
          className="rounded-full bg-[#e5eef3] px-4 py-2 text-sm font-semibold text-[#194C66]"
        >
          Fyll tider +5 min
        </button>
      </div>

      {stops.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-gray-500">
          Inga hållplatser hittades på linjen ännu.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#e5eef3] text-[#194C66]">
              <tr>
                <th className="px-3 py-2 text-left">Ordning</th>
                <th className="px-3 py-2 text-left">Hållplats</th>
                <th className="px-3 py-2 text-left">Stad</th>
                <th className="px-3 py-2 text-left">Tid</th>
                <th className="px-3 py-2 text-left">Pris</th>
              </tr>
            </thead>

            <tbody>
              {stops.map((stop, index) => (
                <tr key={`${stop.line_stop_id}-${index}`} className="border-b">
                  <td className="px-3 py-2">
                    {stop.stop_order}
                  </td>

                  <td className="px-3 py-2 font-medium text-[#194C66]">
                    {stop.stop_name}
                  </td>

                  <td className="px-3 py-2">
                    {stop.city || "—"}
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="time"
                      value={stop.scheduled_time}
                      onChange={(e) =>
                        onChange(index, "scheduled_time", e.target.value)
                      }
                      className="w-[120px] rounded-lg border px-2 py-1 text-sm"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={stop.price}
                      onChange={(e) => onChange(index, "price", e.target.value)}
                      className="w-[100px] rounded-lg border px-2 py-1 text-sm"
                      inputMode="decimal"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PreviewBox({
  title,
  from,
  to,
  date,
  time,
  price,
  capacity,
}: {
  title: string;
  from: string;
  to: string;
  date: string;
  time: string;
  price: string;
  capacity: string;
}) {
  return (
    <div className="mt-5 rounded-2xl bg-[#f5f4f0] p-4 text-sm">
      <p className="font-semibold text-[#194C66]">{title}</p>
      <p className="mt-1 text-gray-700">
        {from || "Från"} → {to || "Till"}
      </p>
      <p className="mt-1 text-gray-500">
        {date} kl. {time}
      </p>
      <p className="mt-1 font-semibold text-[#194C66]">
        {price || 0} kr · {capacity || 0} platser
      </p>
    </div>
  );
}
