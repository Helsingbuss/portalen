export default function StoreStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

      {/* Dagens försäljning */}
      <div className="bg-white p-4 rounded-xl shadow">
        <p className="text-sm text-gray-500">Dagens försäljning</p>
        <h2 className="text-xl font-semibold text-[#194C66] mt-1">
          12 450 kr
        </h2>
      </div>

      {/* Antal bokningar */}
      <div className="bg-white p-4 rounded-xl shadow">
        <p className="text-sm text-gray-500">Antal bokningar</p>
        <h2 className="text-xl font-semibold text-[#194C66] mt-1">
          28
        </h2>
      </div>

      {/* Väntande betalningar */}
      <div className="bg-white p-4 rounded-xl shadow">
        <p className="text-sm text-gray-500">Väntande betalningar</p>
        <h2 className="text-xl font-semibold text-orange-500 mt-1">
          6
        </h2>
      </div>

      {/* Snitt order */}
      <div className="bg-white p-4 rounded-xl shadow">
        <p className="text-sm text-gray-500">Snitt ordervärde</p>
        <h2 className="text-xl font-semibold text-[#194C66] mt-1">
          445 kr
        </h2>
      </div>

    </div>
  );
}
