import { useEffect, useMemo, useState } from "react";
import SupplierRegisterPrintActions from "../economy/SupplierRegisterPrintActions";


type Props = {
  invoice: any;
  setInvoice: any;
};

export default function SupplierRegisterPicker({ invoice, setInvoice }: Props) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const [loading, setLoading] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedSupplier = useMemo(() => {
    return suppliers.find((supplier) => supplier.id === selectedId) || null;
  }, [suppliers, selectedId]);

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/leverantorer");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta leverantörsregister.");
      }

      setSuppliers(json.suppliers || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta leverantörsregister.");
    } finally {
      setLoading(false);
    }
  }

  function applySupplier(supplier: any) {
    if (!supplier) return;

    setInvoice((prev: any) => ({
      ...prev,
      supplier_type: supplier.supplier_type || prev.supplier_type || "supplier",
      supplier_name: supplier.supplier_name || prev.supplier_name || "",
      supplier_email: supplier.email || prev.supplier_email || "",
      supplier_phone: supplier.phone || prev.supplier_phone || "",
      supplier_org_number: supplier.org_number || prev.supplier_org_number || "",
      supplier_address: supplier.address || prev.supplier_address || "",
      supplier_zip: supplier.zip || prev.supplier_zip || "",
      supplier_city: supplier.city || prev.supplier_city || "",
      supplier_country: supplier.country || prev.supplier_country || "Sverige",
      bankgiro: supplier.bankgiro || prev.bankgiro || "",
      iban: supplier.iban || prev.iban || "",
      bic: supplier.bic || prev.bic || "",
      swish_number: supplier.swish_number || prev.swish_number || "",
      default_cost_account: supplier.default_cost_account || prev.default_cost_account || "4010",
      default_vat_account: supplier.default_vat_account || prev.default_vat_account || "2641",
    }));

    setMessage("Leverantörsuppgifter fylldes i från leverantörsregistret.");
  }

  async function saveCurrentAsSupplier() {
    const name = String(invoice?.supplier_name || "").trim();

    if (!name) {
      setError("Fyll i leverantörsnamn först.");
      return;
    }

    const ok = window.confirm("Vill du spara " + name + " i leverantörsregistret?");

    if (!ok) return;

    try {
      setSavingSupplier(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/leverantorer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplier_type: invoice.supplier_type || "supplier",
          supplier_name: invoice.supplier_name,
          org_number: invoice.supplier_org_number,
          contact_name: invoice.contact_name,
          email: invoice.supplier_email,
          phone: invoice.supplier_phone,
          address: invoice.supplier_address,
          zip: invoice.supplier_zip,
          city: invoice.supplier_city,
          country: invoice.supplier_country || "Sverige",
          bankgiro: invoice.bankgiro,
          iban: invoice.iban,
          bic: invoice.bic,
          swish_number: invoice.swish_number,
          default_cost_account: invoice.default_cost_account || "4010",
          default_vat_account: invoice.default_vat_account || "2641",
          notes: "Skapad från leverantörsfaktura.",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara leverantören.");
      }

      setMessage("Leverantören sparades i leverantörsregistret.");
      await loadSuppliers();

      if (json.supplier?.id) {
        setSelectedId(json.supplier.id);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara leverantören.");
    } finally {
      setSavingSupplier(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#194C66]">Koppla leverantörsregister</h2>
          <p className="mt-1 text-sm text-slate-500">
            Välj en sparad leverantör för att fylla i fakturauppgifter automatiskt.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadSuppliers}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50 disabled:opacity-60"
          >
            Ladda om leverantörer
          </button>

          <button
            type="button"
            onClick={saveCurrentAsSupplier}
            disabled={savingSupplier}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            Spara som ny leverantör
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Välj leverantör
          </label>

          <select
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              const supplier = suppliers.find((item) => item.id === event.target.value);
              applySupplier(supplier);
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
          >
            <option value="">Välj leverantör från register</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.supplier_name}
                {supplier.email ? " · " + supplier.email : ""}
                {supplier.bankgiro ? " · BG " + supplier.bankgiro : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => applySupplier(selectedSupplier)}
          disabled={!selectedSupplier}
          className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
        >
          Fyll i från leverantör
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
