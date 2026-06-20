import { useEffect, useState } from "react";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";

type PassengerType = {
  type_key: string;
  title: string;
  age_text: string;
  sort_order: number;
  is_active: boolean;
};

const fallbackPassengerTypes: PassengerType[] = [
  { type_key: "adult", title: "Vuxen", age_text: "26-64 år", sort_order: 1, is_active: true },
  { type_key: "child", title: "Barn", age_text: "0-15 år", sort_order: 2, is_active: true },
  { type_key: "youth", title: "Ungdom", age_text: "16-25 år", sort_order: 3, is_active: true },
  { type_key: "senior", title: "Senior", age_text: "65+ år", sort_order: 4, is_active: true },
];

export default function ShuttleResenarstyperPage() {
  const [passengerTypes, setPassengerTypes] = useState<PassengerType[]>(fallbackPassengerTypes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    const response = await fetch("/api/admin/shuttle/passenger-types");
    const data = await response.json();
    if (Array.isArray(data.passengerTypes)) setPassengerTypes(data.passengerTypes);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateItem(typeKey: string, field: "title" | "age_text", value: string) {
    setPassengerTypes((current) => current.map((item) => item.type_key === typeKey ? { ...item, [field]: value } : item));
  }

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/shuttle/passenger-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passengerTypes }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Kunde inte spara.");

      setMessage("Resenärstyperna sparades.");
      if (Array.isArray(data.passengerTypes)) setPassengerTypes(data.passengerTypes);
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
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#007764]">Flygbuss - Airport Shuttle</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Resenärstyper</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Ändra kategorierna som visas i bokningen.</p>
            </div>
            <button onClick={save} disabled={saving} className="rounded-2xl bg-[#007764] px-5 py-3 text-sm font-semibold text-white hover:bg-[#006A59] disabled:opacity-60">
              {saving ? "Sparar..." : "Spara ändringar"}
            </button>
          </div>
          {message ? <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">{message}</div> : null}
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {passengerTypes.map((item) => (
            <article key={item.type_key} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="block text-sm font-semibold text-slate-800">Namn</label>
              <input value={item.title} onChange={(event) => updateItem(item.type_key, "title", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]" />

              <label className="mt-5 block text-sm font-semibold text-slate-800">Ålderstext</label>
              <input value={item.age_text} onChange={(event) => updateItem(item.type_key, "age_text", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]" />
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
