import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const emptySettings = {
  company_name: "",
  legal_name: "",
  organization_number: "",
  vat_number: "",
  address: "",
  postal_code: "",
  city: "",
  country: "Sverige",
  phone: "",
  email: "",
  website: "",
  bankgiro: "",
  plusgiro: "",
  iban: "",
  bic: "",
  swish: "",
  invoice_terms_days: 10,
  invoice_footer: "",
  booking_terms: "",
  primary_color: "#194C66",
  accent_color: "#00645d",
  logo_url: "",
};

export default function ForetagsinstallningarPage() {
  const [settings, setSettings] = useState<any>(emptySettings);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/foretagsinstallningar");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta företagsinställningar.");
      }

      setSettings({
        ...emptySettings,
        ...(json.settings || {}),
      });

      setWarnings(json.warnings || []);
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta företagsinställningar.");
    } finally {
      setLoading(false);
    }
  }

  async function saveData() {
    try {
      setSaving(true);
      setError("");
      setSaved("");

      const res = await fetch("/api/admin/system/foretagsinstallningar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara företagsinställningar.");
      }

      setSettings({
        ...emptySettings,
        ...(json.settings || {}),
      });

      setSaved("Företagsinställningarna är sparade.");
      setWarnings([]);
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara företagsinställningar.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: string, value: any) {
    setSettings((current: any) => ({
      ...(current || {}),
      [field]: value,
    }));
  }

  function handleLogoFile(file?: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Välj en bildfil, till exempel PNG, JPG, SVG eller WebP.");
      return;
    }

    const maxSize = 1024 * 1024;

    if (file.size > maxSize) {
      setError("Logotypen är för stor. Välj helst en fil under 1 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateField("logo_url", String(reader.result || ""));
      setError("");
      setSaved("Logotypen är vald. Glöm inte att klicka på Spara inställningar.");
    };

    reader.onerror = () => {
      setError("Kunde inte läsa logotypfilen.");
    };

    reader.readAsDataURL(file);
  }

  function removeLogo() {
    updateField("logo_url", "");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setSaved("Logotypen är borttagen. Glöm inte att klicka på Spara inställningar.");
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
                  System / inställningar · Företag
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Företagsinställningar
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Samla företagets grunduppgifter för fakturor, kvitton, PDF:er och kundkommunikation.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Uppdatera
                </button>

                <button
                  type="button"
                  onClick={saveData}
                  disabled={saving || loading}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12384c] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara inställningar"}
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
                <strong>Info:</strong> Kör SQL-koden för att kunna spara företagsinställningar.
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Företag" value={settings.company_name || "Ej angivet"} />
              <SummaryCard label="Ort" value={settings.city || "Ej angivet"} />
              <SummaryCard label="Betalningsvillkor" value={(settings.invoice_terms_days || 0) + " dagar"} />
            </section>

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                Laddar företagsinställningar...
              </section>
            ) : (
              <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
                <div className="space-y-6">
                  <Card title="Grunduppgifter">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Varumärkesnamn" value={settings.company_name || ""} onChange={(value) => updateField("company_name", value)} />
                      <Field label="Juridiskt namn" value={settings.legal_name || ""} onChange={(value) => updateField("legal_name", value)} />
                      <Field label="Organisationsnummer" value={settings.organization_number || ""} onChange={(value) => updateField("organization_number", value)} />
                      <Field label="Momsnummer" value={settings.vat_number || ""} onChange={(value) => updateField("vat_number", value)} />
                    </div>
                  </Card>

                  <Card title="Kontakt & adress">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="E-post" value={settings.email || ""} onChange={(value) => updateField("email", value)} />
                      <Field label="Telefon" value={settings.phone || ""} onChange={(value) => updateField("phone", value)} />
                      <Field label="Webbplats" value={settings.website || ""} onChange={(value) => updateField("website", value)} />
                      <Field label="Land" value={settings.country || ""} onChange={(value) => updateField("country", value)} />
                      <Field label="Adress" value={settings.address || ""} onChange={(value) => updateField("address", value)} />
                      <Field label="Postnummer" value={settings.postal_code || ""} onChange={(value) => updateField("postal_code", value)} />
                      <Field label="Ort" value={settings.city || ""} onChange={(value) => updateField("city", value)} />
                    </div>
                  </Card>

                  <Card title="Betalning & faktura">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Bankgiro" value={settings.bankgiro || ""} onChange={(value) => updateField("bankgiro", value)} />
                      <Field label="Plusgiro" value={settings.plusgiro || ""} onChange={(value) => updateField("plusgiro", value)} />
                      <Field label="Swish" value={settings.swish || ""} onChange={(value) => updateField("swish", value)} />
                      <NumberField label="Betalningsvillkor dagar" value={settings.invoice_terms_days || 0} onChange={(value) => updateField("invoice_terms_days", value)} />
                      <Field label="IBAN" value={settings.iban || ""} onChange={(value) => updateField("iban", value)} />
                      <Field label="BIC/SWIFT" value={settings.bic || ""} onChange={(value) => updateField("bic", value)} />
                    </div>

                    <div className="mt-4">
                      <TextArea label="Fakturafot" value={settings.invoice_footer || ""} onChange={(value) => updateField("invoice_footer", value)} />
                    </div>

                    <div className="mt-4">
                      <TextArea label="Bokningsvillkor / standardtext" value={settings.booking_terms || ""} onChange={(value) => updateField("booking_terms", value)} />
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card title="Visuell profil">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Logotyp
                        </label>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                          onChange={(event) => handleLogoFile(event.target.files?.[0] || null)}
                          className="hidden"
                        />

                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          {settings.logo_url ? (
                            <div className="flex items-center gap-4">
                              <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-slate-200 bg-white p-3">
                                <img
                                  src={settings.logo_url}
                                  alt="Logotyp"
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-[#194C66]">
                                  Logotyp vald
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Bilden sparas när du klickar på Spara inställningar.
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                              Ingen logotyp vald ännu.
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="rounded-xl bg-[#194C66] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#12384c]"
                            >
                              Välj fil från datorn
                            </button>

                            {settings.logo_url && (
                              <button
                                type="button"
                                onClick={removeLogo}
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                              >
                                Ta bort logotyp
                              </button>
                            )}
                          </div>

                          <p className="mt-3 text-xs leading-5 text-slate-500">
                            Rekommenderat: PNG, JPG, SVG eller WebP. Max 1 MB.
                          </p>
                        </div>

                        {!String(settings.logo_url || "").startsWith("data:") && (
                          <div className="mt-4">
                            <Field
                              label="Logotyp URL, valfritt"
                              value={settings.logo_url || ""}
                              onChange={(value) => updateField("logo_url", value)}
                            />
                          </div>
                        )}
                      </div>
                      <Field label="Primär färg" value={settings.primary_color || ""} onChange={(value) => updateField("primary_color", value)} />
                      <Field label="Accentfärg" value={settings.accent_color || ""} onChange={(value) => updateField("accent_color", value)} />

                      <div className="grid grid-cols-2 gap-3">
                        <ColorPreview label="Primär" color={settings.primary_color || "#194C66"} />
                        <ColorPreview label="Accent" color={settings.accent_color || "#00645d"} />
                      </div>
                    </div>
                  </Card>

                  <Card title="Förhandsvisning">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Faktura / kvitto
                      </div>

                      {settings.logo_url ? (
                        <div className="mt-4 flex h-20 items-center">
                          <img
                            src={settings.logo_url}
                            alt="Logotyp"
                            className="max-h-20 max-w-[220px] object-contain"
                          />
                        </div>
                      ) : (
                        <div className="mt-4 text-2xl font-black text-[#194C66]">
                          {settings.company_name || "Helsingbuss"}
                        </div>
                      )}

                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        {settings.legal_name || "Juridiskt namn saknas"}<br />
                        {settings.address || "Adress saknas"}<br />
                        {(settings.postal_code || "Postnr") + " " + (settings.city || "Ort")}<br />
                        {settings.email || "E-post saknas"}
                      </div>

                      <div className="mt-5 rounded-xl bg-white p-4 text-sm text-slate-600">
                        <strong>Betalningsvillkor:</strong> {settings.invoice_terms_days || 0} dagar<br />
                        <strong>Bankgiro:</strong> {settings.bankgiro || "—"}<br />
                        <strong>Swish:</strong> {settings.swish || "—"}
                      </div>

                      <p className="mt-4 text-sm italic leading-6 text-slate-500">
                        {settings.invoice_footer || "Fakturafot saknas."}
                      </p>
                    </div>
                  </Card>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </>
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

function SummaryCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-[#194C66] shadow-sm">
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 break-words text-xl font-black">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function ColorPreview({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div
        className="h-16 rounded-lg border border-slate-200"
        style={{ backgroundColor: color }}
      />
      <div className="mt-2 text-xs font-bold text-slate-600">{label}</div>
      <div className="text-xs text-slate-500">{color}</div>
    </div>
  );
}
