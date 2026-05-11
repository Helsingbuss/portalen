import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import FlygbussModal from "@/components/store/FlygbussModal";
import SeatMap, { SeatMapSeat } from "@/components/sundra/SeatMap";

type SundraTrip = {
  id: string;
  title: string;
  slug: string;
  image_url?: string | null;
  price_from?: number | null;
  currency?: string | null;
  short_description?: string | null;
  destination?: string | null;
  next_departure?: {
    id: string;
    departure_date?: string | null;
    departure_time?: string | null;
    price?: number | null;
    seats_left?: number | null;
  } | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  type: "flygbuss" | "sundra" | "resa";
  image?: string;
  tripId?: string;
  departureId?: string;
  departureDate?: string | null;
  departureTime?: string | null;
  seatsLeft?: number | null;
  description?: string | null;
};

const staticProducts: Product[] = [
  {
    id: "flygbuss-kastrup",
    name: "Flygbuss Helsingborg → Kastrup",
    price: 199,
    type: "flygbuss",
    image:
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=1200&auto=format&fit=crop",
  },
];

function money(n?: number | null) {
  const safe = Number(n || 0);
  return safe.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function fmtDate(date?: string | null) {
  if (!date) return "Datum saknas";
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

export default function StoreCheckout() {
  const [sundraTrips, setSundraTrips] = useState<Product[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  const [cart, setCart] = useState<Product[]>([]);
  const [qtyMap, setQtyMap] = useState<{ [key: string]: number }>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [discountCode, setDiscountCode] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [discountData, setDiscountData] = useState<any>(null);

  const [seatLoading, setSeatLoading] = useState(false);
  const [seatError, setSeatError] = useState("");
  const [seatMapName, setSeatMapName] = useState("");
  const [seats, setSeats] = useState<SeatMapSeat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const [showFlygbuss, setShowFlygbuss] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedProduct = cart[0] || null;
  const selectedQty = selectedProduct ? qtyMap[selectedProduct.id] || 1 : 1;

  useEffect(() => {
    loadSundraTrips();
  }, []);

  useEffect(() => {
    if (selectedProduct?.type === "sundra" && selectedProduct.departureId) {
      loadSeats(selectedProduct.departureId);
    } else {
      setSeats([]);
      setSelectedSeats([]);
      setSeatMapName("");
      setSeatError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.departureId]);

  async function loadSundraTrips() {
    try {
      setLoadingTrips(true);

      const res = await fetch("/api/public/sundra/trips?type=all");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta Sundra-resor.");
      }

      const mapped: Product[] = (json.trips || []).map((trip: SundraTrip) => {
        const dep = trip.next_departure;
        const price = Number(dep?.price || trip.price_from || 0);

        return {
          id: `sundra-${trip.id}`,
          name: trip.title,
          price,
          type: "sundra",
          image: trip.image_url || undefined,
          tripId: trip.id,
          departureId: dep?.id,
          departureDate: dep?.departure_date,
          departureTime: dep?.departure_time,
          seatsLeft: dep?.seats_left,
          description: trip.short_description || trip.destination || null,
        };
      });

      setSundraTrips(mapped);
    } catch (e) {
      console.error(e);
      setSundraTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  }

  async function loadSeats(departureId: string) {
    try {
      setSeatLoading(true);
      setSeatError("");
      setSeats([]);
      setSelectedSeats([]);

      const res = await fetch(`/api/public/sundra/departures/${departureId}/seats`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta platskarta.");
      }

      setSeatMapName(json.bus_map?.name || "");
      setSeats(json.seats || []);
    } catch (e: any) {
      setSeatError(e?.message || "Kunde inte hämta säten.");
      setSeats([]);
      setSeatMapName("");
    } finally {
      setSeatLoading(false);
    }
  }

  const products = useMemo(() => {
    return [...staticProducts, ...sundraTrips];
  }, [sundraTrips]);

  function resetCheckoutExtra() {
    setPaymentLink("");
    setDiscountData(null);
    setDiscountError("");
    setDiscountCode("");
    setSelectedSeats([]);
    setSeats([]);
    setSeatMapName("");
    setSeatError("");
  }

  function addToCart(product: Product) {
    resetCheckoutExtra();
    setCart([product]);
    setQtyMap({ [product.id]: 1 });
  }

  function updateQty(id: string, value: number) {
    setPaymentLink("");
    setDiscountData(null);
    setDiscountError("");

    const nextQty = value < 1 ? 1 : value;

    setQtyMap((prev) => ({
      ...prev,
      [id]: nextQty,
    }));

    setSelectedSeats((prev) => prev.slice(0, nextQty));
  }

  function toggleSeat(seat: SeatMapSeat) {
    setPaymentLink("");

    setSelectedSeats((prev) => {
      const exists = prev.includes(seat.seat_number);

      if (exists) {
        return prev.filter((s) => s !== seat.seat_number);
      }

      if (prev.length >= selectedQty) {
        alert(`Du kan bara välja ${selectedQty} plats(er).`);
        return prev;
      }

      return [...prev, seat.seat_number];
    });
  }

  const baseTotal = cart.reduce((sum, item) => {
    const qty = qtyMap[item.id] || 1;
    return sum + item.price * qty;
  }, 0);

  const selectedSeatObjects = useMemo(() => {
    return seats.filter((seat) => selectedSeats.includes(seat.seat_number));
  }, [seats, selectedSeats]);

  const seatExtraTotal = selectedSeatObjects.reduce(
    (sum, seat) => sum + Number(seat.seat_price || 0),
    0
  );

  const totalBeforeDiscount = baseTotal + seatExtraTotal;

  const discountAmount = Number(discountData?.discount_amount || 0);
  const totalAfterDiscount = Math.max(0, totalBeforeDiscount - discountAmount);

  async function applyDiscount() {
    try {
      setDiscountLoading(true);
      setDiscountError("");
      setDiscountData(null);

      if (!cart.length) {
        throw new Error("Välj en produkt först.");
      }

      if (!discountCode.trim()) {
        throw new Error("Fyll i rabattkod.");
      }

      const product = cart[0];

      const res = await fetch("/api/public/sundra/campaigns/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: discountCode,
          trip_id: product.tripId || null,
          subtotal: totalBeforeDiscount,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Rabattkoden kunde inte användas.");
      }

      setDiscountData(json);
    } catch (e: any) {
      setDiscountError(e?.message || "Fel vid rabattkod.");
    } finally {
      setDiscountLoading(false);
    }
  }

  async function handlePayment() {
    try {
      if (!cart.length) return alert("Välj en resa först");
      if (!name || !email || !phone) {
        return alert("Fyll i namn, e-post och telefon");
      }

      setLoading(true);
      setPaymentLink("");

      const product = cart[0];
      const qty = qtyMap[product.id] || 1;

      if (product.type === "sundra") {
        if (!product.tripId || !product.departureId) {
          alert("Denna Sundra-resa saknar bokningsbar avgång.");
          setLoading(false);
          return;
        }

        if (seats.length > 0 && selectedSeats.length > 0 && selectedSeats.length !== qty) {
          alert(`Du har valt ${selectedSeats.length} säte(n), men antal resenärer är ${qty}.`);
          setLoading(false);
          return;
        }

        const [firstName, ...lastParts] = name.trim().split(" ");
        const lastName = lastParts.join(" ") || "";

        const passengers = Array.from({ length: qty }).map((_, index) => {
          const seatNumber = selectedSeats[index] || "";
          const seat = seats.find((s) => s.seat_number === seatNumber);

          return {
            first_name: index === 0 ? firstName : "",
            last_name: index === 0 ? lastName : "",
            passenger_type: "adult",
            date_of_birth: "",
            special_requests: "",
            seat_number: seatNumber || null,
            seat_price: Number(seat?.seat_price || 0),
          };
        });

        const res = await fetch("/api/public/sundra/bookings/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trip_id: product.tripId,
            departure_id: product.departureId,

            passengers_count: qty,
            passengers,

            customer_name: name,
            customer_email: email,
            customer_phone: phone,
            customer_address: null,

            notes: [
              "Skapad via Butik/Kassa i portalen.",
              selectedSeats.length ? `Valda säten: ${selectedSeats.join(", ")}` : "",
            ]
              .filter(Boolean)
              .join("\n"),

            subtotal: baseTotal,
            seat_extra_total: seatExtraTotal,
            discount_code: discountData?.campaign?.code || null,
            discount_amount: discountAmount,
            total_amount: totalAfterDiscount,
            currency: "SEK",
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Kunde inte skapa Sundra-bokning.");
        }

        const link =
          data.checkout_url ||
          data.payment_url ||
          data.redirect_url ||
          "";

        if (!link) {
          throw new Error("Ingen betalningslänk skapades.");
        }

        const fullLink = link.startsWith("http")
          ? link
          : `${window.location.origin}${link}`;

        setPaymentLink(fullLink);
        setLoading(false);
        return;
      }

      const bookingId = "HB-" + Date.now();

      const payload = {
        id: bookingId,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,

        productName: product.name,
        type: product.type || "resa",

        date: product.departureDate || null,
        stop: null,

        price: product.price,
        qty,
        subtotal: baseTotal,
        seatExtraTotal,
        selectedSeats,
        discountCode: discountData?.campaign?.code || null,
        discountAmount,
        total: totalAfterDiscount,

        ticketType: "enkel",
      };

      const res = await fetch("/api/payments/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Serverfel vid betalning.");
      }

      if (!data?.paymentLink) {
        throw new Error("Fel vid skapande av betalningslänk.");
      }

      setPaymentLink(data.paymentLink);
      setLoading(false);
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert(err?.message || "Något gick fel");
      setLoading(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="grid gap-6 p-6 pt-24 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-[#194C66]">
                  Butik / Kassa
                </h1>
                <p className="text-sm text-[#194C66]/60">
                  Välj produkt, skapa bokning och skicka betalningslänk.
                </p>
              </div>

              <button
                onClick={loadSundraTrips}
                className="rounded-full border bg-white px-4 py-2 text-sm text-[#194C66]"
              >
                Uppdatera resor
              </button>
            </div>

            <section className="rounded-2xl bg-white p-5 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Flygbuss
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {staticProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    active={cart[0]?.id === p.id}
                    onClick={() => setShowFlygbuss(true)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Sundra resor
                </h2>

                {loadingTrips && (
                  <span className="text-sm text-gray-500">Laddar...</span>
                )}
              </div>

              {sundraTrips.length === 0 && !loadingTrips ? (
                <div className="mt-4 rounded-xl border bg-[#f8fafc] p-4 text-sm text-gray-500">
                  Inga publicerade Sundra-resor hittades.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {sundraTrips.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      active={cart[0]?.id === p.id}
                      onClick={() => addToCart(p)}
                    />
                  ))}
                </div>
              )}
            </section>

            {selectedProduct?.type === "sundra" && selectedProduct.departureId && (
              <section className="rounded-2xl bg-white p-5 shadow">
                {seatLoading ? (
                  <div className="text-sm text-gray-500">Laddar platskarta...</div>
                ) : seatError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    {seatError}
                  </div>
                ) : seats.length === 0 ? (
                  <div className="rounded-xl border bg-[#f8fafc] p-4 text-sm text-gray-500">
                    Ingen platskarta är kopplad till denna avgång.
                  </div>
                ) : (
                  <SeatMap
                    seats={seats}
                    selectedSeats={selectedSeats}
                    maxSelectable={selectedQty}
                    showLegend
                    showSummary={false}
                    title="Välj plats"
                    subtitle={`${seatMapName || "Platskarta"} · välj ${selectedQty} plats(er) eller lämna tomt för automatisk placering.`}
                    onSeatClick={toggleSeat}
                  />
                )}
              </section>
            )}
          </div>

          <aside className="h-fit rounded-2xl bg-white p-5 shadow">
            <h2 className="font-semibold text-[#194C66]">Kassa</h2>

            {cart.length === 0 && (
              <p className="mt-3 text-sm text-gray-500">
                Välj en resa till vänster.
              </p>
            )}

            <div className="mt-4 space-y-4">
              {cart.map((item) => {
                const qty = qtyMap[item.id] || 1;

                return (
                  <div key={item.id} className="rounded-xl border p-3">
                    <p className="text-sm font-semibold">{item.name}</p>

                    {item.departureDate && (
                      <p className="mt-1 text-xs text-gray-500">
                        Datum: {fmtDate(item.departureDate)}{" "}
                        {fmtTime(item.departureTime)}
                      </p>
                    )}

                    {typeof item.seatsLeft === "number" && (
                      <p className="mt-1 text-xs text-gray-500">
                        Platser kvar: {item.seatsLeft}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <input
                        type="number"
                        min={1}
                        max={item.seatsLeft || 99}
                        value={qty}
                        onChange={(e) =>
                          updateQty(item.id, Number(e.target.value))
                        }
                        className="w-20 rounded border px-2 py-1"
                      />

                      <span className="text-sm font-semibold">
                        {money(item.price * qty)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedSeats.length > 0 && (
              <div className="mt-4 rounded-xl border border-[#b7e7df] bg-[#eafaf7] p-3 text-sm">
                <p className="font-semibold text-[#006b5b]">Valda säten</p>
                <p className="mt-1 text-[#006b5b]">
                  {selectedSeats.join(", ")}
                </p>

                {seatExtraTotal > 0 && (
                  <p className="mt-1 text-xs text-[#006b5b]">
                    Extra sätespris: {money(seatExtraTotal)}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 rounded-xl border bg-[#f8fafc] p-3">
              <p className="mb-2 text-sm font-semibold text-[#194C66]">
                Rabattkod
              </p>

              <div className="flex gap-2">
                <input
                  placeholder="Ex. SOMMAR100"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    setDiscountData(null);
                    setDiscountError("");
                    setPaymentLink("");
                  }}
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm uppercase"
                />

                <button
                  type="button"
                  onClick={applyDiscount}
                  disabled={discountLoading || cart.length === 0}
                  className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {discountLoading ? "Kollar..." : "Aktivera"}
                </button>
              </div>

              {discountError && (
                <p className="mt-2 text-xs text-red-600">{discountError}</p>
              )}

              {discountData?.ok && (
                <p className="mt-2 text-xs text-green-700">
                  Rabattkod {discountData.campaign.code} aktiverad: -
                  {money(discountAmount)}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t pt-3">
              <div className="flex justify-between text-sm">
                <span>Delsumma</span>
                <span>{money(baseTotal)}</span>
              </div>

              {seatExtraTotal > 0 && (
                <div className="flex justify-between text-sm text-[#194C66]">
                  <span>Sätesval</span>
                  <span>{money(seatExtraTotal)}</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Rabatt</span>
                  <span>-{money(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between font-semibold">
                <span>Totalt</span>
                <span>{money(totalAfterDiscount)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <input
                placeholder="Namn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              />

              <input
                placeholder="E-post"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              />

              <input
                placeholder="Telefon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <button
              onClick={handlePayment}
              disabled={loading || cart.length === 0}
              className="mt-4 w-full rounded-full bg-[#194C66] py-3 font-medium text-white disabled:opacity-50"
            >
              {loading
                ? "Skapar..."
                : `Skapa betalningslänk (${money(totalAfterDiscount)})`}
            </button>

            {paymentLink && (
              <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
                <p className="font-medium">Betalningslänk:</p>

                <input
                  value={paymentLink}
                  readOnly
                  className="w-full rounded border px-2 py-1"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => navigator.clipboard.writeText(paymentLink)}
                    className="text-xs font-semibold text-[#194C66]"
                  >
                    Kopiera länk
                  </button>

                  <a
                    href={paymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[#194C66]"
                  >
                    Öppna
                  </a>
                </div>
              </div>
            )}
          </aside>
        </main>
      </div>

      <FlygbussModal
        open={showFlygbuss}
        onClose={() => setShowFlygbuss(false)}
        onAdd={(data: any) => {
          const product: Product = {
            id: `flygbuss-${Date.now()}`,
            name: data.name || data.productName || "Flygbuss",
            price: Number(data.price || 199),
            type: "flygbuss",
            image: data.image,
            departureDate: data.date || null,
          };

          resetCheckoutExtra();

          setCart([product]);
          setQtyMap({ [product.id]: data.qty || 1 });
          setShowFlygbuss(false);
        }}
      />
    </>
  );
}

function ProductCard({
  product,
  active,
  onClick,
}: {
  product: Product;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`overflow-hidden rounded-xl text-left shadow transition hover:scale-[1.02] ${
        active ? "ring-2 ring-[#194C66]" : "bg-white"
      }`}
    >
      {product.image ? (
        <img src={product.image} className="h-32 w-full object-cover" />
      ) : (
        <div className="flex h-32 items-center justify-center bg-[#e5eef3] text-sm text-[#194C66]/60">
          Ingen bild
        </div>
      )}

      <div className="p-3">
        <div className="mb-1 inline-flex rounded-full bg-[#eef5f9] px-2 py-1 text-[11px] font-semibold text-[#194C66]">
          {product.type === "sundra" ? "Sundra" : "Flygbuss"}
        </div>

        <h3 className="text-sm font-semibold text-[#0f172a]">
          {product.name}
        </h3>

        {product.description && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
            {product.description}
          </p>
        )}

        {product.departureDate && (
          <p className="mt-2 text-xs text-gray-500">
            {fmtDate(product.departureDate)} {fmtTime(product.departureTime)}
          </p>
        )}

        <p className="mt-2 font-semibold text-[#194C66]">
          {money(product.price)}
        </p>
      </div>
    </button>
  );
}
