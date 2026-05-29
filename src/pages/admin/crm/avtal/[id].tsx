import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type AgreementRow = {
  id: string;
  agreement_number?: string | null;
  title?: string | null;
  customer_name?: string | null;
  company_name?: string | null;
  org_number?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  agreement_type?: string | null;
  status?: string | null;
  discount_percent?: number | null;
  fixed_price?: number | null;
  currency?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(String(date) + "T00:00:00"));
  } catch {
    return date;
  }
}

function fmtMoney(value?: number | null, currency = "SEK") {
  const amount = Number(value || 0);

  if (!amount) return "—";

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: currency || "SEK",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Aktivt";
    case "draft":
      return "Utkast";
    case "expired":
      return "Utgånget";
    case "paused":
      return "Pausat";
    case "cancelled":
      return "Avslutat";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "expired":
      return "bg-amber-100 text-amber-700";
    case "paused":
      return "bg-blue-100 text-blue-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function typeLabel(type?: string | null) {
  switch (type) {
    case "company":
      return "Företagsavtal";
    case "association":
      return "Föreningsavtal";
    case "agent":
      return "Agentavtal";
    case "framework":
      return "Ramavtal";
    case "customer_price":
      return "Kundpris";
    default:
      return type || "Avtal";
  }
}

export default function CrmAvtalDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [agreement, setAgreement] = useState<AgreementRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAgreement() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/crm/avtal/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta avtalet.");
      }

      setAgreement(json.agreement);
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgreement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
                  CRM
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Öppna avtal
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här ser du avtalsinformation, kunduppgifter, priser och villkor.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/crm/avtal"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                {agreement && (
                  <Link
                    href={"/admin/crm/avtal/" + encodeURIComponent(agreement.id) + "/redigera"}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                  >
                    Redigera
                  </Link>
                )}
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                {error}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar avtal...
              </section>
            ) : agreement ? (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {agreement.agreement_number || "Avtal"}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {agreement.title || agreement.company_name || agreement.customer_name || "Avtal"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {typeLabel(agreement.agreement_type)}
                      </p>
                    </div>

                    <span
                      className={
                        "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                        statusClass(agreement.status)
                      }
                    >
                      {statusLabel(agreement.status)}
                    </span>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-3">
                  <InfoCard title="Kund / företag">
                    <InfoRow label="Företag" value={agreement.company_name || "—"} />
                    <InfoRow label="Kundnamn" value={agreement.customer_name || "—"} />
                    <InfoRow label="Org.nr" value={agreement.org_number || "—"} />
                  </InfoCard>

                  <InfoCard title="Kontakt">
                    <InfoRow label="Kontaktperson" value={agreement.contact_person || "—"} />
                    <InfoRow label="E-post" value={agreement.email || "—"} />
                    <InfoRow label="Telefon" value={agreement.phone || "—"} />
                  </InfoCard>

                  <InfoCard title="Pris / villkor">
                    <InfoRow
                      label="Rabatt"
                      value={agreement.discount_percent ? agreement.discount_percent + "% rabatt" : "—"}
                    />
                    <InfoRow
                      label="Fast pris"
                      value={fmtMoney(agreement.fixed_price, agreement.currency || "SEK")}
                    />
                    <InfoRow
                      label="Giltighet"
                      value={fmtDate(agreement.valid_from) + " – " + fmtDate(agreement.valid_until)}
                    />
                  </InfoCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <TextCard title="Anteckningar" value={agreement.notes || "Inga anteckningar ännu."} />
                  <TextCard title="Villkor" value={agreement.terms || "Inga villkor angivna ännu."} />
                </section>
              </>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Avtalet hittades inte.
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function TextCard({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
        {value}
      </p>
    </section>
  );
}
