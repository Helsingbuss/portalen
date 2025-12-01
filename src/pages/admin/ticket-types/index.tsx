// src/pages/admin/ticket-types/index.tsx
import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type TicketTypeRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  kind: "ticket" | "addon" | string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[13px] font-medium text-[#194C66]/80 mb-1">
      {children}
    </div>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-[#194C66]/60 mt-1">{children}</div>
  );
}

export default function TicketTypesPage() {
  const [rows, setRows] = useState<TicketTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form-state
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"ticket" | "addon">("ticket");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(100);
  const [isActive, setIsActive] = useState(true);

  function resetForm() {
    setEditId(null);
    setCode("");
    setName("");
    setKind("ticket");
    setDescription("");
    setSortOrder(100);
    setIsActive(true);
  }

  function startEdit(row: TicketTypeRow) {
    setEditId(row.id);
    setCode(row.code || "");
    setName(row.name || "");
    setKind(row.kind === "addon" ? "addon" : "ticket");
    setDescription(row.description || "");
    setSortOrder(row.sort_order ?? 100);
    setIsActive(!!row.is_active);
  }

  function sortRows(list: TicketTypeRow[]) {
    return [...list].sort((a, b) => {
      const sa = a.sort_order ?? 100;
      const sb = b.sort_order ?? 100;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      setMsg(null);
      const r = await fetch("/api/ticket-types/list");
      const j = await r.json();
      if (!r.ok || j.ok === false) {
        throw new Error(j?.error || "Kunde inte hämta biljetttyper.");
      }
      setRows(sortRows(j.items || []));
    } catch (e: any) {
      setErr(e?.message || "Tekniskt fel vid hämtning.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave() {
    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const payload = {
        id: editId || undefined,
        code: code.trim(),
        name: name.trim(),
        kind,
        description: description.trim() || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 100,
        is_active: !!isActive,
      };

      if (!payload.code) throw new Error("Ange kod (t.ex. ADULT).");
      if (!payload.name) throw new Error("Ange namn (t.ex. Vuxen).");

      const r = await fetch("/api/ticket-types/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) {
        throw new Error(j?.error || "Kunde inte spara biljettyp.");
      }

      const item: TicketTypeRow = j.item;

      setRows((prev) => {
        const existingIndex = prev.findIndex((p) => p.id === item.id);
        if (existingIndex === -1) {
          return sortRows([...prev, item]);
        }
        const copy = [...prev];
        copy[existingIndex] = item;
        return sortRows(copy);
      });

      setEditId(item.id);
      setMsg("Biljettyp sparad.");
    } catch (e: any) {
      setErr(e?.message || "Tekniskt fel vid sparande.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: TicketTypeRow) {
    if (!row.id) return;
    const ok = window.confirm(
      `Ta bort biljetttyp "${row.name}"?\nObservera: om den används i prissättning kan det ge fel.`
    );
    if (!ok) return;

    try {
      setErr(null);
      setMsg(null);
      const r = await fetch("/api/ticket-types/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) {
        throw new Error(j?.error || "Kunde inte ta bort biljettyp.");
      }
      setRows((prev) => prev.filter((p) => p.id !== row.id));
      if (editId === row.id) resetForm();
      setMsg("Biljettyp borttagen.");
    } catch (e: any) {
      setErr(e?.message || "Tekniskt fel vid borttagning.");
    }
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="px-6 pb-16 pt-14 lg:pt-20">
          {/* Topprad */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Biljetttyper
              </h1>
              <p className="text-sm text-slate-600">
                Här hanterar du alla biljetttyper (vuxen, barn, senior,
                tillägg) som kan användas på resor.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center rounded-[12px] bg-white px-4 py-2 text-sm font-medium text-[#194C66] border border-[#194C66]/20 shadow-sm hover:bg-slate-50"
            >
              + Ny biljettyp
            </button>
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}
          {msg && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {msg}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
            {/* Formulär */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b">
                <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                  {editId ? "Redigera biljetttyp" : "Skapa biljetttyp"}
                </h2>
                <p className="text-[12px] text-slate-500 mt-1">
                  Kod används internt, namn visas för kund. Välj om det är en
                  vanlig biljett eller ett tillägg (t.ex. extra bagage).
                </p>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Kod</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      placeholder="t.ex. ADULT"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.toUpperCase().trimStart())
                      }
                    />
                    <Help>
                      Intern kod, helst versaler utan mellanslag (ADULT,
                      CHILD, SENIOR).
                    </Help>
                  </div>
                  <div>
                    <FieldLabel>Namn</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      placeholder="t.ex. Vuxen"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Typ</FieldLabel>
                    <select
                      className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={kind}
                      onChange={(e) =>
                        setKind(e.target.value === "addon" ? "addon" : "ticket")
                      }
                    >
                      <option value="ticket">Vanlig biljett</option>
                      <option value="addon">Tillägg (extra bagage, osv.)</option>
                    </select>
                    <Help>
                      Välj &quot;Tillägg&quot; för saker som inte är en plats i
                      bussen (t.ex. extra bagage).
                    </Help>
                  </div>
                  <div>
                    <FieldLabel>Sorteringsordning</FieldLabel>
                    <input
                      type="number"
                      className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={sortOrder}
                      onChange={(e) =>
                        setSortOrder(
                          Number.isNaN(Number(e.target.value))
                            ? 100
                            : Number(e.target.value)
                        )
                      }
                    />
                    <Help>
                      Lägre tal visas först. Standard 100 om du är osäker.
                    </Help>
                  </div>
                </div>

                <div>
                  <FieldLabel>Beskrivning (intern / valfri)</FieldLabel>
                  <textarea
                    className="border rounded-xl px-3 py-2.5 w-full min-h-[80px] text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    placeholder="T.ex. Gäller resenärer 18–64 år."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <label className="inline-flex items-center gap-2 text-sm text-[#194C66]/80">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span>Aktiv (kan väljas i prissättning)</span>
                  </label>

                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="inline-flex items-center rounded-[24px] bg-[#194C66] px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                  >
                    {saving
                      ? "Sparar…"
                      : editId
                      ? "Spara ändringar"
                      : "Skapa biljetttyp"}
                  </button>
                </div>
              </div>
            </section>

            {/* Lista */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                  Alla biljetttyper
                </h2>
                {loading && (
                  <span className="text-[12px] text-slate-500">
                    Laddar…
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Kod
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Namn
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Typ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Sortering
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                        Åtgärder
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-slate-500"
                          colSpan={6}
                        >
                          Laddar biljetttyper…
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-slate-500"
                          colSpan={6}
                        >
                          Inga biljetttyper ännu. Skapa din första till vänster.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-4 py-3 align-top font-mono text-xs text-slate-700">
                            {r.code}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-900">
                            <div className="font-medium">{r.name}</div>
                            {r.description && (
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                {r.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-700">
                            {r.kind === "addon" ? "Tillägg" : "Vanlig biljett"}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-700">
                            {r.sort_order ?? 100}
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <span
                              className={
                                "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-medium " +
                                (r.is_active
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border border-slate-200 bg-slate-100 text-slate-600")
                              }
                            >
                              {r.is_active ? "Aktiv" : "Inaktiv"}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(r)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              >
                                Redigera
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(r)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              >
                                Ta bort
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
