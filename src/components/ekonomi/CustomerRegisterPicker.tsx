import { useEffect, useMemo, useState } from "react";

type Props = {
  invoice: any;
  setInvoice: any;
};

function addDays(dateValue: string, days: number) {
  if (!dateValue || !days) return "";

  const date = new Date(dateValue + "T00:00:00");

  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

export default function CustomerRegisterPicker({ invoice, setInvoice }: Props) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const [loading, setLoading] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === selectedId) || null;
  }, [customers, selectedId]);

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/kunder");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta kundregister.");
      }

      setCustomers(json.customers || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta kundregister.");
    } finally {
      setLoading(false);
    }
  }

  function applyCustomer(customer: any) {
    if (!customer) return;

    setInvoice((prev: any) => {
      const paymentTermsDays = Number(customer.payment_terms_days || prev.payment_terms_days || 10);
      const invoiceDate = prev.invoice_date || new Date().toISOString().slice(0, 10);
      const calculatedDueDate = addDays(invoiceDate, paymentTermsDays);

      return {
        ...prev,
        customer_name: customer.customer_name || prev.customer_name || "",
        customer_email: customer.email || prev.customer_email || "",
        customer_phone: customer.phone || prev.customer_phone || "",
        customer_org_number: customer.org_number || prev.customer_org_number || "",
        customer_address: customer.address || prev.customer_address || "",
        customer_zip: customer.zip || prev.customer_zip || "",
        customer_city: customer.city || prev.customer_city || "",
        customer_country: customer.country || prev.customer_country || "Sverige",
        your_reference: customer.invoice_reference || prev.your_reference || "",
        payment_terms_days: paymentTermsDays,
        due_date: prev.due_date || calculatedDueDate || prev.due_date,
      };
    });

    setMessage("Kunduppgifter fylldes i från kundregistret.");
  }

  async function saveCurrentAsCustomer() {
    const name = String(invoice?.customer_name || "").trim();

    if (!name) {
      setError("Fyll i kundnamn först.");
      return;
    }

    const ok = window.confirm("Vill du spara " + name + " i kundregistret?");

    if (!ok) return;

    try {
      setSavingCustomer(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/kunder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_type: "company",
          customer_name: invoice.customer_name,
          org_number: invoice.customer_org_number,
          contact_name: invoice.your_reference,
          email: invoice.customer_email,
          phone: invoice.customer_phone,
          address: invoice.customer_address,
          zip: invoice.customer_zip,
          city: invoice.customer_city,
          country: invoice.customer_country || "Sverige",
          invoice_reference: invoice.your_reference,
          payment_terms_days: invoice.payment_terms_days || 10,
          notes: "Skapad från kundfaktura.",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara kunden.");
      }

      setMessage("Kunden sparades i kundregistret.");
      await loadCustomers();

      if (json.customer?.id) {
        setSelectedId(json.customer.id);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara kunden.");
    } finally {
      setSavingCustomer(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#194C66]">Koppla kundregister</h2>
          <p className="mt-1 text-sm text-slate-500">
            Välj en sparad kund för att fylla i fakturauppgifter automatiskt.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadCustomers}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50 disabled:opacity-60"
          >
            Ladda om kunder
          </button>

          <button
            type="button"
            onClick={saveCurrentAsCustomer}
            disabled={savingCustomer}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            Spara som ny kund
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Välj kund
          </label>

          <select
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              const customer = customers.find((item) => item.id === event.target.value);
              applyCustomer(customer);
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
          >
            <option value="">Välj kund från register</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customer_name}
                {customer.email ? " · " + customer.email : ""}
                {customer.city ? " · " + customer.city : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => applyCustomer(selectedCustomer)}
          disabled={!selectedCustomer}
          className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
        >
          Fyll i från kund
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
    </section>
  );
}
