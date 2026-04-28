import { useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import FlygbussModal from "@/components/store/FlygbussModal";

const products = [
  {
    id: 1,
    name: "Flygbuss Helsingborg → Kastrup",
    price: 199,
    type: "flygbuss",
    image:
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Ullared Shoppingresa",
    price: 699,
    type: "resa",
    image:
      "https://images.unsplash.com/photo-1521334884684-d80222895322?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Liseberg Sommarresa",
    price: 599,
    type: "resa",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
  },
];

export default function StoreCheckout() {
  const [cart, setCart] = useState<any[]>([]);
  const [qtyMap, setQtyMap] = useState<{ [key: number]: number }>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showFlygbuss, setShowFlygbuss] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [loading, setLoading] = useState(false);

  function addToCart(product: any) {
    setCart([product]);
    setQtyMap({ [product.id]: 1 });
  }

  function updateQty(id: number, value: number) {
    setQtyMap((prev) => ({
      ...prev,
      [id]: value < 1 ? 1 : value,
    }));
  }

  const total = cart.reduce((sum, item) => {
    const qty = item.qty || qtyMap[item.id] || 1;
    return sum + item.price * qty;
  }, 0);

  async function handlePayment() {
    try {
      if (!cart.length) return alert("Välj en resa först");
      if (!name || !email) {
        return alert("Fyll i namn och e-post");
      }

      setLoading(true);

      const product = cart[0];
      const bookingId = "HB-" + Date.now();

      const payload = {
        id: bookingId,
        customerName: name,
        customerEmail: email,

        productName: product.name,
        type: product.type || "resa",

        date: product.date || null,
        stop: product.stop || null,

        price: product.price,
        qty: product.qty || qtyMap[product.id] || 1,
        total: total,

        ticketType: product.ticketType || "enkel",
      };

      console.log("📦 Payload:", payload);

      const res = await fetch("/api/payments/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ API ERROR:", text);
        alert("Serverfel – kolla console");
        setLoading(false);
        return;
      }

      const data = await res.json();

      console.log("✅ API RESPONSE:", data);

      if (!data?.paymentLink) {
        alert("Fel vid skapande av betalningslänk");
        setLoading(false);
        return;
      }

      setPaymentLink(data.paymentLink);
      setLoading(false);

    } catch (err) {
      console.error("💥 JS ERROR:", err);
      alert("Något gick fel");
      setLoading(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24 grid lg:grid-cols-3 gap-6">

          {/* PRODUKTER */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-[#194C66]">
              Välj resa
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    if (p.type === "flygbuss") {
                      setShowFlygbuss(true);
                    } else {
                      addToCart(p);
                    }
                  }}
                  className={`rounded-xl shadow cursor-pointer overflow-hidden transition hover:scale-[1.02] ${
                    cart[0]?.id === p.id
                      ? "ring-2 ring-[#194C66]"
                      : "bg-white"
                  }`}
                >
                  <img src={p.image} className="w-full h-32 object-cover" />

                  <div className="p-3">
                    <h3 className="text-sm font-semibold">{p.name}</h3>
                    <p className="text-[#194C66] font-semibold mt-1">
                      {p.price} kr
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KASSA */}
          <div className="bg-white p-4 rounded-xl shadow space-y-4 h-fit">

            <h2 className="font-semibold text-[#194C66]">Kassa</h2>

            {cart.length === 0 && (
              <p className="text-sm text-gray-500">
                Välj en resa till vänster
              </p>
            )}

            {cart.map((item) => {
              const qty = item.qty || qtyMap[item.id] || 1;

              return (
                <div key={item.id} className="space-y-2">
                  <p className="text-sm font-medium">{item.name}</p>

                  {item.date && (
                    <p className="text-xs text-gray-500">
                      Datum: {item.date}
                    </p>
                  )}

                  {item.stop && (
                    <p className="text-xs text-gray-500">
                      Påstigning: {item.stop}
                    </p>
                  )}

                  <div className="flex justify-between items-center">
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) =>
                        updateQty(item.id, Number(e.target.value))
                      }
                      className="w-16 border rounded px-2 py-1"
                    />
                    <span className="text-sm">
                      {item.price * qty} kr
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Totalt</span>
              <span>{total} kr</span>
            </div>

            <div className="space-y-2">
              <input
                placeholder="Namn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              <input
                placeholder="E-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-[#194C66] text-white py-3 rounded-full disabled:opacity-50"
            >
              {loading
                ? "Skapar..."
                : `Skapa betalningslänk (${total} kr)`}
            </button>

            {paymentLink && (
              <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                <p className="font-medium">Betalningslänk:</p>

                <input
                  value={paymentLink}
                  readOnly
                  className="w-full border rounded px-2 py-1"
                />

                <button
                  onClick={() =>
                    navigator.clipboard.writeText(paymentLink)
                  }
                  className="text-xs text-[#194C66]"
                >
                  Kopiera länk
                </button>
              </div>
            )}

          </div>
        </main>
      </div>

      <FlygbussModal
        open={showFlygbuss}
        onClose={() => setShowFlygbuss(false)}
        onAdd={(data: any) => {
          setCart([data]);
          setShowFlygbuss(false);
        }}
      />
    </>
  );
}
