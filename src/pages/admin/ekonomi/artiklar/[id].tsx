import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type VatRate = Record<string, any>;

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10";

const emptyForm = {
  is_active: true,
  article_number: "",
  article_name: "",
  article_name_en: "",
  notes: "",
  article_group: "",
  purchase_price_excl_vat: "0",
  sales_accounting: "Tjänster 6% moms",
  sales_account: "",
  vat_percent: "6",
  vat_account: "2631",
  unit: "st",
  price_excl_vat: "0",
  price_incl_vat: "0",
  currency: "SEK",
  stock_quantity: "0",
  is_stock_item: false,
};

function toNumber(value: any) {
  return Number(String(value || "0").replace(",", ".")) || 0;
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("sv-SE");
  } catch {
    return value;
  }
}

function calculateIncl(excl: any, vat: any) {
  return (toNumber(excl) * (1 + toNumber(vat) / 100)).toFixed(2);
}

function calculateExcl(incl: any, vat: any) {
  const vatNumber = toNumber(vat);
  if (vatNumber <= 0) return toNumber(incl).toFixed(2);
  return (toNumber(incl) / (1 + vatNumber / 100)).toFixed(2);
}

export default function EkonomiArtikelDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");
  const isNew = id === "ny";

  const [form, setForm] = useState<any>(emptyForm);
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sortedVatRates = useMemo(
    () =>
      [...vatRates]
        .filter((rate) => rate.is_active !== false)
        .sort((a, b) => Number(a.display_order || 100) - Number(b.display_order || 100)),
    [vatRates]
  );

  function updateField(key: string, value: any) {
    setForm((prev: any) => {
      const next = {
        ...prev,
        [key]: value,
      };

      if (key === "price_excl_vat") {
        next.price_incl_vat = calculateIncl(value, next.vat_percent);
      }

      if (key === "price_incl_vat") {
        next.price_excl_vat = calculateExcl(value, next.vat_percent);
      }

      if (key === "vat_percent") {
        next.price_incl_vat = calculateIncl(next.price_excl_vat, value);

        const matchedRate = sortedVatRates.find((rate) => String(rate.vat_percent) === String(value));
        if (matchedRate?.sales_account) {
          next.vat_account = matchedRate.sales_account;
          next.sales_account = matchedRate.sales_account;
        }
      }

      return next;
    });
  }

  async function loadArticle() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      if (isNew) {
        const res = await fetch("/api/admin/ekonomi/artiklar");
        const json = await res.json().catch(() => ({}));

        if (res.ok && json.ok) {
          setVatRates(json.vatRates || []);
        }

        setForm(emptyForm);
        return;
      }

      const res = await fetch("/api/admin/ekonomi/artiklar/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta artikel.");
      }

      const article = json.article || {};
      setVatRates(json.vatRates || []);
      setCreatedAt(article.created_at || "");
      setUpdatedAt(article.updated_at || "");

      setForm({
        ...emptyForm,
        ...article,
        article_number: article.article_number || "",
        article_name: article.article_name || "",
        article_name_en: article.article_name_en || "",
        notes: article.notes || "",
        article_group: article.article_group || "",
        purchase_price_excl_vat: String(article.purchase_price_excl_vat ?? "0"),
        sales_accounting: article.sales_accounting || "",
        sales_account: article.sales_account || "",
        vat_percent: String(article.vat_percent ?? "0"),
        vat_account: article.vat_account || "",
        unit: article.unit || "st",
        price_excl_vat: String(article.price_excl_vat ?? "0"),
        price_incl_vat: String(article.price_incl_vat ?? "0"),
        currency: article.currency || "SEK",
        stock_quantity: String(article.stock_quantity ?? "0"),
        is_stock_item: article.is_stock_item === true,
        is_active: article.is_active !== false,
      });
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta artikel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveArticle(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch(isNew ? "/api/admin/ekonomi/artiklar" : "/api/admin/ekonomi/artiklar/" + encodeURIComponent(id), {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara artikel.");
      }

      setMessage("Artikeln sparades.");

      if (isNew && json.article?.id) {
        router.replace("/admin/ekonomi/artiklar/" + encodeURIComponent(json.article.id));
      } else {
        await loadArticle();
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara artikel.");
    } finally {
      setSaving(false);
    }
  }

  async function copyArticle() {
    const copy = {
      ...form,
      article_number: "",
      article_name: String(form.article_name || "") + " - kopia",
    };

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/artiklar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(copy),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte kopiera artikel.");
      }

      if (json.article?.id) {
        router.push("/admin/ekonomi/artiklar/" + encodeURIComponent(json.article.id));
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte kopiera artikel.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveArticle} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {isNew ? "Ny artikel" : "Redigera artikel"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Lägg upp artiklar som kan användas på fakturor. Pris, moms, enhet och bokföringskonto följer med till fakturaraden.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/ekonomi/artiklar"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Stäng
                </Link>

                {!isNew && (
                  <button
                    type="button"
                    onClick={copyArticle}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Kopiera
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara"}
                </button>
              </div>
            </div>

            {(message || error) && (
              <section
                className={
                  "rounded-2xl border p-5 text-sm font-semibold shadow-sm " +
                  (error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700")
                }
              >
                {error || message}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar artikel...
              </section>
            ) : (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <Section title="Grunduppgifter">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(event) => updateField("is_active", event.target.checked)}
                      />
                      Aktiv
                    </label>

                    <div className="mt-5 grid gap-4">
                      <Field label="Artikelnr." value={form.article_number} onChange={(value) => updateField("article_number", value)} required />
                      <Field label="Artikelnamn" value={form.article_name} onChange={(value) => updateField("article_name", value)} required />
                      <Field label="Artikelnamn engelska" value={form.article_name_en} onChange={(value) => updateField("article_name_en", value)} />
                      <Textarea label="Anteckningar" value={form.notes} onChange={(value) => updateField("notes", value)} />
                    </div>
                  </Section>

                  <div className="space-y-6">
                    <Section title="Inköp">
                      <Field label="Inköpspris exkl. moms" value={form.purchase_price_excl_vat} onChange={(value) => updateField("purchase_price_excl_vat", value)} suffix="SEK" />
                      <InfoLine label="Senast ändrad" value={fmtDateTime(updatedAt)} />
                    </Section>

                    <Section title="Artikelgrupper">
                      <Field label="Vald grupp" value={form.article_group} onChange={(value) => updateField("article_group", value)} placeholder="Ex. Bussresa, Avgifter, Paketresa" />
                    </Section>
                  </div>
                </div>

                <Section title="Försäljningsinformation">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <Field label="Artikelkontering" value={form.sales_accounting} onChange={(value) => updateField("sales_accounting", value)} required />

                    <SelectField
                      label="Enhet"
                      value={form.unit}
                      onChange={(value) => updateField("unit", value)}
                      options={[
                        ["st", "Styck (st)"],
                        ["h", "Timme (h)"],
                        ["dag", "Dag"],
                        ["km", "Kilometer"],
                        ["resa", "Resa"],
                        ["person", "Person"],
                      ]}
                    />

                    <SelectField
                      label="Moms"
                      value={String(form.vat_percent)}
                      onChange={(value) => updateField("vat_percent", value)}
                      options={[
                        ...sortedVatRates.map((rate) => [
                          String(rate.vat_percent),
                          (rate.label || "Moms") + " · " + String(rate.sales_account || "konto saknas"),
                        ] as [string, string]),
                        ["0", "0 % / momsfritt"],
                      ]}
                    />

                    <Field label="Momskonto" value={form.vat_account} onChange={(value) => updateField("vat_account", value)} />
                    <Field label="Försäljningskonto" value={form.sales_account} onChange={(value) => updateField("sales_account", value)} />
                    <Field label="Pris exkl. moms" value={form.price_excl_vat} onChange={(value) => updateField("price_excl_vat", value)} />
                    <Field label="Pris inkl. moms" value={form.price_incl_vat} onChange={(value) => updateField("price_incl_vat", value)} />
                    <Field label="Valuta" value={form.currency} onChange={(value) => updateField("currency", value)} />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <SelectField
                      label="Lagerartikel"
                      value={form.is_stock_item ? "true" : "false"}
                      onChange={(value) => updateField("is_stock_item", value === "true")}
                      options={[
                        ["false", "Nej"],
                        ["true", "Ja"],
                      ]}
                    />

                    <Field label="Antal i lager" value={form.stock_quantity} onChange={(value) => updateField("stock_quantity", value)} />
                  </div>
                </Section>

                {!isNew && (
                  <Section title="Systeminformation">
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoLine label="Skapad" value={fmtDateTime(createdAt)} />
                      <InfoLine label="Senast ändrad" value={fmtDateTime(updatedAt)} />
                    </div>
                  </Section>
                )}
              </>
            )}
          </form>
        </main>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="border-b border-slate-200 pb-3 text-lg font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  required,
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {required && <span className="text-red-600">*</span>}
        {label}
      </label>

      <div className="flex items-center gap-2">
        <input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />

        {suffix && <span className="mt-2 text-sm font-semibold text-slate-600">{suffix}</span>}
      </div>
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
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className={fieldClass}
      />
    </div>
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
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}
