// src/pages/admin/customers/index.tsx
import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

/* TYPES */
type Customer = {
  email: string;
  name: string;
  phone: string;
  company?: string;
  bookings: number;
  total_spent: number;
  last_activity: string;
};

function formatKr(v: number) {
  return new Intl.NumberFormat("sv-SE").format(v || 0);
}

/* STATUS LOGIK */
function getCustomerStatus(c: Customer) {
  if (c.bookings >= 10 || c.total_spent > 100000)
    return { label: "VIP", color: "bg-purple-100 text-purple-700" };

  if (c.bookings >= 3)
    return { label: "Återkommande", color: "bg-blue-100 text-blue-700" };

  return { label: "Ny", color: "bg-gray-100 text-gray-700" };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /* FETCH */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/customers/list");
        const data = await res.json();
        setCustomers(data?.rows || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* FILTER */
  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  /* KPI */
  const totalCustomers = customers.length;
  const vipCount = customers.filter((c) => getCustomerStatus(c).label === "VIP").length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 space-y-6">

          {/* HEADER */}
          <div>
            <h1 className="text-xl font-semibold text-[#194C66]">
              Kunder (CRM)
            </h1>
            <p className="text-sm text-[#194C66]/70">
              Hantera kunder, relationer och rabatter
            </p>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-3 gap-4">
            <Card label="Totala kunder" value={totalCustomers} />
            <Card label="VIP kunder" value={vipCount} />
            <Card label="Omsättning" value={`${formatKr(totalRevenue)} kr`} />
          </div>

          {/* SEARCH */}
          <div className="bg-white rounded-xl shadow p-4">
            <input
              placeholder="Sök kund (namn, email, telefon)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl shadow p-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[#194C66]/70 text-left">
                <tr>
                  <th className="py-2">Kund</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th>Bokningar</th>
                  <th>Omsättning</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody className="text-[#194C66]">
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-4">
                      Laddar...
                    </td>
                  </tr>
                )}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4">
                      Inga kunder hittades
                    </td>
                  </tr>
                )}

                {filtered.map((c, i) => {
                  const status = getCustomerStatus(c);

                  return (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="py-2">
                        <div className="font-semibold">
                          {c.name || "—"}
                        </div>
                        <div className="text-xs text-[#194C66]/60">
                          {c.company || ""}
                        </div>
                      </td>

                      <td>{c.email}</td>
                      <td>{c.phone}</td>
                      <td>{c.bookings}</td>
                      <td>{formatKr(c.total_spent)} kr</td>

                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                          {status.label}
                        </span>
                      </td>

                      <td>
                        <a
                          href={`/admin/customers/${encodeURIComponent(c.email)}`}
                          className="underline text-sm"
                        >
                          Öppna
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </main>
      </div>
    </>
  );
}

/* KPI CARD */
function Card({ label, value }: any) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-xs text-[#194C66]/60">{label}</div>
      <div className="text-lg font-semibold text-[#194C66]">{value}</div>
    </div>
  );
}
