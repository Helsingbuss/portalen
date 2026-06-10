import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Offer = Record<string, any>;

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function FakturaFranOffertPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState("");
  const [error, setError] = useState("");

  async function loadOffers() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch("/api/admin/ekonomi/fakturor/offers?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta offerter.");
      }

      setOffers(json.offers || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta offerter.");
    } finally {
      setLoading(false);
    }
  }

  async function createInvoice(offer: Offer) {
    try {
      setCreatingId(offer.id);
      setError("");

      const res = await fetch("/api/admin/ekonomi/fakturor/from-offer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: offer.id,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa faktura.");
      }

      if (json.invoice?.id) {
        window.location.href = "/admin/ekonomi/fakturor/" + encodeURIComponent(json.invoice.id);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa faktura.");
    } finally {
      setCreatingId("");
    }
  }

  useEffect(() => {
    loadOffers();
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
                  Skapa faktura från offert
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Välj en offert från Supabase-tabellen offers. Kunduppgifter, resa och pris förs över till en ny faktura.
                </p>
              </div>

              <a
                href="/admin/ekonomi/fakturor"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
              >
                Till fakturor
              </a>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök offert
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Sök kund, e-post, datum, adress..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadOffers}
                    className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Sök
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
                  <thead className="bg-white text-slate-900">
                    <tr className="border-b border-slate-200">
                      <Th>Kund</Th>
                      <Th>E-post</Th>
                      <Th>Datum</Th>
                      <Th>Från</Th>
                      <Th>Till</Th>
                      <Th>Passagerare</Th>
                      <Th>Pris</Th>
                      <Th>Status</Th>
                      <Th>Åtgärd</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                          Laddar offerter...
                        </td>
                      </tr>
                    ) : offers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                          Inga offerter hittades.
                        </td>
                      </tr>
                    ) : (
                      offers.map((offer) => (
                        <tr key={offer.id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">{offer.customerName}</div>
                            <div className="mt-1 text-xs text-slate-500">{offer.reference}</div>
                          </Td>
                          <Td>{offer.email || "—"}</Td>
                          <Td>{fmtDate(offer.date)} {offer.time || ""}</Td>
                          <Td>{offer.from || "—"}</Td>
                          <Td>{offer.to || "—"}</Td>
                          <Td>{offer.passengers || "—"}</Td>
                          <Td className="font-bold">{fmtMoney(offer.price)}</Td>
                          <Td>{offer.status || "—"}</Td>
                          <Td>
                            <button
                              type="button"
                              onClick={() => createInvoice(offer)}
                              disabled={creatingId === offer.id}
                              className="rounded-lg bg-[#00645d] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {creatingId === offer.id ? "Skapar..." : "Skapa faktura"}
                            </button>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-5 py-4 text-right text-sm text-slate-600">
                {offers.length} offerter visas
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
