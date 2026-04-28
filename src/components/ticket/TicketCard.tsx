import QRCode from "react-qr-code";

export default function TicketCard({ ticket }: any) {
  const qrValue = `${ticket.id}-${ticket.qrCode || "secure"}`;

  // 📅 Format datum snyggt
  const formatDate = (date: string | Date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // ⛔ Kolla om periodkort gått ut
  const isExpired =
    ticket.validUntil &&
    new Date(ticket.validUntil) < new Date();

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">

      {/* HEADER */}
      <div className="bg-[#194C66] text-white p-4">
        <h2 className="text-lg font-semibold">Helsingbuss</h2>
        <p className="text-xs opacity-80">Biljett</p>
      </div>

      {/* CONTENT */}
      <div className="p-5 space-y-4">

        {/* RESA */}
        <div>
          <p className="text-sm text-gray-500">Resa</p>
          <h3 className="font-semibold text-base">
            {ticket.productName}
          </h3>
        </div>

        {/* INFO */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {ticket.date && (
            <div>
              <p className="text-gray-400">Datum</p>
              <p>{formatDate(ticket.date)}</p>
            </div>
          )}

          {ticket.stop && (
            <div>
              <p className="text-gray-400">Påstigning</p>
              <p>{ticket.stop}</p>
            </div>
          )}

          <div>
            <p className="text-gray-400">Biljettyp</p>
            <p>{ticket.ticketType || "Enkel"}</p>
          </div>

          <div>
            <p className="text-gray-400">Antal</p>
            <p>{ticket.qty}</p>
          </div>

          {/* 🆕 GILTIGHET */}
          {ticket.validUntil && (
            <div>
              <p className="text-gray-400">Giltig till</p>
              <p className={`font-medium ${
                isExpired ? "text-red-600" : "text-green-600"
              }`}>
                {formatDate(ticket.validUntil)}
              </p>
            </div>
          )}
        </div>

        {/* QR */}
        <div className="flex flex-col items-center pt-4">
          <QRCode
            value={qrValue}
            style={{ width: 160, height: 160 }}
          />

          <p className="text-xs text-gray-400 mt-2">
            Visa vid ombordstigning
          </p>

          {/* 🔥 SMART LOGIK */}
          <div className="mt-3 text-center">

            {/* 🎫 KLIPPKORT */}
            {ticket.maxUses > 1 && (
              <p className="text-blue-600 font-medium text-sm">
                {ticket.usesLeft} resor kvar
              </p>
            )}

            {/* 🎟️ ENKEL */}
            {ticket.maxUses === 1 && (
              ticket.isUsed ? (
                <p className="text-red-500 font-medium text-sm">
                  Redan använd
                </p>
              ) : (
                <p className="text-green-600 font-medium text-sm">
                  Ej använd
                </p>
              )
            )}

            {/* ⛔ PERIOD UTGÅNGEN */}
            {isExpired && (
              <p className="text-red-600 font-bold text-sm mt-1">
                UTGÅNGEN
              </p>
            )}
          </div>
        </div>

        {/* KUND */}
        <div className="pt-4 border-t text-sm">
          <p className="font-medium">{ticket.customerName}</p>
          <p className="text-gray-500">{ticket.customerEmail}</p>
        </div>

        {/* STATUS */}
        <div className="flex justify-between items-center text-sm pt-2">
          <span className="text-gray-400">Status</span>
          <span className={`font-medium ${
            ticket.status === "paid"
              ? "text-green-600"
              : "text-red-500"
          }`}>
            {ticket.status === "paid" ? "Betald" : "Ej betald"}
          </span>
        </div>

      </div>
    </div>
  );
}
