import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Avvikelse = {
  id: string;
  booking_id?: string | null;
  booking_number?: string | null;
  title: string;
  type: string;
  severity: string;
  status: string;
  reported_by?: string | null;
  reported_at?: string | null;
  description?: string | null;
  action_taken?: string | null;
  follow_up?: string | null;
  customer_notified?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

function statusClass(status: string) {
  if (status === "öppen") return "bg-red-100 text-red-700";
  if (status === "pågår") return "bg-yellow-100 text-yellow-700";
  if (status === "klar") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

function severityClass(severity: string) {
  if (severity === "kritisk") return "bg-red-100 text-red-700";
  if (severity === "hög") return "bg-orange-100 text-orange-700";
  if (severity === "normal") return "bg-blue-100 text-blue-700";
  if (severity === "låg") return "bg-gray-100 text-gray-700";
  return "bg-gray-100 text-gray-700";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("sv-SE");
  } catch {
    return "—";
  }
}

export default function AvvikelseDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [form, setForm] = useState<Avvikelse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/admin/avvikelser/${id}`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error || "Kunde inte hämta avvikelsen.");
        }

        setForm(json);
      } catch (e: any) {
        setError(e?.message || "Något gick fel.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  function update(key: keyof Avvikelse, value: any) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSavedMessage("");
  }

  async function save() {
    if (!form || !id || typeof id !== "string") return;

    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      const res = await fetch(`/api/admin/avvikelser/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte spara ändringar.");
      }

      setForm(json);
      setSavedMessage("Sparat ✔");
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f4f0]">
      <AdminMenu />

      <div className="flex flex-1 flex-col">
        <Header />

        <main className="p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#0f172a]">
                Avvikelse
              </h1>
              <p className="text-sm text-gray-500">
                Visa, följ upp och uppdatera registrerad avvikelse.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/avvikelser")}
              className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Tillbaka
            </button>
          </div>

          {loading && (
            <div className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow">
              Laddar avvikelse...
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && form && (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <section className="rounded-xl bg-white p-5 shadow">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#194C66]">
                      {form.title || "Namnlös avvikelse"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Skapad: {formatDate(form.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                        form.status
                      )}`}
                    >
                      {form.status}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${severityClass(
                        form.severity
                      )}`}
                    >
                      {form.severity}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Bokningsnummer">
                    <input
                      value={form.booking_number || ""}
                      onChange={(e) =>
                        update("booking_number", e.target.value)
                      }
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>

                  <Field label="Rapporterad av">
                    <input
                      value={form.reported_by || ""}
                      onChange={(e) => update("reported_by", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>

                  <Field label="Typ">
                    <select
                      value={form.type || "övrigt"}
                      onChange={(e) => update("type", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="försening">Försening</option>
                      <option value="fordon">Fordon</option>
                      <option value="chaufför">Chaufför</option>
                      <option value="kund">Kund</option>
                      <option value="trafik">Trafik</option>
                      <option value="säkerhet">Säkerhet</option>
                      <option value="övrigt">Övrigt</option>
                    </select>
                  </Field>

                  <Field label="Allvarlighetsgrad">
                    <select
                      value={form.severity || "normal"}
                      onChange={(e) => update("severity", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="låg">Låg</option>
                      <option value="normal">Normal</option>
                      <option value="hög">Hög</option>
                      <option value="kritisk">Kritisk</option>
                    </select>
                  </Field>

                  <Field label="Status">
                    <select
                      value={form.status || "öppen"}
                      onChange={(e) => update("status", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="öppen">Öppen</option>
                      <option value="pågår">Pågår</option>
                      <option value="klar">Klar</option>
                    </select>
                  </Field>

                  <Field label="Kund informerad">
                    <label className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(form.customer_notified)}
                        onChange={(e) =>
                          update("customer_notified", e.target.checked)
                        }
                      />
                      <span>Ja</span>
                    </label>
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Rubrik">
                    <input
                      value={form.title || ""}
                      onChange={(e) => update("title", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Beskrivning">
                    <textarea
                      value={form.description || ""}
                      onChange={(e) => update("description", e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Åtgärd">
                    <textarea
                      value={form.action_taken || ""}
                      onChange={(e) => update("action_taken", e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Uppföljning">
                    <textarea
                      value={form.follow_up || ""}
                      onChange={(e) => update("follow_up", e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </Field>
                </div>
              </section>

              <aside className="h-fit rounded-xl bg-white p-5 shadow">
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Sammanfattning
                </h2>

                <div className="mt-4 space-y-3 text-sm">
                  <Summary label="Bokning" value={form.booking_number || "—"} />
                  <Summary label="Typ" value={form.type || "—"} />
                  <Summary label="Allvar" value={form.severity || "—"} />
                  <Summary label="Status" value={form.status || "—"} />
                  <Summary
                    label="Kund informerad"
                    value={form.customer_notified ? "Ja" : "Nej"}
                  />
                  <Summary
                    label="Rapporterad"
                    value={formatDate(form.reported_at)}
                  />
                  <Summary
                    label="Senast ändrad"
                    value={formatDate(form.updated_at)}
                  />
                </div>

                {form.booking_number && (
                  <button
                    onClick={() =>
                      router.push(
                        `/admin/bookings?search=${encodeURIComponent(
                          form.booking_number || ""
                        )}`
                      )
                    }
                    className="mt-5 w-full rounded-lg border px-4 py-3 text-sm font-medium hover:bg-gray-50"
                  >
                    Sök bokning
                  </button>
                )}

                <button
                  onClick={save}
                  disabled={saving || !form.title?.trim()}
                  className="mt-3 w-full rounded-lg bg-[#194C66] px-4 py-3 font-medium text-white hover:bg-[#163b4d] disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Spara ändringar"}
                </button>

                {savedMessage && (
                  <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    {savedMessage}
                  </div>
                )}
              </aside>
            </div>
          )}
        </main>
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
      <div className="mb-1 text-sm font-medium text-[#194C66]">{label}</div>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-[#0f172a]">{value}</span>
    </div>
  );
}
