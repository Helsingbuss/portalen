warning: in the working copy of 'src/pages/vara-resor/[slug].tsx', CRLF will be replaced by LF the next time Git touches it
[1mdiff --git a/src/pages/vara-resor/[slug].tsx b/src/pages/vara-resor/[slug].tsx[m
[1mindex 4d481ca..9e68a59 100644[m
[1m--- a/src/pages/vara-resor/[slug].tsx[m
[1m+++ b/src/pages/vara-resor/[slug].tsx[m
[36m@@ -122,6 +122,7 @@[m [mexport default function TripPage() {[m
   const [step, setStep] = useState<Step>(1);[m
   const [trip, setTrip] = useState<Trip | null>(null);[m
   const [selectedDepartureId, setSelectedDepartureId] = useState("");[m
[32m+[m[32m  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null);[m
   const [selectedLineStopId, setSelectedLineStopId] = useState("");[m
   const [loading, setLoading] = useState(true);[m
   const [bookingLoading, setBookingLoading] = useState(false);[m
[36m@@ -171,15 +172,19 @@[m [mexport default function TripPage() {[m
     );[m
   }, [trip]);[m
 [m
[31m-  const calendarDays = useMemo(() => {[m
[32m+[m[32mconst calendarDays = useMemo(() => {[m
     const base =[m
[31m-      selectedDeparture?.departure_date || sortedDepartures[0]?.departure_date;[m
[32m+[m[32m      calendarMonth ||[m
[32m+[m[32m      (selectedDeparture?.departure_date[m
[32m+[m[32m        ? new Date(`${selectedDeparture.departure_date}T00:00:00`)[m
[32m+[m[32m        : sortedDepartures[0]?.departure_date[m
[32m+[m[32m          ? new Date(`${sortedDepartures[0].departure_date}T00:00:00`)[m
[32m+[m[32m          : null);[m
 [m
     if (!base) return [];[m
 [m
[31m-    const baseDate = new Date(`${base}T00:00:00`);[m
[31m-    const year = baseDate.getFullYear();[m
[31m-    const month = baseDate.getMonth();[m
[32m+[m[32m    const year = base.getFullYear();[m
[32m+[m[32m    const month = base.getMonth();[m
     const daysInMonth = new Date(year, month + 1, 0).getDate();[m
 [m
     const departuresByDay = new Map<number, Departure>();[m
[36m@@ -196,12 +201,59 @@[m [mexport default function TripPage() {[m
 [m
     return Array.from({ length: daysInMonth }).map((_, i) => {[m
       const day = i + 1;[m
[32m+[m
       return {[m
         day,[m
         departure: departuresByDay.get(day) || null,[m
       };[m
     });[m
[31m-  }, [selectedDeparture?.departure_date, sortedDepartures]);[m
[32m+[m[32m  }, [[m
[32m+[m[32m    calendarMonth,[m
[32m+[m[32m    selectedDeparture?.departure_date,[m
[32m+[m[32m    sortedDepartures,[m
[32m+[m[32m  ]);[m
[32m+[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    const firstDate =[m
[32m+[m[32m      selectedDeparture?.departure_date ||[m
[32m+[m[32m      sortedDepartures[0]?.departure_date;[m
[32m+[m
[32m+[m[32m    if (!calendarMonth && firstDate) {[m
[32m+[m[32m      const d = new Date(`${firstDate}T00:00:00`);[m
[32m+[m
[32m+[m[32m      setCalendarMonth([m
[32m+[m[32m        new Date(d.getFullYear(), d.getMonth(), 1)[m
[32m+[m[32m      );[m
[32m+[m[32m    }[m
[32m+[m[32m  }, [[m
[32m+[m[32m    calendarMonth,[m
[32m+[m[32m    selectedDeparture?.departure_date,[m
[32m+[m[32m    sortedDepartures,[m
[32m+[m[32m  ]);[m
[32m+[m
[32m+[m[32m  function previousCalendarMonth() {[m
[32m+[m[32m    setCalendarMonth((prev) => {[m
[32m+[m[32m      const base = prev || new Date();[m
[32m+[m
[32m+[m[32m      return new Date([m
[32m+[m[32m        base.getFullYear(),[m
[32m+[m[32m        base.getMonth() - 1,[m
[32m+[m[32m        1[m
[32m+[m[32m      );[m
[32m+[m[32m    });[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  function nextCalendarMonth() {[m
[32m+[m[32m    setCalendarMonth((prev) => {[m
[32m+[m[32m      const base = prev || new Date();[m
[32m+[m
[32m+[m[32m      return new Date([m
[32m+[m[32m        base.getFullYear(),[m
[32m+[m[32m        base.getMonth() + 1,[m
[32m+[m[32m        1[m
[32m+[m[32m      );[m
[32m+[m[32m    });[m
[32m+[m[32m  }[m
 [m
   useEffect(() => {[m
     if (!slug || typeof slug !== "string") return;[m
[36m@@ -710,76 +762,30 @@[m [mexport default function TripPage() {[m
                 Priskalender[m
               </h1>[m
 [m
[31m-              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">[m
[31m-                <div className="mb-5 flex items-center justify-between text-[#00879a]">[m
[31m-                  <span className="text-2xl">«</span>[m
[31m-                  <h2 className="text-2xl font-semibold text-[#111827]">[m
[31m-                    {monthTitle(firstDeparture?.departure_date)}[m
[31m-                  </h2>[m
[31m-                  <span className="text-2xl">»</span>[m
[31m-                </div>[m
[31m-[m
[31m-                <div className="grid grid-cols-7 gap-3 text-center">[m
[31m-                  {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map([m
[31m-                    (day) => ([m
[31m-                      <div[m
[31m-                        key={day}[m
[31m-                        className="pb-2 text-lg font-semibold text-[#111827]"[m
[31m-                      >[m
[31m-                        {day}[m
[31m-                      </div>[m
[31m-                    )[m
[31m-                  )}[m
[31m-[m
[31m-                  {calendarDays.map(({ day, departure }) => {[m
[31m-                    const active = departure?.id === selectedDepartureId;[m
[31m-                    const available = Boolean(departure);[m
[31m-[m
[31m-                    return ([m
[31m-                      <button[m
[31m-                        key={day}[m
[31m-                        type="button"[m
[31m-                        disabled={!available}[m
[31m-                        onClick={() => {[m
[31m-                          if (!departure) return;[m
[31m-                          setSelectedDepartureId(departure.id);[m
[31m-                        }}[m
[31m-                        className={`relative min-h-[116px] rounded-xl border p-3 text-center transition ${[m
[31m-                          active[m
[31m-                            ? "border-[#008aa0] bg-[#e4fbff] shadow"[m
[31m-                            : available[m
[31m-                            ? "border-gray-300 bg-white hover:border-[#008aa0]"[m
[31m-                            : "border-gray-200 bg-gray-100 text-gray-400"[m
[31m-                        }`}[m
[31m-                      >[m
[31m-                        {active && ([m
[31m-                          <span className="absolute -right-1 -top-1 rounded bg-[#d83b4a] px-3 py-1 text-xs font-bold text-white">[m
[31m-                            Vald[m
[31m-                          </span>[m
[31m-                        )}[m
[31m-[m
[31m-                        <div className="text-xl">{day}</div>[m
[31m-[m
[31m-                        {available ? ([m
[31m-                          <>[m
[31m-                            <div className="mt-3 text-xs text-gray-500">fr.</div>[m
[31m-                            <div className="text-lg font-semibold text-[#d83b4a]">[m
[31m-                              {money(departure?.price || trip.price_from)}[m
[31m-                            </div>[m
[31m-                            <div className="mt-1 text-xs text-[#00879a]">[m
[31m-                              {active[m
[31m-                                ? "Vald ✓"[m
[31m-                                : `${departure?.seats_left ?? 0} platser`}[m
[31m-                            </div>[m
[31m-                          </>[m
[31m-                        ) : ([m
[31m-                          <div className="mt-8 text-xs">Ej tillgänglig</div>[m
[31m-                        )}[m
[31m-                      </button>[m
[31m-                    );[m
[31m-                  })}[m
[31m-                </div>[m
[31m-              </div>[m
[32m+[m[32m             <div className="mb-5 flex items-center justify-between text-[#00879a]">[m
[32m+[m[32m  <button[m
[32m+[m[32m    t