import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type FormState = {
  app_published: boolean;
  email_status: string;
  kivra_status: string;
  delivery_notes: string;
};

const emptyForm: FormState = {
  app_published: false,
  email_status: "not_sent",
  kivra_status: "not_active",
  delivery_notes: "",
};

function emailStatusLabel(value: string) {
  if (value === "queued") return "Köad för e-post";
  if (value === "sent") return "E-post skickad";
  if (value === "failed") return "E-post misslyckades";
  return "Ej skickad";
}

function kivraStatusLabel(value: string) {
  if (value === "ready") return "Redo för Kivra";
  if (value === "sent") return "Skickad via Kivra";
  if (value === "failed") return "Kivra misslyckades";
  return "Ej aktiverad";
}

export default function LonebeskedLeveransPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [employeeName, setEmployeeName] = useState("");
  const [runTitle, setRunTitle] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);

  const [appPublishedAt, setAppPublishedAt] = useState("");
  const [emailSentAt, setEmailSentAt] = useState("");
  const [kivraSentAt, setKivraSentAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadPayslip() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/lonebesked/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönebesked.");
      }

      const payslip = json.payslip || {};
      const run = json.run || {};

      setEmployeeName(payslip.employee_name_snapshot || "Anställd");
      setRunTitle(run.title || "Lönekörning");

      setForm({
        app_published: Boolean(payslip.app_published),
        email_status: payslip.email_status || "not_sent",
        kivra_status: payslip.kivra_status || "not_active",
        delivery_notes: payslip.delivery_notes || "",
      });

      setAppPublishedAt(payslip.app_published_at || "");
      setEmailSentAt(payslip.email_sent_at || "");
      setKivraSentAt(payslip.kivra_sent_at || "");
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDelivery(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/lonebesked/" + encodeURIComponent(id) + "/delivery", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara leveransstatus.");
      }

      setMessage("Leveransstatus sparades.");
      await loadPayslip();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara leveransstatus.");
    } finally {
      setSaving(false);
    }
  }

  async function sendEmailNotification() {
    try {
      setEmailSending(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/lonebesked/" + encodeURIComponent(id) + "/send-email", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skicka e-postavisering.");
      }

      setMessage("E-postavisering skickades till " + (json.to || "anställd") + ".");
      await loadPayslip();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skicka e-postavisering.");
    } finally {
      setEmailSending(false);
    }
  }

  useEffect(() => {
    loadPayslip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveDelivery} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Leverans av lönebesked
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {employeeName} · {runTitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={"/admin/lon/lonebesked/" + encodeURIComponent(id)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="button"
                  onClick={sendEmailNotification}
                  disabled={emailSending || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailSending ? "Skickar..." : "Skicka e-post"}
                </button>

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara leverans"}
                </button>
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                {error}
              </section>
            )}

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
                {message}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Personalappen</h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <SelectField
                  label="Publicerad i app"
                  value={form.app_published ? "true" : "false"}
                  onChange={(value) => updateField("app_published", value === "true")}
                  options={[
                    ["false", "Nej"],
                    ["true", "Ja"],
                  ]}
                />

                <ReadOnly label="Publicerad datum" value={appPublishedAt ? new Date(appPublishedAt).toLocaleString("sv-SE") : "—"} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">E-postavisering</h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <SelectField
                  label="E-poststatus"
                  value={form.email_status}
                  onChange={(value) => updateField("email_status", value)}
                  options={[
                    ["not_sent", "Ej skickad"],
                    ["queued", "Köad för e-post"],
                    ["sent", "Skickad"],
                    ["failed", "Misslyckades"],
                  ]}
                />

                <ReadOnly label="Visning" value={emailStatusLabel(form.email_status)} />
                <ReadOnly label="Skickad datum" value={emailSentAt ? new Date(emailSentAt).toLocaleString("sv-SE") : "—"} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Kivra</h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <SelectField
                  label="Kivrastatus"
                  value={form.kivra_status}
                  onChange={(value) => updateField("kivra_status", value)}
                  options={[
                    ["not_active", "Ej aktiverad"],
                    ["ready", "Redo senare"],
                    ["sent", "Skickad"],
                    ["failed", "Misslyckades"],
                  ]}
                />

                <ReadOnly label="Visning" value={kivraStatusLabel(form.kivra_status)} />
                <ReadOnly label="Skickad datum" value={kivraSentAt ? new Date(kivraSentAt).toLocaleString("sv-SE") : "—"} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Leveransanteckning</h2>

              <textarea
                value={form.delivery_notes}
                onChange={(event) => updateField("delivery_notes", event.target.value)}
                rows={6}
                placeholder="Ex. publicerad i app, avisering väntar, Kivra kopplas senare..."
                className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
              />
            </section>
          </form>
        </main>
      </div>
    </>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
        {value}
      </div>
    </div>
  );
}
