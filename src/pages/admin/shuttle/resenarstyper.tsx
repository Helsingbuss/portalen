import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";

const passengerTypes = [
  { title: "Vuxen", age: "26-64 år" },
  { title: "Barn", age: "0-15 år" },
  { title: "Ungdom", age: "16-25 år" },
  { title: "Senior", age: "65+ år" },
];

export default function ShuttleResenarstyperPage() {
  return (
    <>
      <Header />
      <AdminMenu />

      <main className="min-h-screen space-y-6 bg-[#f7f9fb] px-8 py-6 pt-24 md:ml-[280px] md:px-8 lg:px-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#007764]">
            Flygbuss - Airport Shuttle
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Resenärstyper
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Här ska du kunna ändra vilka resenärstyper som visas i bokningen,
            till exempel vuxen, barn, ungdom och senior.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {passengerTypes.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm font-medium text-slate-600">{item.age}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
