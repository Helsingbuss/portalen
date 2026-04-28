export default function RecentBookings() {
  // Fake data (kopplas till API sen)
  const bookings = [
    {
      id: 1,
      name: "Anna Svensson",
      trip: "Flygbuss Helsingborg → Kastrup",
      amount: 199,
      status: "paid",
    },
    {
      id: 2,
      name: "Johan Karlsson",
      trip: "Ullared Shoppingresa",
      amount: 699,
      status: "pending",
    },
    {
      id: 3,
      name: "Lisa Andersson",
      trip: "Flygbuss Helsingborg → Kastrup",
      amount: 199,
      status: "paid",
    },
    {
      id: 4,
      name: "Erik Nilsson",
      trip: "Liseberg Sommarresa",
      amount: 599,
      status: "pending",
    },
  ];

  function getStatusColor(status: string) {
    if (status === "paid") return "text-green-600";
    if (status === "pending") return "text-orange-500";
    return "text-gray-500";
  }

  function getStatusText(status: string) {
    if (status === "paid") return "Betald";
    if (status === "pending") return "Väntar";
    return status;
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-[#194C66]">
          Senaste bokningar
        </h3>

        <button className="text-sm text-[#194C66]">
          Visa alla
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-3">

        {bookings.map((b) => (
          <div
            key={b.id}
            className="flex justify-between items-center border-b pb-2 last:border-0"
          >
            <div>
              <p className="text-sm font-medium">{b.name}</p>
              <p className="text-xs text-gray-500">{b.trip}</p>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold">{b.amount} kr</p>
              <p className={`text-xs ${getStatusColor(b.status)}`}>
                {getStatusText(b.status)}
              </p>
            </div>
          </div>
        ))}

      </div>

    </div>
  );
}
