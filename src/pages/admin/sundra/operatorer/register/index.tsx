// src/pages/admin/sundra/operatorer/register/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/sundra/Topbar";
import { Sidebar } from "@/components/sundra/Sidebar";
import { operatorRepo, type OperatorRecord } from "@/lib/sundra/operators/repo.client";

type Draft = {
  id?: string;
  name: string;
  short_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  logo_url: string;
  notes: string;
  is_active: boolean;
};

function toDraft(o?: OperatorRecord | null): Draft {
  return {
    id: o?.id,
    name: o?.name ?? "",
    short_name: o?.short_name ?? "",
    contact_name: o?.contact_name ?? "",
    contact_email: o?.contact_email ?? "",
    contact_phone: o?.contact_phone ?? "",
    website: o?.website ?? "",
    logo_url: o?.logo_url ?? "",
    notes: o?.notes ?? "",
    is_active: o?.is_active ?? true,
  };
}

export default function AdminOperatorsRegisterPage() {
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("true");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<OperatorRecord[]>([]);

  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      // ✅ FIX: operatorRepo.list finns inte -> listOperators finns
      const data = await operatorRepo.listOperators({ q, active: activeFilter });
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte hämta operatörer.");
    } finally {
      setLoading(false);
    }
  }

  // liten debounce på sök
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, activeFilter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => {
    if (!editing?.id) return null;
    return items.find((x) => x.id === editing.id) ?? null;
  }, [editing?.id, items]);

  async function save() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      setErr("Namn måste fyllas i.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const payload = {
        name,
        short_name: editing.short_name.trim() || null,
        contact_name: editing.contact_name.trim() || null,
        contact_email: editing.contact_email.trim() || null,
        contact_phone: editing.contact_phone.trim() || null,
        website: editing.website.trim() || null,
        logo_url: editing.logo_url.trim() || null,
        notes: editing.notes || null,
        is_active: !!editing.is_active,
      };

      if (editing.id) {
        // ✅ FIX: update finns inte -> updateOperator finns
        await operatorRepo.updateOperator(editing.id, payload as any);
      } else {
        // ✅ FIX: create finns inte -> createOperator finns
        await operatorRepo.createOperator(payload as any);
      }

      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte spara.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    const ok = window.confirm("Inaktivera operatören? (Rekommenderas istället för radering)");
    if (!ok) return;

    try {
      setErr(null);

      // ✅ FIX: deactivate finns inte i repo-typen.
      // Inaktivera via updateOperator istället.
      await operatorRepo.updateOperator(id, { is_active: false } as any);

      if (editing?.id === id) setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Kunde inte inaktivera.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6 md:pl-[18rem]">
          <div className="mx-auto max-w-[1100px]">
            <div className="mb-4">
              <div className="text-2xl font-semibold text-gray-900">Operatörer (Register)</div>
              <div className="mt-1 text-sm text-gray-600">
                Lägg in bussbolag/operatörer som kan kopplas till avgångar (”vem som kör”).
              </div>
            </div>

            {err ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            {/* Filter */}
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_200px]">
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
                <div className="text-xs font-semibold text-gray-500">Sök</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Sök på namn, kortnamn, kontakt…"
                  className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </div>

              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
                <div className="text-xs font-semibold text-gray-500">Status</div>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as any)}
                  className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2"
                >
                  <option value="true">Aktiva</option>
                  <option value="false">Inaktiva</option>
                  <option value="all">Alla</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setEditing(toDraft(null))}
                  className="w-full rounded-2xl bg-[var(--hb-primary,#0B2A44)] px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
                >
                  + Ny operatör
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
              {/* Lista */}
              <div className="rounded-2xl border bg-white shadow-sm">
                <div className="border-b px-4 py-3">
                  <div className="text-sm font-semibold text-gray-900">
                    Operatörer {loading ? "• Hämtar…" : `• ${items.length}`}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500">
                        <th className="px-4 py-3">Namn</th>
                        <th className="px-4 py-3">Kontakt</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Åtgärd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-gray-600" colSpan={4}>
                            Inga operatörer ännu.
                          </td>
                        </tr>
                      ) : (
                        items.map((o) => {
                          const isSelected = editing?.id === o.id;
                          return (
                            <tr key={o.id} className={isSelected ? "bg-gray-50" : ""}>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900">{o.name}</div>
                                {o.short_name ? (
                                  <div className="text-xs text-gray-600">{o.short_name}</div>
                                ) : null}
                              </td>

                              <td className="px-4 py-3">
                                <div className="text-gray-900">{o.contact_name ?? "—"}</div>
                                <div className="text-xs text-gray-600">{o.contact_email ?? "—"}</div>
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={[
                                    "inline-flex rounded-full border px-2 py-1 text-xs font-semibold",
                                    o.is_active
                                      ? "border-green-200 bg-green-50 text-green-800"
                                      : "border-gray-200 bg-gray-100 text-gray-700",
                                  ].join(" ")}
                                >
                                  {o.is_active ? "Aktiv" : "Inaktiv"}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                                    onClick={() => setEditing(toDraft(o))}
                                  >
                                    Redigera
                                  </button>
                                  {o.is_active ? (
                                    <button
                                      className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                                      onClick={() => deactivate(o.id)}
                                    >
                                      Inaktivera
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Editor */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  {editing?.id ? "Redigera operatör" : "Ny operatör"}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  Kopplas till avgångar som “vem som kör”. Vi visar alltid namn, och senare även logga.
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500">Namn *</label>
                    <input
                      value={editing?.name ?? ""}
                      onChange={(e) =>
                        setEditing((d) => ({ ...(d ?? toDraft(null)), name: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                      placeholder="Bergkvara Buss"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500">Kortnamn</label>
                    <input
                      value={editing?.short_name ?? ""}
                      onChange={(e) =>
                        setEditing((d) => ({ ...(d ?? toDraft(null)), short_name: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                      placeholder="Bergkvara"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Kontaktperson</label>
                      <input
                        value={editing?.contact_name ?? ""}
                        onChange={(e) =>
                          setEditing((d) => ({
                            ...(d ?? toDraft(null)),
                            contact_name: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Telefon</label>
                      <input
                        value={editing?.contact_phone ?? ""}
                        onChange={(e) =>
                          setEditing((d) => ({
                            ...(d ?? toDraft(null)),
                            contact_phone: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500">E-post</label>
                    <input
                      value={editing?.contact_email ?? ""}
                      onChange={(e) =>
                        setEditing((d) => ({
                          ...(d ?? toDraft(null)),
                          contact_email: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Webbplats</label>
                      <input
                        value={editing?.website ?? ""}
                        onChange={(e) =>
                          setEditing((d) => ({ ...(d ?? toDraft(null)), website: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500">Logo URL (valfritt)</label>
                      <input
                        value={editing?.logo_url ?? ""}
                        onChange={(e) =>
                          setEditing((d) => ({ ...(d ?? toDraft(null)), logo_url: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500">Anteckningar</label>
                    <textarea
                      value={editing?.notes ?? ""}
                      onChange={(e) =>
                        setEditing((d) => ({ ...(d ?? toDraft(null)), notes: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                      rows={4}
                      placeholder="Avtal, info om fordon, villkor…"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <input
                      type="checkbox"
                      checked={!!editing?.is_active}
                      onChange={(e) =>
                        setEditing((d) => ({ ...(d ?? toDraft(null)), is_active: e.target.checked }))
                      }
                    />
                    Aktiv operatör
                  </label>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving || !editing}
                      className="rounded-xl bg-[var(--hb-primary,#0B2A44)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {saving ? "Sparar…" : "Spara"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      Stäng
                    </button>

                    {selected?.website ? (
                      <a
                        href={selected.website}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                      >
                        Öppna webb
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-600">
              Nästa steg: koppla operatörer till <span className="font-semibold">Avgångar</span> med dropdown (operator_id),
              och visa namnet i listan.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


