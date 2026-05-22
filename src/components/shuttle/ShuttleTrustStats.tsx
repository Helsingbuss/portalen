export default function ShuttleTrustStats() {
  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-3">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="text-3xl font-black text-[#194C66]">Tryggt</div>
        <p className="mt-2 text-sm text-gray-600">Resor med fokus på säkerhet.</p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="text-3xl font-black text-[#194C66]">Smidigt</div>
        <p className="mt-2 text-sm text-gray-600">Boka och betala digitalt.</p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="text-3xl font-black text-[#194C66]">Direkt</div>
        <p className="mt-2 text-sm text-gray-600">Tydliga avgångar till flyget.</p>
      </div>
    </section>
  );
}