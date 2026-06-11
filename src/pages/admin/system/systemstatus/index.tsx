import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function SystemstatusPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/system/systemstatus");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta systemstatus.");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta systemstatus.");
    } finally {
      setLoading(false);
    }
  }

  const healthText = useMemo(() => {
    if (!data?.summary) return "Kontrollerar...";

    if ((data.summary.missingChecks || 0) > 0) {
      return "Vissa inställningar saknas";
    }

    if ((data.summary.warningChecks || 0) > 0) {
      return "Systemet fungerar med varningar";
    }

    return "Systemet ser bra ut";
  }, [data]);

  useEffect(() => {
    loadData();
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
                  System / inställningar · Status
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Systemstatus & integrationer
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Kontrollera databasen, Supabase, e-post, SMS, betalning och viktiga miljövariabler.
                </p>
              </div>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
              >
                Uppdatera status
              </button>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-500">Samlad status</div>
                  <div className="mt-2 text-2xl font-black text-[#194C66]">{healthText}</div>
                  <div className="mt-2 text-sm text-slate-500">
                    Senast kontrollerad: {formatDate(data?.checkedAt)}
                  </div>
                </div>

                <StatusBadge status={(data?.summary?.missingChecks || 0) > 0 ? "missing" : (data?.summary?.warningChecks || 0) > 0 ? "warning" : "ok"} />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Kontroller" value={data?.summary?.totalChecks || 0} />
              <SummaryCard label="OK" value={data?.summary?.okChecks || 0} tone="green" />
              <SummaryCard label="Varningar" value={data?.summary?.warningChecks || 0} tone="amber" />
              <SummaryCard label="Saknas" value={data?.summary?.missingChecks || 0} tone="red" />
            </section>

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                Kontrollerar systemstatus...
              </section>
            ) : (
              <>
                <section className="grid gap-6 xl:grid-cols-2">
                  <Card title="Integrationer">
                    <div className="space-y-3">
                      {(data?.integrations || []).map((item: any) => (
                        <StatusRow
                          key={item.key}
                          title={item.name}
                          description={item.description}
                          status={item.status}
                        />
                      ))}
                    </div>
                  </Card>

                  <Card title="Miljövariabler">
                    <div className="space-y-3">
                      {(data?.envChecks || []).map((item: any) => (
                        <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-bold text-[#194C66]">{item.label}</div>
                              <div className="mt-1 text-sm leading-6 text-slate-600">{item.description}</div>
                            </div>

                            <StatusBadge status={item.ok ? "ok" : "missing"} />
                          </div>

                          <div className="mt-3 space-y-1">
                            {(item.keys || []).map((key: any) => (
                              <div key={key.key} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs">
                                <span className="font-semibold text-slate-600">{key.key}</span>
                                <span className={key.exists ? "font-bold text-emerald-700" : "font-bold text-red-700"}>
                                  {key.exists ? key.preview || "Finns" : "Saknas"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>

                <Card title="Databastabeller">
                  {(data?.tables || []).length === 0 ? (
                    <div className="text-sm text-slate-500">Inga databastabeller kontrollerades.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <Th>Tabell</Th>
                            <Th>Status</Th>
                            <Th>Rader</Th>
                            <Th>Meddelande</Th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {(data?.tables || []).map((table: any) => (
                            <tr key={table.table} className="align-top transition hover:bg-slate-50">
                              <Td className="font-bold text-[#194C66]">{table.table}</Td>
                              <Td>
                                <StatusBadge status={table.ok ? "ok" : "warning"} />
                              </Td>
                              <Td>{table.count ?? 0}</Td>
                              <Td>{table.message || "—"}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card title="Snabb rekommendation">
                  <div className="grid gap-4 md:grid-cols-3">
                    <TipCard
                      title="Saknas något?"
                      text="Fyll i saknade API-nycklar i .env.local och starta om servern."
                    />
                    <TipCard
                      title="Tabellvarningar?"
                      text="Varningar kan vara okej om modulen inte används ännu."
                    />
                    <TipCard
                      title="Efter ändring"
                      text="Kör npx tsc --noEmit och starta om npm run dev."
                    />
                  </div>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("sv-SE");
}

function StatusBadge({ status }: { status: "ok" | "warning" | "missing" | string }) {
  const cls =
    status === "ok"
      ? "bg-emerald-100 text-emerald-700"
      : status === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  const label =
    status === "ok"
      ? "OK"
      : status === "warning"
        ? "Varning"
        : "Saknas";

  return <span className={"whitespace-nowrap rounded-full px-3 py-1 text-xs font-black " + cls}>{label}</span>;
}

function StatusRow({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-bold text-[#194C66]">{title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">{description}</div>
        </div>

        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "amber" | "red";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TipCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-bold text-[#194C66]">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
