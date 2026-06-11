import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function RollerBehorigheterPage() {
  const [summary, setSummary] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/system/roller-behorigheter");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta roller och behörigheter.");
      }

      setSummary(json.summary || {});
      setUsers(json.users || []);
      setRoles(json.roleTemplates || []);
      setWarnings(json.warnings || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta roller och behörigheter.");
    } finally {
      setLoading(false);
    }
  }

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
                  System / inställningar · Användare
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Roller & behörigheter
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Öppna en person för att tilldela roll och behörigheter.
                </p>
              </div>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
              >
                Uppdatera
              </button>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {warnings.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                <strong>Info:</strong> Vissa möjliga användar-/rolltabeller finns inte ännu. Det är okej i version 1.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Användare" value={summary.users || 0} />
              <SummaryCard label="Aktiva" value={summary.activeUsers || 0} tone="green" />
              <SummaryCard label="Rollmallar" value={summary.roleTemplates || 0} />
              <SummaryCard label="Tilldelade roller" value={summary.assignedRoles || 0} />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Rollmallar</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {roles.map((role) => (
                  <div key={role.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-lg font-black text-[#194C66]">{role.name}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{role.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold text-[#194C66]">Användare</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Klicka på Öppna för att ändra roll och behörighet.
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Laddar användare...
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Inga användare hittades ännu.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1000px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Namn</Th>
                        <Th>E-post</Th>
                        <Th>Roll</Th>
                        <Th>Status</Th>
                        <Th>Behörigheter</Th>
                        <Th>Senast aktiv</Th>
                        <Th>Källa</Th>
                        <Th>Åtgärd</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {users.map((user, index) => (
                        <tr key={user.id || index} className="align-top transition hover:bg-slate-50">
                          <Td className="font-bold text-[#194C66]">{user.name || "Okänd användare"}</Td>
                          <Td>{user.email || "—"}</Td>
                          <Td>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {user.role || "Ej angiven"}
                            </span>
                          </Td>
                          <Td>
                            <span className={user.status === "Aktiv" ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"}>
                              {user.status || "Okänd"}
                            </span>
                          </Td>
                          <Td>{Array.isArray(user.permissions) ? user.permissions.length : 0} st</Td>
                          <Td>{user.last_seen || "—"}</Td>
                          <Td>{user.source || "—"}</Td>
                          <Td>
                            <a
                              href={user.href}
                              className="rounded-lg bg-[#194C66] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#12384c]"
                            >
                              Öppna
                            </a>
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

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "green";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
