import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Line = {
  id: string;
  name?: string | null;
  code?: string | null;
  description?: string | null;

  start_city?: string | null;
  end_city?: string | null;

  color?: string | null;
  status?: string | null;

  created_at?: string | null;
};

function statusLabel(status?: string | null) {
  if (status === "active") return "Aktiv";
  if (status === "draft") return "Utkast";
  if (status === "inactive") return "Inaktiv";
  return status || "—";
}

function statusClass(status?: string | null) {
  if (status === "active") {
    return "bg-green-100 text-green-700";
  }

  if (status === "inactive") {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-700";
}

export default function SundraLinesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [lines, setLines] = useState<Line[]>([]);

  const [form, setForm] = useState({
    name: "",
    code: "",

    description: "",

    start_city: "",
    end_city: "",

    color: "#194C66",

    status: "active",
  });

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadLines() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/lines");

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || "Kunde inte hämta linjer."
        );
      }

      setLines(json.lines || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLines();
  }, []);

  async function save() {
    try {
      setSaving(true);
      setError("");

      if (!form.name.trim()) {
        throw new Error("Linjenamn saknas.");
      }

      const res = await fetch("/api/admin/sundra/lines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || "Kunde inte skapa linje."
        );
      }

      setForm({
        name: "",
        code: "",
        description: "",
        start_city: "",
        end_city: "",
        color: "#194C66",
        status: "active",
      });

      await loadLines();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: lines.length,
      active: lines.filter(
        (l) => l.status === "active"
      ).length,
    };
  }, [lines]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Linjer
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Hantera Sundra-linjer och nätverk.
              </p>
            </div>

            <button
              onClick={loadLines}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Stat
              title="Totala linjer"
              value={stats.total}
            />

            <Stat
              title="Aktiva linjer"
              value={stats.active}
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Skapa linje
              </h2>

              <div className="mt-5 space-y-4">
                <Field label="Linjenamn">
                  <input
                    value={form.name}
                    onChange={(e) =>
                      update("name", e.target.value)
                    }
                    placeholder="Linje Syd"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Linjekod">
                  <input
                    value={form.code}
                    onChange={(e) =>
                      update("code", e.target.value)
                    }
                    placeholder="LS01"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Startort">
                    <input
                      value={form.start_city}
                      onChange={(e) =>
                        update(
                          "start_city",
                          e.target.value
                        )
                      }
                      placeholder="Malmö"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Slutort">
                    <input
                      value={form.end_city}
                      onChange={(e) =>
                        update(
                          "end_city",
                          e.target.value
                        )
                      }
                      placeholder="Ullared"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Beskrivning">
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      update(
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Beskrivning av linjen..."
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Färg">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) =>
                        update("color", e.target.value)
                      }
                      className="h-12 w-full rounded-xl border p-1"
                    />
                  </Field>

                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        update("status", e.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="active">
                        Aktiv
                      </option>

                      <option value="draft">
                        Utkast
                      </option>

                      <option value="inactive">
                        Inaktiv
                      </option>
                    </select>
                  </Field>
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white hover:bg-[#16384d] disabled:opacity-50"
                >
                  {saving
                    ? "Sparar..."
                    : "Skapa linje"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-white shadow">
              <div className="border-b p-5">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Alla linjer
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-gray-500">
                  Laddar linjer...
                </div>
              ) : lines.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  Inga linjer skapade ännu.
                </div>
              ) : (
                <div className="divide-y">
                  {lines.map((line) => (
                    <div
                      key={line.id}
                      className="p-5 hover:bg-[#f8fafc]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="mt-1 h-5 w-5 rounded-full border"
                            style={{
                              backgroundColor:
                                line.color || "#194C66",
                            }}
                          />

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-[#0f172a]">
                                {line.name}
                              </h3>

                              {line.code && (
                                <span className="rounded-full bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-gray-600">
                                  {line.code}
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-gray-500">
                              {line.start_city || "—"} →{" "}
                              {line.end_city || "—"}
                            </p>

                            {line.description && (
                              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                                {line.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            line.status
                          )}`}
                        >
                          {statusLabel(line.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-bold text-[#194C66]">
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-[#194C66]">
        {label}
      </div>

      {children}
    </label>
  );
}


