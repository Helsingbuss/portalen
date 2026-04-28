import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Customer = {
  email: string;
  name: string;
  phone: string;
  company?: string;
  discount?: number;
  notes?: string;
  bookings: number;
  total_spent: number;
};

export default function CustomerPage() {
  const router = useRouter();
  const { id } = router.query;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const email =
    typeof id === "string" ? decodeURIComponent(id) : null;

  useEffect(() => {
    if (!email) return;

    (async () => {
      const res = await fetch(
        `/api/customers/get?email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      setCustomer(data.customer);
      setLoading(false);
    })();
  }, [email]);

  async function save() {
    if (!customer) return;

    setSaving(true);

    await fetch("/api/customers/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customer),
    });

    setSaving(false);
    alert("Sparat!");
  }

  if (loading) return <div>Laddar...</div>;
  if (!customer) return <div>Ingen kund</div>;

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 space-y-6">

          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-[#194C66]">
              {customer.name || "Kund"}
            </h1>

            <button
              onClick={save}
              className="bg-[#194C66] text-white px-4 py-2 rounded-full"
            >
              {saving ? "Sparar..." : "Spara"}
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">

            {/* INFO */}
            <Card title="Kundinformation">
              <Input label="Namn" value={customer.name}
                onChange={(v)=>setCustomer({...customer, name:v})} />

              <Input label="Email" value={customer.email} disabled />

              <Input label="Telefon" value={customer.phone}
                onChange={(v)=>setCustomer({...customer, phone:v})} />

              <Input label="Företag" value={customer.company || ""}
                onChange={(v)=>setCustomer({...customer, company:v})} />
            </Card>

            {/* AFFÄR */}
            <Card title="Affär & rabatt">
              <Input
                label="Rabatt (%)"
                value={customer.discount || 0}
                onChange={(v)=>setCustomer({...customer, discount:Number(v)})}
              />

              <div className="text-sm mt-2">
                <b>Bokningar:</b> {customer.bookings}
              </div>

              <div className="text-sm">
                <b>Omsättning:</b> {customer.total_spent} kr
              </div>
            </Card>

          </div>

          {/* NOTES */}
          <Card title="Noteringar">
            <textarea
              value={customer.notes || ""}
              onChange={(e)=>setCustomer({...customer, notes:e.target.value})}
              className="w-full border rounded p-2 min-h-[120px]"
            />
          </Card>

        </main>
      </div>
    </>
  );
}

/* UI */
function Card({ title, children }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow space-y-2">
      <h2 className="font-semibold text-[#194C66]">{title}</h2>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, disabled }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm">{label}</span>
      <input
        disabled={disabled}
        value={value}
        onChange={(e)=>onChange?.(e.target.value)}
        className="border rounded px-2 py-1 w-40 text-right"
      />
    </div>
  );
}
