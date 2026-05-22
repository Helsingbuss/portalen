import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Customer = {
  id: string;
  customer_type?: string | null;
  status?: string | null;

  name: string;
  company_name?: string | null;
  org_number?: string | null;

  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;

  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;

  customer_source?: string | null;
  tags?: string[] | null;

  notes?: string | null;

  total_revenue?: number | null;
  bookings_count?: number | null;
  offers_count?: number | null;

  created_at?: string | null;
};

const EMPTY_FORM = {
  customer_type: "private",
  status: "active",

  name: "",
  company_name: "",
  org_number: "",

  contact_person: "",
  email: "",
  phone: "",

  address: "",
  postal_code: "",
  city: "",
  country: "Sverige",

  customer_source: "",
  tags: "",

  notes: "",
};

function typeLabel(value?: string | null) {
  if (value === "private") return "Privatkund";
  if (value === "company") return "Företag";
  if (value === "association") return "Förening";
  if (value === "school") return "Skola";
  if (value === "municipality") return "Kommun";
  return value || "—";
}

function statusLabel(value?: string | null) {
  if (value === "active") return "Aktiv";
  if (value === "inactive") return "Inaktiv";
  if (value === "lead") return "Lead";
  if (value === "vip") return "VIP";
  return value || "—";
}

function statusClass(value?: string | null) {
  if (value === "active") return "bg-green-100 text-green-700";
  if (value === "vip") return "bg-purple-100 text-purple-700";
  if (value === "lead") return "bg-amber-100 text-amber-700";
  if (value === "inactive") return "bg-red-100 text-red-700";

  return "bg-gray-100 text-gray-700";
}

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.set("q", search.trim());
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const query = params.toString();

      const res = await fetch(
        `/api/admin/customers${query ? `?${query}` : ""}`
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta kunder.");
      }

      setCustomers(json.customers || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSavedMessage("");
  }

  async function saveCustomer() {
    try {
      setSaving(true);
      setError("");
      setSavedMessage("");

      const displayName =
        form.name ||
        form.company_name ||
        form.contact_person;

      if (!displayName.trim()) {
        throw new Error("Kundnamn saknas.");
      }

      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          name: displayName,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa kund.");
      }

      setForm(EMPTY_FORM);
      setSavedMessage("Kunden sparades ✔");
      await loadCustomers();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: customers.length,
      companies: customers.filter((c) => c.customer_type === "company").length,
      privateCustomers: customers.filter((c) => c.customer_type === "private")
        .length,
      revenue: customers.reduce(
        (sum, c) => sum + Number(c.total_revenue || 0),
        0
      ),
    };
  }, [customers]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Kundregister
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Samla kunder, företag, föreningar och kontaktuppgifter på ett
                ställe.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/customers/avtal"
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
              >
                Avtal & priser
              </Link>

              <Link
                href="/admin/customers/kontakter"
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
              >
                Kontakter & notiser
              </Link>

              <Link
                href="/admin/customers/kommunikation"
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
              >
                Kommunikation
              </Link>

              <button
                onClick={loadCustomers}
                className="rounded-full bg-[#194C66] px-4 py-2 text-sm font-semibold text-white"
              >
                Uppdatera
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat title="Kunder" value={stats.total} />
            <Stat title="Företag" value={stats.companies} />
            <Stat title="Privatkunder" value={stats.privateCustomers} />
            <Stat title="Omsättning" value={money(stats.revenue)} />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {savedMessage && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {savedMessage}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Lägg till kund
              </h2>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Kundtyp">
                    <select
                      value={form.customer_type}
                      onChange={(e) =>
                        update("customer_type", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="private">Privatkund</option>
                      <option value="company">Företag</option>
                      <option value="association">Förening</option>
                      <option value="school">Skola</option>
                      <option value="municipality">Kommun</option>
                    </select>
                  </Field>

                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) => update("status", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="active">Aktiv</option>
                      <option value="lead">Lead</option>
                      <option value="vip">VIP</option>
                      <option value="inactive">Inaktiv</option>
                    </select>
                  </Field>
                </div>

                <Field label="Kundnamn">
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Ex. Anna Svensson eller AB Företag"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Företag / organisation">
                  <input
                    value={form.company_name}
                    onChange={(e) => update("company_name", e.target.value)}
                    placeholder="Företagsnamn, förening eller skola"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Org.nr">
                    <input
                      value={form.org_number}
                      onChange={(e) => update("org_number", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Kontaktperson">
                    <input
                      value={form.contact_person}
                      onChange={(e) => update("contact_person", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="E-post">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Telefon">
                    <input
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Adress">
                  <input
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Postnummer">
                    <input
                      value={form.postal_code}
                      onChange={(e) => update("postal_code", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Ort">
                    <input
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Källa">
                  <input
                    value={form.customer_source}
                    onChange={(e) => update("customer_source", e.target.value)}
                    placeholder="Ex. offert, hemsida, telefon, partner"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Taggar">
                  <input
                    value={form.tags}
                    onChange={(e) => update("tags", e.target.value)}
                    placeholder="VIP, företag, återkommande"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Anteckningar">
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <button
                  onClick={saveCustomer}
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white hover:bg-[#163b4d] disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Spara kund"}
                </button>
              </div>
            </section>

            <section className="rounded-3xl bg-white shadow">
              <div className="border-b p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-[#194C66]">
                    Alla kunder
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") loadCustomers();
                      }}
                      placeholder="Sök kund..."
                      className="rounded-full border px-4 py-2 text-sm"
                    />

                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="rounded-full border px-4 py-2 text-sm"
                    >
                      <option value="all">Alla typer</option>
                      <option value="private">Privat</option>
                      <option value="company">Företag</option>
                      <option value="association">Förening</option>
                      <option value="school">Skola</option>
                      <option value="municipality">Kommun</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-full border px-4 py-2 text-sm"
                    >
                      <option value="all">Alla statusar</option>
                      <option value="active">Aktiv</option>
                      <option value="lead">Lead</option>
                      <option value="vip">VIP</option>
                      <option value="inactive">Inaktiv</option>
                    </select>

                    <button
                      onClick={loadCustomers}
                      className="rounded-full bg-[#194C66] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Sök
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-gray-500">
                  Laddar kunder...
                </div>
              ) : customers.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  Inga kunder hittades.
                </div>
              ) : (
                <div className="divide-y">
                  {customers.map((customer) => (
                    <div key={customer.id} className="p-5 hover:bg-[#f8fafc]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-[#0f172a]">
                              {customer.name}
                            </h3>

                            <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]">
                              {typeLabel(customer.customer_type)}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                customer.status
                              )}`}
                            >
                              {statusLabel(customer.status)}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-gray-500">
                            {customer.company_name || "—"}
                            {customer.org_number
                              ? ` · Org.nr ${customer.org_number}`
                              : ""}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              {customer.email || "Ingen e-post"}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              {customer.phone || "Inget telefonnummer"}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              {customer.city || "Ingen ort"}
                            </span>
                          </div>

                          {customer.tags && customer.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {customer.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-gray-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            Omsättning
                          </div>

                          <div className="font-bold text-[#194C66]">
                            {money(customer.total_revenue)}
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            {customer.bookings_count || 0} bokningar ·{" "}
                            {customer.offers_count || 0} offerter
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-[#194C66]">{label}</div>
      {children}
    </label>
  );
}
