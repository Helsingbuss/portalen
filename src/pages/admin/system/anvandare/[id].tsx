import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function AnvandareDetaljPage() {
  const router = useRouter();
  const id = useMemo(() => {
    const raw = router.query.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [router.query.id]);

  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissionsList, setPermissionsList] = useState<any[]>([]);
  const [roleKey, setRoleKey] = useState("read_only");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function loadData() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/anvandare/" + encodeURIComponent(String(id)));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta användaren.");
      }

      setUser(json.user || null);
      setRoles(json.roleTemplates || []);
      setPermissionsList(json.allPermissions || []);
      setRoleKey(json.user?.role_key || "read_only");
      setPermissions(json.user?.permissions || []);
      setIsActive(json.user?.is_active !== false);
      setNote(json.user?.note || "");
      setWarnings(json.warnings || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta användaren.");
    } finally {
      setLoading(false);
    }
  }

  async function saveData() {
    if (!id) return;

    try {
      setSaving(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/anvandare/" + encodeURIComponent(String(id)), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role_key: roleKey,
          permissions,
          is_active: isActive,
          note,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara behörighet.");
      }

      setSaved("Behörigheten är sparad.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara behörighet.");
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(key: string) {
    setPermissions((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }

      return [...current, key];
    });
  }

  function applyRoleTemplate(nextRole: string) {
    setRoleKey(nextRole);

    const role = roles.find((item) => item.key === nextRole);

    if (role?.permissions) {
      setPermissions(role.permissions);
    }
  }

  useEffect(() => {
    loadData();
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
                  System / inställningar · Användare
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Öppna användare
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Ändra roll, status och extra behörigheter för personen.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/admin/system/roller-behorigheter"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </a>

                <button
                  type="button"
                  onClick={saveData}
                  disabled={saving || loading}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara behörighet"}
                </button>
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {saved && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 shadow-sm">
                {saved}
              </section>
            )}

            {warnings.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                <strong>Info:</strong> Vissa möjliga profiltabeller finns inte. Det är okej om användaren kommer från Supabase Auth.
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                Laddar användare...
              </section>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard label="Namn" value={user?.name || "Okänd"} />
                  <SummaryCard label="E-post" value={user?.email || "—"} />
                  <SummaryCard label="Nuvarande roll" value={user?.role || "Ej angiven"} />
                  <SummaryCard label="Status" value={isActive ? "Aktiv" : "Inaktiv"} tone={isActive ? "green" : "amber"} />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Behörighet</h2>

                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Roll
                      </label>

                      <select
                        value={roleKey}
                        onChange={(event) => applyRoleTemplate(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                      >
                        {roles.map((role) => (
                          <option key={role.key} value={role.key}>
                            {role.name}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        När du väljer roll fylls standardbehörigheter i automatiskt. Du kan sedan justera kryssen manuellt.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </label>

                      <button
                        type="button"
                        onClick={() => setIsActive(!isActive)}
                        className={isActive ? "mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-700" : "mt-2 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-700"}
                      >
                        {isActive ? "Aktiv användare" : "Inaktiv användare"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Extra behörigheter
                    </label>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {permissionsList.map((permission) => (
                        <button
                          key={permission.key}
                          type="button"
                          onClick={() => togglePermission(permission.key)}
                          className={
                            permissions.includes(permission.key)
                              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-700"
                              : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50"
                          }
                        >
                          {permissions.includes(permission.key) ? "✓ " : ""}
                          {permission.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Intern notering
                    </label>

                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                      placeholder="Exempel: Ska endast ha tillgång till ekonomi och rapporter."
                    />
                  </div>
                </section>
              </>
            )}
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
  tone?: "green" | "amber";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 break-words text-xl font-black">{value}</div>
    </div>
  );
}
