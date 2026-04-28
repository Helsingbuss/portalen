export default function PendingPayments() {
  // Fake data (kopplas till API sen)
  const payments = [
    {
      id: 1,
      name: "Johan Karlsson",
      amount: 699,
      time: "10 min sedan",
    },
    {
      id: 2,
      name: "Erik Nilsson",
      amount: 599,
      time: "25 min sedan",
    },
    {
      id: 3,
      name: "Maria Olsson",
      amount: 199,
      time: "1 tim sedan",
    },
  ];

  return (
    <div className="bg-white p-4 rounded-xl shadow">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-[#194C66]">
          Väntande betalningar
        </h3>

        <button className="text-sm text-[#194C66]">
          Visa alla
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-3">

        {payments.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center border-b pb-2 last:border-0"
          >
            <div>
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-gray-500">{p.time}</p>
            </div>

            <div className="flex items-center gap-3">
              
              <p className="text-sm font-semibold text-orange-500">
                {p.amount} kr
              </p>

              {/* Skicka igen */}
              <button className="text-xs bg-[#194C66] text-white px-3 py-1 rounded">
                Skicka igen
              </button>

            </div>
          </div>
        ))}

      </div>

    </div>
  );
}
