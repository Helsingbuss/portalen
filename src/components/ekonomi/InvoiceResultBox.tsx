import { useEffect, useState } from "react";

type Props = {
  invoiceId: string;
};

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function statusLabel(status?: string) {
  if (status === "minus") return "Minus";
  if (status === "low") return "Lågt resultat";
  return "Bra resultat";
}

function statusClass(status?: string) {
  if (status === "minus") return "border-red-200 bg-red-50 text-red-700";
  if (status === "low") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function supplierStatusLabel(status?: string) {
  switch (status) {
    case "paid": return "Betald";
    case "received": return "Mottagen";
    case "approved": return "Godkänd";
    case "unpaid": return "Obetald";
    case "overdue": return "Förfallen";
    default: return status || "Status";
  }
}

export default function InvoiceResultBox({ invoiceId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadResult() {
    if (!invoiceId) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/fakturor/" + encodeURIComponent(invoiceId) + "/resultat");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta resultat.");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta resultat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Laddar resultat för uppdraget...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 shadow-sm">
        {error}
      </section>
    );
  }

  if (data?.needsSetup) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
        Leverantörsreskontra behöver vara skapad innan resultat per uppdrag kan visas.
      </section>
    );
  }

  const result = data?.result;

  if (!result) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#194C66]">Resultat på uppdraget</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kundfaktura minus kopplade leverantörs- och samarbetsfakturor.
          </p>
        </div>

        <span className={"rounded-full border px-4 py-2 text-sm font-bold " + statusClass(result.status)}>
          {statusLabel(result.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <ResultCard label="Intäkt exkl. moms" value={fmtMoney(result.revenueExVat)} />
        <ResultCard label="Kostnad exkl. moms" value={fmtMoney(result.costExVat)} />
        <ResultCard
          label="Resultat exkl. moms"
          value={fmtMoney(result.resultExVat)}
          strong
          negative={result.resultExVat < 0}
        />
        <ResultCard label="Marginal" value={(result.marginPercent || 0) + " %"} strong />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SmallInfo label="Kopplade leverantörsfakturor" value={result.supplierCount + " st"} />
        <SmallInfo label="Betalda kostnader inkl. moms" value={fmtMoney(result.paidCosts)} />
        <SmallInfo label="Obetalda kostnader inkl. moms" value={fmtMoney(result.unpaidCosts)} />
      </div>

      {data.supplierInvoices?.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Leverantör</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Fakt.nr</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Exkl. moms</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Totalt</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Öppna</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.supplierInvoices.map((supplier: any) => (
                <tr key={supplier.id} className="align-top">
                  <td className="px-4 py-3 font-semibold text-[#194C66]">{supplier.supplier_name}</td>
                  <td className="px-4 py-3">{supplier.supplier_invoice_number || "—"}</td>
                  <td className="px-4 py-3">{supplierStatusLabel(supplier.status)}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(supplier.subtotal_excl_vat)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmtMoney(supplier.total_amount)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={"/admin/ekonomi/leverantorsreskontra/" + encodeURIComponent(supplier.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                    >
                      Öppna
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Inga leverantörs- eller samarbetsfakturor är kopplade till denna kundfaktura ännu.
        </div>
      )}
    </section>
  );
}

function ResultCard({
  label,
  value,
  strong,
  negative,
}: {
  label: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className={"mt-2 text-xl font-black " + (negative ? "text-red-700" : strong ? "text-[#194C66]" : "text-slate-900")}>
        {value}
      </div>
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-bold text-[#194C66]">{value}</div>
    </div>
  );
}
