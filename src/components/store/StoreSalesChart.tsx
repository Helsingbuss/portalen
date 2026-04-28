export default function StoreSalesChart() {
  // Fake data (sen kopplar vi API)
  const data = [
    { day: "Mån", flygbuss: 520, resor: 340 },
    { day: "Tis", flygbuss: 410, resor: 280 },
    { day: "Ons", flygbuss: 300, resor: 240 },
    { day: "Tör", flygbuss: 380, resor: 390 },
    { day: "Fre", flygbuss: 260, resor: 210 },
    { day: "Lör", flygbuss: 330, resor: 420 },
    { day: "Sön", flygbuss: 480, resor: 260 },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-semibold text-[#194C66]">
          Försäljning denna vecka
        </h2>

        <div className="flex gap-2 text-sm">
          <button className="px-3 py-1 bg-gray-100 rounded">Dag</button>
          <button className="px-3 py-1 bg-[#194C66] text-white rounded">
            Vecka
          </button>
          <button className="px-3 py-1 bg-gray-100 rounded">Månad</button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-4 h-40">
        {data.map((item) => (
          <div key={item.day} className="flex flex-col items-center gap-2 w-full">
            
            <div className="flex items-end gap-1 h-full">
              
              {/* Flygbuss */}
              <div
                className="w-3 rounded bg-blue-500"
                style={{ height: `${item.flygbuss / 6}px` }}
              />

              {/* Resor */}
              <div
                className="w-3 rounded bg-green-500"
                style={{ height: `${item.resor / 6}px` }}
              />

            </div>

            <span className="text-xs text-gray-500">{item.day}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          Flygbuss
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          Resor
        </div>
      </div>

    </div>
  );
}
