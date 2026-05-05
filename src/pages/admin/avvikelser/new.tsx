import { useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function NewAvvikelsePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    booking_number: "",
    title: "",
    type: "övrigt",
    severity: "normal",
    status: "öppen",
    reported_by: "",
    description: "",
    action_taken: "",
    follow_up: "",
    customer_notified: false,
  });

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/avvikelser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte spara avvikelsen.");
      }

      router.push(`/admin/avvikelser/${json.id}`);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f4f0]">
      <AdminMenu />

      <div className="flex-1 flex flex-col">
        <Header title="Ny avvikelse" />

        <main className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#0f172a]">
                Ny avvikelse
              </h1>
              <p className="text-sm text-gray-500">
                Registrera händelser, problem eller åtgärder kopplade till resa
                eller bokning.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/avvikelser")}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-white"
            >
              Tillbaka
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-xl bg-white p-5 shadow">
              <h2 className="mb-4 text-lg font-semibold text-[#194C66]">
                Avvikelseinformation
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Bokningsnummer">
                  <input
                    value={form.booking_number}
                    onChange={(e) => update("booking_number", e.target.value)}
                    placeholder="Ex. HB26003"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Rapporterad av">
                  <input
                    value={form.reported_by}
                    onChange={(e) => update("reported_by", e.target.value)}
                    placeholder="Ex. Andreas"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>

                <Field label="Typ">
                  <select
                    value={form.type}
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
                    value={form.severity}
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
                    value={form.status}
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
                      checked={form.customer_notified}
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
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="Kort rubrik på avvikelsen"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Beskrivning">
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    rows={5}
                    placeholder="Beskriv vad som hände..."
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Åtgärd">
                  <textarea
                    value={form.action_taken}
                    onChange={(e) => update("action_taken", e.target.value)}
                    rows={4}
                    placeholder="Vad gjordes direkt?"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Uppföljning">
                  <textarea
                    value={form.follow_up}
                    onChange={(e) => update("follow_up", e.target.value)}
                    rows={4}
                    placeholder="Behövs uppföljning?"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </Field>
              </div>
            </section>

            <aside className="rounded-xl bg-white p-5 shadow h-fit">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Sammanfattning
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <Summary label="Bokning" value={form.booking_number || "—"} />
                <Summary label="Typ" value={form.type} />
                <Summary label="Allvar" value={form.severity} />
                <Summary label="Status" value={form.status} />
                <Summary
                  label="Kund informerad"
                  value={form.customer_notified ? "Ja" : "Nej"}
                />
              </div>

              <button
                onClick={save}
                disabled={saving || !form.title.trim()}
                className="mt-6 w-full rounded-lg bg-[#194C66] px-4 py-3 font-medium text-white hover:bg-[#163b4d] disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Spara avvikelse"}
              </button>
            </aside>
          </div>
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
      <span className="font-medium text-[#0f172a]">{value}</span>
    </div>
  );
}
