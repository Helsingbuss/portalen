import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const emptyCustomer = {
  customer_type: "company",
  customer_name: "",
  org_number: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  zip: "",
  city: "",
  country: "Sverige",
  invoice_reference: "",
  payment_terms_days: "10",
  notes: "",
  is_active: true,
};

export default function KundregisterPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyCustomer);
  const [editingId, setEditingId] = useState("");

  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateForm(key: string, value: any) {
    setForm((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyCustomer);
    setEditingId("");
  }

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (showArchived) params.set("archived", "true");

      const res = await fetch("/api/admin/ekonomi/kunder?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta kundregistret.");
      }

      setCustomers(json.customers || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta kundregistret.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCustomer(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/kunder", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          id: editingId || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara kunden.");
      }

      setMessage(editingId ? "Kunden uppdaterades." : "Kunden skapades.");
      resetForm();
      await loadCustomers();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara kunden.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveCustomer(customer: any) {
    const ok = window.confirm("Vill du arkivera kunden " + customer.customer_name + "?");

    if (!ok) return;

    try {
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/kunder", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: customer.id,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte arkivera kunden.");
      }

      setMessage("Kunden arkiverades.");
      await loadCustomers();
    } catch (err: any) {
      setError(err?.message || "Kunde inte arkivera kunden.");
    }
  }

  function editCustomer(customer: any) {
    setEditingId(customer.id);
    setForm({
      ...emptyCustomer,
      ...customer,
      payment_terms_days: String(customer.payment_terms_days || 10),
      is_active: customer.is_active !== false,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Kundregister
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Spara kunduppgifter som kan användas i fakturor, offerter och framtida bokningar.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="/admin/ekonomi/fakturor" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50">
                  Kundfakturor
                </a>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  Ny kund
                </button>
              </div>
            </div>

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 shadow-sm">
                {message}
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            <form onSubmit={saveCustomer} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    {editingId ? "Redigera kund" : "Ny kund"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Fyll i de uppgifter du har. Allt behöver inte vara komplett från början.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : editingId ? "Spara ändringar" : "Skapa kund"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <SelectField
                  label="Kundtyp"
                  value={form.customer_type}
                  onChange={(value) => updateForm("customer_type", value)}
                  options={[
                    ["company", "Företag"],
                    ["private", "Privatperson"],
                    ["association", "Förening"],
                    ["municipality", "Kommun/offentlig"],
                    ["other", "Övrigt"],
                  ]}
                />

                <Field label="Kundnamn" value={form.customer_name} onChange={(value) => updateForm("customer_name", value)} />
                <Field label="Org.nr/personnr" value={form.org_number} onChange={(value) => updateForm("org_number", value)} />
                <Field label="Kontaktperson" value={form.contact_name} onChange={(value) => updateForm("contact_name", value)} />
                <Field label="E-post" value={form.email} onChange={(value) => updateForm("email", value)} />
                <Field label="Telefon" value={form.phone} onChange={(value) => updateForm("phone", value)} />
                <Field label="Adress" value={form.address} onChange={(value) => updateForm("address", value)} />
                <Field label="Postnummer" value={form.zip} onChange={(value) => updateForm("zip", value)} />
                <Field label="Ort" value={form.city} onChange={(value) => updateForm("city", value)} />
                <Field label="Land" value={form.country} onChange={(value) => updateForm("country", value)} />
                <Field label="Fakturareferens" value={form.invoice_reference} onChange={(value) => updateForm("invoice_reference", value)} />
                <Field label="Betalningsvillkor dagar" value={form.payment_terms_days} onChange={(value) => updateForm("payment_terms_days", value)} />
              </div>

              <Textarea label="Anteckning" value={form.notes} onChange={(value) => updateForm("notes", value)} />
            </form>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Sök
                    </label>
                    <input
                      value={q}
                      onChange={(event) => setQ(event.target.value)}
                      placeholder="Sök kund, e-post, org.nr, ort..."
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                    />
                  </div>

                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(event) => setShowArchived(event.target.checked)}
                    />
                    Visa arkiverade
                  </label>

                  <button
                    type="button"
                    onClick={loadCustomers}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Filtrera
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Laddar kunder...</div>
              ) : customers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Inga kunder hittades.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1150px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Kund</Th>
                        <Th>Typ</Th>
                        <Th>Kontakt</Th>
                        <Th>E-post</Th>
                        <Th>Telefon</Th>
                        <Th>Ort</Th>
                        <Th>Villkor</Th>
                        <Th>Status</Th>
                        <Th>Åtgärd</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">{customer.customer_name}</div>
                            <div className="mt-1 text-xs text-slate-500">{customer.org_number || ""}</div>
                          </Td>
                          <Td>{customer.customer_type || "—"}</Td>
                          <Td>{customer.contact_name || "—"}</Td>
                          <Td>{customer.email || "—"}</Td>
                          <Td>{customer.phone || "—"}</Td>
                          <Td>{customer.city || "—"}</Td>
                          <Td>{customer.payment_terms_days || 10} dagar</Td>
                          <Td>{customer.is_active === false ? "Arkiverad" : "Aktiv"}</Td>
                          <Td>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => editCustomer(customer)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                              >
                                Redigera
                              </button>

                              {customer.is_active !== false && (
                                <button
                                  type="button"
                                  onClick={() => archiveCustomer(customer)}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                                >
                                  Arkivera
                                </button>
                              )}
                            </div>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: any; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: any; onChange: (value: string) => void }) {
  return (
    <div className="mt-5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
