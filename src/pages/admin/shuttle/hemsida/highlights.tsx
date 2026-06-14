import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type HighlightCard = {
  id: number | string;
  title: string;
  text: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  active: boolean;
  startDate: string;
  endDate: string;
};

const emptyCard = (id: number): HighlightCard => ({
  id,
  title: "Nytt bildkort",
  text: "Skriv en kort och säljande text här.",
  image: "/images/highlights/highlight-booking.png",
  buttonText: "Läs mer",
  buttonLink: "/start",
  active: true,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
});

export default function ShuttleHighlightsAdminPage() {
  const [cards, setCards] = useState<HighlightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeCount = useMemo(() => {
    return cards.filter((card) => card.active).length;
  }, [cards]);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/shuttle/highlights");

      if (!response.ok) {
        throw new Error("Kunde inte hämta bildkorten.");
      }

      const data = await response.json();
      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch (error) {
      console.error(error);
      alert("Kunde inte hämta bildkorten från databasen.");
    } finally {
      setLoading(false);
    }
  }

  function updateCard(id: number | string, field: keyof HighlightCard, value: string | boolean) {
    setCards((current) =>
      current.map((card) =>
        card.id === id ? { ...card, [field]: value } : card
      )
    );
  }

  function addCard() {
    const numericIds = cards
      .map((card) => Number(card.id))
      .filter((id) => Number.isFinite(id));

    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

    setCards((current) => [...current, emptyCard(nextId)]);
  }

  function removeCard(id: number | string) {
    setCards((current) => current.filter((card) => card.id !== id));
  }

  async function saveCards() {
    try {
      setSaving(true);

      const response = await fetch("/api/admin/shuttle/highlights", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cards }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Kunde inte spara bildkorten.");
      }

      setCards(Array.isArray(data.cards) ? data.cards : []);
      alert("Ändringarna är sparade.");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Kunde inte spara ändringarna.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Header />

      <div className="flex">
        <AdminMenu />

        <main className="flex-1 px-8 pb-12 pt-28">
          <div className="ml-auto mr-[7vw] w-full max-w-[1380px] space-y-7">
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#007764]">
                    Helsingbuss Airport Shuttle
                  </p>

                  <h1 className="mt-2 text-2xl font-bold text-slate-900">
                    Bildkort / highlights
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm text-slate-600">
                    Här styr du bildkorten som visas på startsidan för HB Shuttle.
                    Du kan ändra rubrik, text, bild, knapp, datum och lägga till fler kort.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="rounded-xl bg-[#007764]/10 px-4 py-3 text-sm font-semibold text-[#007764]">
                    {activeCount} av {cards.length} aktiva
                  </div>

                  <button
                    type="button"
                    onClick={saveCards}
                    disabled={saving || loading}
                    className="rounded-xl bg-[#1A545F] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#164852] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara ändringar"}
                  </button>

                  <button
                    type="button"
                    onClick={addCard}
                    disabled={loading}
                    className="rounded-xl bg-[#007764] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#006A59] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    + Lägg till bildkort
                  </button>
                </div>
              </div>
            </section>

            {loading ? (
              <section className="rounded-2xl bg-white p-8 text-center text-sm text-slate-600 shadow-sm border border-slate-200">
                Hämtar bildkorten från databasen...
              </section>
            ) : (
              <section className="grid gap-7 xl:grid-cols-3">
                {cards.map((card) => (
                  <article
                    key={card.id}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200"
                  >
                    <div className="h-52 bg-slate-200">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-slate-900">
                          Kort {card.id}
                        </h2>

                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={card.active}
                            onChange={(event) =>
                              updateCard(card.id, "active", event.target.checked)
                            }
                          />
                          Aktiv
                        </label>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Rubrik
                        </label>
                        <input
                          value={card.title}
                          onChange={(event) =>
                            updateCard(card.id, "title", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#007764] focus:ring-2 focus:ring-[#007764]/15"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Text
                        </label>
                        <textarea
                          value={card.text}
                          onChange={(event) =>
                            updateCard(card.id, "text", event.target.value)
                          }
                          rows={4}
                          className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#007764] focus:ring-2 focus:ring-[#007764]/15"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Bildsökväg
                        </label>
                        <input
                          value={card.image}
                          onChange={(event) =>
                            updateCard(card.id, "image", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#007764] focus:ring-2 focus:ring-[#007764]/15"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Visas från
                          </label>
                          <input
                            type="date"
                            value={card.startDate}
                            onChange={(event) =>
                              updateCard(card.id, "startDate", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#007764] focus:ring-2 focus:ring-[#007764]/15"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Visas till
                          </label>
                          <input
                            type="date"
                            value={card.endDate}
                            onChange={(event) =>
                              updateCard(card.id, "endDate", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#007764] focus:ring-2 focus:ring-[#007764]/15"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Knapptext
                          </label>
                          <input
                            value={card.buttonText}
                            onChange={(event) =>
                              updateCard(card.id, "buttonText", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#007764] focus:ring-2 focus:ring-[#007764]/15"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Länk
                          </label>
                          <input
                            value={card.buttonLink}
                            onChange={(event) =>
                              updateCard(card.id, "buttonLink", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#007764] focus:ring-2 focus:ring-[#007764]/15"
                          />
                        </div>
                      </div>

                      {cards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCard(card.id)}
                          className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                        >
                          Ta bort kort
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
