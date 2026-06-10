import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const emptySettings = {
  invoice_payment_text: "",
  default_payment_terms_days: "10",
  reminder_fee_amount: "60",
  late_interest_percent: "10",
  reminder_payment_days: "7",
  default_sales_account: "3010",
  default_output_vat_account: "2631",
  default_cost_account: "4010",
  default_input_vat_account: "2641",
};

export default function EkonomiInstallningarPage() {
  const [settings, setSettings] = useState<any>(emptySettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateSetting(key: string, value: string) {
    setSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/installningar");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta ekonomiinställningar.");
      }

      setSettings({
        ...emptySettings,
        ...(json.settings || {}),
      });
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta ekonomiinställningar.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/installningar", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara ekonomiinställningar.");
      }

      setSettings({
        ...emptySettings,
        ...(json.settings || {}),
      });

      setMessage("Ekonomiinställningarna sparades.");
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara ekonomiinställningar.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveSettings} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Ekonomiinställningar
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Styr standardvärden för fakturor, påminnelser, dröjsmålsränta och bokföringskonton.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadSettings}
                  disabled={loading || saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Ladda om
                </button>

                <button
                  type="submit"
                  disabled={loading || saving}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara inställningar"}
                </button>
              </div>
            </div>

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 shadow-sm">
                {message}
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar ekonomiinställningar...
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Fakturainställningar</h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <Field
                      label="Standard betalningsvillkor dagar"
                      value={settings.default_payment_terms_days}
                      onChange={(value) => updateSetting("default_payment_terms_days", value)}
                    />
                  </div>

                  <Textarea
                    label="Standard betalningstext på faktura"
                    value={settings.invoice_payment_text}
                    onChange={(value) => updateSetting("invoice_payment_text", value)}
                  />

                  <InfoBox>
                    Denna text används som standard på fakturor och i PDF/utskrift när ingen egen betalningstext är satt.
                  </InfoBox>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Påminnelser</h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <Field
                      label="Påminnelseavgift"
                      value={settings.reminder_fee_amount}
                      onChange={(value) => updateSetting("reminder_fee_amount", value)}
                    />

                    <Field
                      label="Dröjsmålsränta %"
                      value={settings.late_interest_percent}
                      onChange={(value) => updateSetting("late_interest_percent", value)}
                    />

                    <Field
                      label="Betalningsdagar efter påminnelse"
                      value={settings.reminder_payment_days}
                      onChange={(value) => updateSetting("reminder_payment_days", value)}
                    />
                  </div>

                  <InfoBox>
                    Påminnelseavgift och dröjsmålsränta är valbara när du skickar påminnelse. Kontrollera alltid villkor och vad som gäller innan du tar ut avgifter.
                  </InfoBox>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Standardkonton</h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <Field
                      label="Försäljningskonto"
                      value={settings.default_sales_account}
                      onChange={(value) => updateSetting("default_sales_account", value)}
                    />

                    <Field
                      label="Utgående momskonto"
                      value={settings.default_output_vat_account}
                      onChange={(value) => updateSetting("default_output_vat_account", value)}
                    />

                    <Field
                      label="Kostnadskonto"
                      value={settings.default_cost_account}
                      onChange={(value) => updateSetting("default_cost_account", value)}
                    />

                    <Field
                      label="Ingående momskonto"
                      value={settings.default_input_vat_account}
                      onChange={(value) => updateSetting("default_input_vat_account", value)}
                    />
                  </div>

                  <InfoBox>
                    Dessa konton används som standard i ekonomiflödet. Du kan fortfarande ändra konton direkt på faktura- och leverantörsrader.
                  </InfoBox>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  <QuickLink href="/admin/ekonomi/oversikt" title="Ekonomisk översikt">
                    Se resultat, moms, obetalda fakturor och kommande betalningar.
                  </QuickLink>

                  <QuickLink href="/admin/ekonomi/momsrapport" title="Momsrapport">
                    Kontrollera utgående och ingående moms per momssats.
                  </QuickLink>

                  <QuickLink href="/admin/ekonomi/betalningspaminnelser" title="Påminnelser">
                    Skicka påminnelser och följ upp sena betalningar.
                  </QuickLink>
                </section>
              </>
            )}
          </form>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      {children}
    </div>
  );
}

function QuickLink({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50"
    >
      <div className="font-bold text-[#194C66]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{children}</div>
    </a>
  );
}
