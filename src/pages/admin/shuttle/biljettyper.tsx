import { useEffect, useState } from "react";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";

type TicketType = {
  type_key: "plus" | "economy";
  title: string;
  benefits: string[];
  sort_order: number;
  is_active: boolean;
};

const fallbackTicketTypes: TicketType[] = [
  {
    type_key: "plus",
    title: "Plus",
    benefits: [
      "Extra benutrymme",
      "Prioriterad ombordstigning",
      "1 handbagage + 1 resväska",
    ],
    sort_order: 1,
    is_active: true,
  },
  {
    type_key: "economy",
    title: "Ekonomi",
    benefits: [
      "Bekväm sittplats",
      "1 handbagage + 1 resväska",
    ],
    sort_order: 2,
    is_active: true,
  },
];

export default function ShuttleTicketTypesPage() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(fallbackTicketTypes);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTicketTypes() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/shuttle/ticket-types");
      const data = await response.json();

      if (Array.isArray(data.ticketTypes) && data.ticketTypes.length > 0) {
        setTicketTypes(data.ticketTypes);
      }
    } catch (error) {
      setMessage("Kunde inte hämta biljettyperna.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTicketTypes();
  }, []);

  function updateTitle(typeKey: string, value: string) {
    setTicketTypes((current) =>
      current.map((item) =>
        item.type_key === typeKey ? { ...item, title: value } : item
      )
    );
  }

  function updateBenefits(typeKey: string, value: string) {
    const benefits = value
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean);

    setTicketTypes((current) =>
      current.map((item) =>
        item.type_key === typeKey ? { ...item, benefits } : item
      )
    );
  }

  async function saveTicketTypes() {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/admin/shuttle/ticket-types", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticketTypes }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Kunde inte spara.");
      }

      setMessage("Biljettyperna sparades.");
      if (Array.isArray(data.ticketTypes)) {
        setTicketTypes(data.ticketTypes);
      }
    } catch (error: any) {
      setMessage(error?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />
      <AdminMenu />

      <main className="min-h-screen space-y-6 bg-[#f7f9fb] px-8 py-6 pt-24 md:ml-[280px] md:px-8 lg:px-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#007764]">
                Airport Shuttle
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                Biljettyper
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Här ändrar du texter som visas på hbshuttle.se för Plus och Ekonomi.
                Skriv en punkt per rad i listan.
              </p>
            </div>

            <button
              type="button"
              onClick={saveTicketTypes}
              disabled={saving}
              className="rounded-2xl bg-[#007764] px-5 py-3 text-sm font-semibold text-white hover:bg-[#006A59] disabled:opacity-60"
            >
              {saving ? "Sparar..." : "Spara ändringar"}
            </button>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}
        </section>

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Laddar biljettyper...
          </section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            {ticketTypes.map((item) => (
              <article
                key={item.type_key}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {item.type_key === "plus" ? "Biljettyp Plus" : "Biljettyp Ekonomi"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    {item.title}
                  </h2>
                </div>

                <label className="block text-sm font-semibold text-slate-800">
                  Rubrik
                </label>
                <input
                  value={item.title}
                  onChange={(event) => updateTitle(item.type_key, event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]"
                />

                <label className="mt-5 block text-sm font-semibold text-slate-800">
                  Punkter
                </label>
                <textarea
                  value={item.benefits.join("\n")}
                  onChange={(event) => updateBenefits(item.type_key, event.target.value)}
                  rows={7}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]"
                />

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Förhandsvisning
                  </p>
                  <strong className="text-slate-950">{item.title}</strong>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {item.benefits.map((benefit) => (
                      <li key={benefit}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
