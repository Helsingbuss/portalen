import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type SynergyBusRow = {
  id: string;
  synergybus_reference: string | null;
  status: string | null;
  customer_name: string | null;
  pickup_location: string | null;
  destination: string | null;
  departure_date: string | null;
  departure_time: string | null;
  passengers: number | null;
  our_price_total: number | null;
  supplier_cost: number | null;
  margin_total: number | null;
  margin_percent: number | null;
  quote_deadline_at: string | null;
  created_at: string | null;
};

const statusText: Record<string, string> = {
  new: "Ny",
  calculating: "Beräknas",
  quote_sent: "Offert skickad",
  won: "Vunnen",
  lost: "Förlorad",
  declined: "Avböjd",
  booked: "Bokad",
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function dateText(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("sv-SE");
}

function deadlineText(value: string | null | undefined) {
  if (!value) return "Ingen tid";
  return new Date(String(value).replace(" ", "T")).toLocaleString("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function parseLocalDateTime(value: string | null | undefined) {
  if (!value) return null;

  const clean = String(value).replace("T", " ").slice(0, 16);
  const [datePart, timePart = "00:00"] = clean.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, hour || 0, minute || 0, 0);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetweenLocalDates(from: Date, to: Date) {
  const fromDay = startOfLocalDay(from).getTime();
  const toDay = startOfLocalDay(to).getTime();
  return Math.round((toDay - fromDay) / (1000 * 60 * 60 * 24));
}

function deadlineBadge(row: SynergyBusRow) {
  if (!row.quote_deadline_at) {
    return { text: "Ingen svarstid", cls: "bg-gray-100 text-gray-700" };
  }

  const handled = ["quote_sent", "won", "lost", "declined", "booked"];
  if (handled.includes(String(row.status || ""))) {
    return { text: "Hanterad", cls: "bg-green-100 text-green-800" };
  }

  const deadline = parseLocalDateTime(row.quote_deadline_at);
  if (!deadline) {
    return { text: "Ogiltig tid", cls: "bg-gray-100 text-gray-700" };
  }

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / 1000 / 60 / 60;
  const diffDays = daysBetweenLocalDates(now, deadline);

  if (diffMs < 0) {
    return { text: "Försenad", cls: "bg-red-100 text-red-800" };
  }

  if (diffHours <= 3) {
    return { text: "Stänger snart", cls: "bg-red-100 text-red-800" };
  }

  if (diffDays === 0) {
    return { text: "Stänger idag", cls: "bg-yellow-100 text-yellow-800" };
  }

  if (diffDays === 1) {
    return { text: "Stänger imorgon", cls: "bg-yellow-100 text-yellow-800" };
  }

  if (diffDays > 1) {
    return { text: `Stänger om ${diffDays} dagar`, cls: "bg-green-100 text-green-800" };
  }

  return { text: "OK", cls: "bg-green-100 text-green-800" };
}

export default function SynergyBusPage() {
  const [rows, setRows] = useState<SynergyBusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalValue = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.our_price_total ?? 0), 0);
  }, [rows]);

  const totalMargin = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.margin_total ?? 0), 0);
  }, [rows]);

  const alertRows = useMemo(() => {
    return rows.filter((row) => {
      if (!row.quote_deadline_at) return false;

      const handled = ["quote_sent", "won", "lost", "declined", "booked"];
      if (handled.includes(String(row.status || ""))) return false;

      const deadline = new Date(String(row.quote_deadline_at).replace(" ", "T"));
      const diffMs = deadline.getTime() - Date.now();
      const hours = diffMs / 1000 / 60 / 60;

      return diffMs < 0 || hours <= 24;
    });
  }, [rows]);

  const overdueCount = useMemo(() => {
    return alertRows.filter((row) => {
      if (!row.quote_deadline_at) return false;
      const deadline = new Date(String(row.quote_deadline_at).replace(" ", "T"));
      return deadline.getTime() < Date.now();
    }).length;
  }, [alertRows]);

  useEffect(() => {
    async function loadRows() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/offers/synergybus");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Kunde inte hämta SynergyBus-förfrågningar.");
        }

        setRows(data.rows ?? []);
      } catch (err: any) {
        setError(err?.message || "Något gick fel.");
      } finally {
        setLoading(false);
      }
    }

    loadRows();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <AdminMenu />

      <main className="mx-auto max-w-7xl px-4 pb-6 pt-24 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Offerter
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              SynergyBus-förfrågningar
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Här samlar du förfrågningar från SynergyBus, vårt pris, kostnad,
              marginal och Sista svarstid, svensk tid.
            </p>
          </div>

          <Link
            href="/admin/offers/synergybus/new"
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            + Lägg till förfrågan
          </Link>
        </div>

        {alertRows.length > 0 ? (
          <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-yellow-900">
                  SynergyBus-förfrågningar kräver åtgärd
                </h2>
                <p className="mt-1 text-sm text-yellow-800">
                  {alertRows.length} förfrågan{alertRows.length === 1 ? "" : "ar"} stänger snart eller ?r försenad.
                  {overdueCount > 0 ? " " + overdueCount + " ?r redan försenad." : ""}
                </p>
              </div>

              <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-900">
                Kontrollera innan svarstiden går ut
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {alertRows.slice(0, 5).map((row) => {
                const badge = deadlineBadge(row);

                return (
                  <Link
                    key={row.id}
                    href={`/admin/offers/synergybus/${row.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm shadow-sm hover:bg-yellow-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        {row.customer_name || "Ej angiven kund"} ? {row.pickup_location || "-"} till {row.destination || "-"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Sista svarstid, svensk tid: {deadlineText(row.quote_deadline_at)}
                      </div>
                    </div>

                    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </Link>
                );
              })}
            </div>

            {alertRows.length > 5 ? (
              <p className="mt-3 text-xs text-yellow-800">
                Visar de 5 f?rsta. Resterande syns i listan nedanf?r.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Antal förfrågningar</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{rows.length}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Möjlig omsättning</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{money(totalValue)}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Beräknad marginal</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{money(totalMargin)}</p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Laddar...</div>
          ) : rows.length === 0 ? (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Inga SynergyBus-förfrågningar ännu
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                När du lägger in första förfrågan visas den här.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Datum</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Kund / ref</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Resa</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Antal</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Vårt pris</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Marginal</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Sista svarstid, svensk tid</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Åtgärd</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {rows.map((row) => {
                    const badge = deadlineBadge(row);

                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                            {statusText[String(row.status || "new")] || row.status || "Ny"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          {dateText(row.departure_date)}
                          {row.departure_time ? (
                            <div className="text-xs text-gray-500">{String(row.departure_time).slice(0, 5)}</div>
                          ) : null}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{row.customer_name || "Ej angivet"}</div>
                          <div className="text-xs text-gray-500">{row.synergybus_reference || "Ingen referens"}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{row.pickup_location || "-"}</div>
                          <div className="text-xs text-gray-500">till {row.destination || "-"}</div>
                        </td>

                        <td className="px-4 py-3 text-gray-700">{row.passengers ?? "-"}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{money(row.our_price_total)}</td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{money(row.margin_total)}</div>
                          <div className="text-xs text-gray-500">{Number(row.margin_percent ?? 0)}%</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-gray-700">{deadlineText(row.quote_deadline_at)}</div>
                          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                            {badge.text}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/offers/synergybus/${row.id}`}
                            className="font-semibold text-emerald-700 hover:text-emerald-900"
                          >
                            Öppna
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}



