import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Article = Record<string, any>;

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function unitLabel(value?: string | null) {
  switch (value) {
    case "st":
      return "Styck";
    case "h":
      return "Timme";
    case "dag":
      return "Dag";
    case "km":
      return "Km";
    case "resa":
      return "Resa";
    default:
      return value || "Styck";
  }
}

export default function EkonomiArtiklarPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    groups: 0,
    stockItems: 0,
  });

  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  async function loadArticles() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (group) params.set("group", group);
      if (includeInactive) params.set("includeInactive", "true");

      const res = await fetch("/api/admin/ekonomi/artiklar?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta artiklar.");
      }

      setArticles(json.articles || []);
      setGroups(json.groups || []);
      setSummary(json.summary || summary);
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta artiklar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countText = useMemo(() => {
    const count = articles.length;
    return count + " av " + (summary.total || count) + " poster visas";
  }, [articles.length, summary.total]);

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
                  Artiklar
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Artikelregister för fakturor. Här lägger du upp tjänster, avgifter och färdiga rader som kan användas på kundfakturor.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadArticles}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>

                <a
                  href="/admin/ekonomi/artiklar/ny"
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  Ny artikel
                </a>
              </div>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellen <strong>finance_articles</strong> saknas. Kör SQL-koden för Artiklar först.
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Totalt" value={summary.total} />
              <SummaryCard label="Aktiva" value={summary.active} tone="green" />
              <SummaryCard label="Inaktiva" value={summary.inactive} tone="amber" />
              <SummaryCard label="Grupper" value={summary.groups} tone="blue" />
              <SummaryCard label="Lagerartiklar" value={summary.stockItems} tone="slate" />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[360px_1fr_auto]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sök</label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Sök artikel..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />

                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={includeInactive}
                      onChange={(event) => setIncludeInactive(event.target.checked)}
                    />
                    Visa även inaktiva poster
                  </label>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Artikelgrupper</label>
                  <select
                    value={group}
                    onChange={(event) => setGroup(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  >
                    <option value="">Alla grupper</option>
                    {groups.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadArticles}
                    className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
                  <thead className="bg-white text-slate-900">
                    <tr className="border-b border-slate-200">
                      <Th>Artikelnr.</Th>
                      <Th>Artikelnamn</Th>
                      <Th>Artikelgrupp</Th>
                      <Th>Enhet</Th>
                      <Th>Pris exkl. moms</Th>
                      <Th>Pris inkl. moms</Th>
                      <Th>Moms</Th>
                      <Th>Ant. i lager</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                          Laddar artiklar...
                        </td>
                      </tr>
                    ) : articles.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                          Inga artiklar hittades.
                        </td>
                      </tr>
                    ) : (
                      articles.map((article) => (
                        <tr
                          key={article.id}
                          onClick={() => {
                            window.location.href = "/admin/ekonomi/artiklar/" + encodeURIComponent(article.id);
                          }}
                          className="cursor-pointer align-top transition hover:bg-slate-50"
                        >
                          <Td>
                            <span className="font-semibold text-blue-700 underline">
                              {article.article_number || "—"}
                            </span>
                          </Td>
                          <Td>
                            <div className="font-semibold text-slate-900">{article.article_name}</div>
                            {article.notes && (
                              <div className="mt-1 max-w-[360px] truncate text-xs text-slate-500">{article.notes}</div>
                            )}
                          </Td>
                          <Td>{article.article_group || "—"}</Td>
                          <Td>{unitLabel(article.unit)}</Td>
                          <Td>{fmtMoney(article.price_excl_vat)}</Td>
                          <Td>{fmtMoney(article.price_incl_vat)}</Td>
                          <Td>{article.vat_percent || 0} %</Td>
                          <Td>{article.is_stock_item ? Number(article.stock_quantity || 0) : "—"}</Td>
                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + (article.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                              {article.is_active ? "Aktiv" : "Inaktiv"}
                            </span>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-5 py-4 text-right text-sm text-slate-600">
                {countText}
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "amber" | "blue" | "slate";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50"
        : tone === "blue"
          ? "text-blue-700 bg-blue-50"
          : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
