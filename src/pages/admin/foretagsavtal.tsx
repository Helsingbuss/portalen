// src/pages/admin/foretagsavtal.tsx

import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type AgreementStatus = "utkast" | "aktiv" | "uppsagd";

type AgreementRow = {
  id: string;
  name: string;
  status: AgreementStatus;
  internal_id: string | null;
  valid_from: string | null;
  valid_to: string | null;
};

type AgreementFormState = {
  id: string | null;
  mode: "create" | "edit";

  status: AgreementStatus;
  internalId: string;

  associationName: string;
  orgNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  validFrom: string;
  validTo: string;

  minTripsPerYear: string;
  discountType: "" | "ingen" | "procent" | "fast";
  discountValue: string;
  kickbackPercent: string;

  bookingRules: string;
  cancellationRules: string;
  includedBenefits: string;

  marketingNotes: string;
  internalNotes: string;
};

const emptyForm: AgreementFormState = {
  id: null,
  mode: "create",
  status: "utkast",
  internalId: "",
  associationName: "",
  orgNumber: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  validFrom: "",
  validTo: "",
  minTripsPerYear: "",
  discountType: "",
  discountValue: "",
  kickbackPercent: "",
  bookingRules: "",
  cancellationRules: "",
  includedBenefits: "",
  marketingNotes: "",
  internalNotes: "",
};

export default function ForetagsavtalPage() {
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [form, setForm] = useState<AgreementFormState>(emptyForm);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function statusLabel(s: AgreementStatus) {
    switch (s) {
      case "aktiv":
        return "Aktivt";
      case "uppsagd":
        return "Uppsagt";
      default:
        return "Utkast";
    }
  }

  function statusBadgeClass(s: AgreementStatus) {
    switch (s) {
      case "aktiv":
        return "badge badge--green";
      case "uppsagd":
        return "badge badge--red";
      default:
        return "badge badge--grey";
    }
  }

  function formatDateLabel(value: string | null) {
    if (!value) return "–";
    return value;
  }

  async function loadList() {
    try {
      setLoadingList(true);
      setError(null);

      const res = await fetch("/api/admin/foretagsavtal");
      if (!res.ok) {
        throw new Error(`Kunde inte hämta (status ${res.status})`);
      }
      const json = await res.json();

      const rows: AgreementRow[] = (json.items || []).map((row: any) => ({
        id: row.id,
        name: row.association_name || row.company_name || "Namnlöst avtal",
        status: (row.status as AgreementStatus) || "utkast",
        internal_id: row.internal_id ?? null,
        valid_from: row.valid_from ?? null,
        valid_to: row.valid_to ?? null,
      }));

      setAgreements(rows);
    } catch (e: any) {
      console.error("[foretagsavtal] loadList error:", e?.message || e);
      setError("Kunde inte hämta företagsavtal. Försök igen om en stund.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadAgreement(id: string) {
    try {
      setError(null);
      const res = await fetch(`/api/admin/foretagsavtal/${id}`);
      if (!res.ok) {
        throw new Error(`Kunde inte hämta (status ${res.status})`);
      }
      const json = await res.json();
      const a = json.agreement;

      const loaded: AgreementFormState = {
        id: a.id,
        mode: "edit",
        status: (a.status as AgreementStatus) || "utkast",
        internalId: a.internal_id || "",
        associationName: a.association_name || a.company_name || "",
        orgNumber: a.org_number || "",
        contactName: a.contact_name || "",
        contactEmail: a.contact_email || "",
        contactPhone: a.contact_phone || "",
        validFrom: a.valid_from || "",
        validTo: a.valid_to || "",
        minTripsPerYear:
          a.min_trips_per_year != null ? String(a.min_trips_per_year) : "",
        discountType:
          (a.discount_type as AgreementFormState["discountType"]) || "",
        discountValue:
          a.discount_value != null ? String(a.discount_value) : "",
        kickbackPercent:
          a.kickback_percent != null ? String(a.kickback_percent) : "",
        bookingRules: a.booking_rules || "",
        cancellationRules: a.cancellation_rules || "",
        includedBenefits: a.included_benefits || "",
        marketingNotes: a.marketing_notes || "",
        internalNotes: a.internal_notes || "",
      };

      setForm(loaded);
      setSuccess(null);
    } catch (e: any) {
      console.error("[foretagsavtal] loadAgreement error:", e?.message || e);
      setError("Kunde inte hämta valt företagsavtal.");
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        agreement: {
          id: form.id,
          status: form.status,
          internal_id: form.internalId || null,
          association_name: form.associationName || null,
          org_number: form.orgNumber || null,
          contact_name: form.contactName || null,
          contact_email: form.contactEmail || null,
          contact_phone: form.contactPhone || null,
          valid_from: form.validFrom || null,
          valid_to: form.validTo || null,
          min_trips_per_year: form.minTripsPerYear
            ? Number(form.minTripsPerYear)
            : null,
          discount_type: form.discountType || null,
          discount_value: form.discountValue
            ? Number(form.discountValue)
            : null,
          kickback_percent: form.kickbackPercent
            ? Number(form.kickbackPercent)
            : null,
          booking_rules: form.bookingRules || null,
          cancellation_rules: form.cancellationRules || null,
          included_benefits: form.includedBenefits || null,
          marketing_notes: form.marketingNotes || null,
          internal_notes: form.internalNotes || null,
        },
      };

      const res = await fetch("/api/admin/foretagsavtal/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Kunde inte spara (status ${res.status})`);
      }

      const json = await res.json();
      const saved = json.agreement;

      setForm((prev) => ({
        ...prev,
        id: saved.id,
        mode: "edit",
      }));

      await loadList();
      setSuccess("Avtalet har sparats.");
    } catch (e: any) {
      console.error("[foretagsavtal] handleSave error:", e?.message || e);
      setError("Kunde inte spara avtalet. Kontrollera uppgifterna och försök igen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!form.id) return;
    if (!window.confirm("Vill du ta bort det här avtalet?")) return;

    try {
      setDeleting(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/foretagsavtal/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id }),
      });

      if (!res.ok) {
        throw new Error(`Kunde inte ta bort (status ${res.status})`);
      }

      setForm(emptyForm);
      await loadList();
      setSuccess("Avtalet har tagits bort.");
    } catch (e: any) {
      console.error("[foretagsavtal] handleDelete error:", e?.message || e);
      setError("Kunde inte ta bort avtalet.");
    } finally {
      setDeleting(false);
    }
  }

  function handlePreviewPdf() {
    if (!form.id) {
      setError("Spara avtalet som utkast först, innan du visar PDF.");
      return;
    }
    window.open(`/api/admin/foretagsavtal/${form.id}/pdf`, "_blank");
  }

  function handleChange<K extends keyof AgreementFormState>(
    key: K,
    value: AgreementFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreateNew() {
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
  }

  useEffect(() => {
    loadList();
  }, []);

  const isEdit = form.mode === "edit";

  return (
    <>
      <Header />
      <div className="layout">
        <AdminMenu active="foretagsavtal" />

        <main className="page">
          <div className="page-inner">
            <div className="page-header">
              <div>
                <h1>Företagsavtal</h1>
                <p className="page-subtitle">
                  Skapa och hantera avtal med företag och organisationer. Allt
                  samlat så att pris, villkor och volymkrav blir tydligt – både
                  för dig och kunden.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateNew}
              >
                + Skapa nytt avtal
              </button>
            </div>

            <div className="page-grid">
              {/* Vänsterkolumn – lista */}
              <section className="card card--list">
                <div className="card-header">
                  <h2>Alla företagsavtal</h2>
                  <span className="card-count">
                    {loadingList
                      ? "Laddar..."
                      : `${agreements.length} avtal registrerade`}
                  </span>
                </div>

                {error && (
                  <div className="alert alert-error">
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="alert alert-success">
                    <span>{success}</span>
                  </div>
                )}

                <div className="list">
                  {agreements.length === 0 && !loadingList && (
                    <div className="list-empty">
                      Inga företagsavtal registrerade ännu. Skapa det första
                      avtalet i formuläret till höger.
                    </div>
                  )}

                  {agreements.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={
                        form.id === a.id
                          ? "list-item list-item--active"
                          : "list-item"
                      }
                      onClick={() => loadAgreement(a.id)}
                    >
                      <div className="list-main">
                        <div className="list-title">{a.name}</div>
                        <div className="list-meta">
                          <span>{a.internal_id || "Ingen intern etikett"}</span>
                          <span>•</span>
                          <span>
                            Gäller{" "}
                            {formatDateLabel(a.valid_from)}–{formatDateLabel(
                              a.valid_to
                            )}
                          </span>
                        </div>
                      </div>
                      <span className={statusBadgeClass(a.status)}>
                        {statusLabel(a.status)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Högerkolumn – formulär */}
              <section className="card card--form">
                <div className="card-header">
                  <h2>
                    {isEdit ? "Redigera företagsavtal" : "Nytt företagsavtal"}
                  </h2>
                  <p className="card-subtitle">
                    Fyll i företagets uppgifter, rabattupplägg och villkor.
                    Senare kan detta ligga till grund för PDF-avtal och digital
                    signering.
                  </p>
                </div>

                <div className="card-body">
                  {/* Steg 1 */}
                  <div className="section">
                    <div className="section-header">
                      <div>
                        <div className="section-title">
                          1. Grunduppgifter om företaget
                        </div>
                        <p className="section-subtitle">
                          Namn, kontaktperson och datum som avtalet gäller.
                        </p>
                      </div>
                      <span className="section-step">Steg 1</span>
                    </div>

                    <div className="grid-two">
                      <div className="field-group">
                        <label>Företag / organisation *</label>
                        <input
                          type="text"
                          value={form.associationName}
                          onChange={(e) =>
                            handleChange("associationName", e.target.value)
                          }
                          placeholder="Ex: Exempel AB"
                        />
                      </div>
                      <div className="field-group">
                        <label>Organisationsnummer *</label>
                        <input
                          type="text"
                          value={form.orgNumber}
                          onChange={(e) =>
                            handleChange("orgNumber", e.target.value)
                          }
                          placeholder="Ex: 5590-XXXX"
                        />
                      </div>
                    </div>

                    <div className="grid-three">
                      <div className="field-group">
                        <label>Kontaktperson *</label>
                        <input
                          type="text"
                          value={form.contactName}
                          onChange={(e) =>
                            handleChange("contactName", e.target.value)
                          }
                          placeholder="Namn på ansvarig"
                        />
                      </div>
                      <div className="field-group">
                        <label>E-post *</label>
                        <input
                          type="email"
                          value={form.contactEmail}
                          onChange={(e) =>
                            handleChange("contactEmail", e.target.value)
                          }
                          placeholder="namn@foretag.se"
                        />
                      </div>
                      <div className="field-group">
                        <label>Telefon</label>
                        <input
                          type="tel"
                          value={form.contactPhone}
                          onChange={(e) =>
                            handleChange("contactPhone", e.target.value)
                          }
                          placeholder="+46 70 123 45 67"
                        />
                      </div>
                    </div>

                    <div className="grid-three">
                      <div className="field-group">
                        <label>Avtalsstatus</label>
                        <select
                          value={form.status}
                          onChange={(e) =>
                            handleChange(
                              "status",
                              e.target.value as AgreementStatus
                            )
                          }
                        >
                          <option value="utkast">Utkast</option>
                          <option value="aktiv">Aktiv</option>
                          <option value="uppsagd">Uppsagd</option>
                        </select>
                      </div>
                      <div className="field-group">
                        <label>Giltigt från</label>
                        <input
                          type="date"
                          value={form.validFrom}
                          onChange={(e) =>
                            handleChange("validFrom", e.target.value)
                          }
                        />
                      </div>
                      <div className="field-group">
                        <label>Giltigt till</label>
                        <input
                          type="date"
                          value={form.validTo}
                          onChange={(e) =>
                            handleChange("validTo", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <label>Avtalsnamn (internt)</label>
                      <input
                        type="text"
                        value={form.internalId}
                        onChange={(e) =>
                          handleChange("internalId", e.target.value)
                        }
                        placeholder="Ex: Företagsavtal 2025–2027 – Exempel AB"
                      />
                      <p className="help-text">
                        Visas bara internt i portalen. Underlättar när ni har
                        flera avtal med samma kund.
                      </p>
                    </div>
                  </div>

                  {/* Steg 2 */}
                  <div className="section">
                    <div className="section-header">
                      <div>
                        <div className="section-title">
                          2. Rabatter & volymkrav
                        </div>
                        <p className="section-subtitle">
                          Minimiantal resor, rabattmodell och ev. kickback.
                        </p>
                      </div>
                      <span className="section-step">Steg 2</span>
                    </div>

                    <div className="grid-three">
                      <div className="field-group">
                        <label>Minsta antal resor per år</label>
                        <input
                          type="number"
                          min={0}
                          value={form.minTripsPerYear}
                          onChange={(e) =>
                            handleChange("minTripsPerYear", e.target.value)
                          }
                          placeholder="Ex: 5"
                        />
                      </div>
                      <div className="field-group">
                        <label>Rabatt-typ</label>
                        <select
                          value={form.discountType}
                          onChange={(e) =>
                            handleChange(
                              "discountType",
                              e.target.value as AgreementFormState["discountType"]
                            )
                          }
                        >
                          <option value="">Ingen rabatt</option>
                          <option value="procent">Procent (%)</option>
                          <option value="fast">Fast belopp (kr)</option>
                        </select>
                      </div>
                      <div className="field-group">
                        <label>Rabattvärde</label>
                        <input
                          type="number"
                          min={0}
                          value={form.discountValue}
                          onChange={(e) =>
                            handleChange("discountValue", e.target.value)
                          }
                          placeholder="Ex: 10"
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <label>Kickback på biljetter (%)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.kickbackPercent}
                        onChange={(e) =>
                          handleChange("kickbackPercent", e.target.value)
                        }
                        placeholder="Ex: 5"
                      />
                      <p className="help-text">
                        Om ni delar intäkter med kunden. Lämnas tomt om ni inte
                        använder kickback-modell.
                      </p>
                    </div>
                  </div>

                  {/* Steg 3 */}
                  <div className="section">
                    <div className="section-header">
                      <div>
                        <div className="section-title">
                          3. Villkor, uppsägning & tillägg
                        </div>
                        <p className="section-subtitle">
                          Skriv in avbokningsregler, vad som ingår och ev.
                          övriga villkor.
                        </p>
                      </div>
                      <span className="section-step">Steg 3</span>
                    </div>

                    <div className="field-group">
                      <label>Bokningsregler (kortfattat)</label>
                      <textarea
                        rows={2}
                        value={form.bookingRules}
                        onChange={(e) =>
                          handleChange("bookingRules", e.target.value)
                        }
                        placeholder="Ex: Bokning senast 14 dagar före avresa, preliminär passagerarlista 7 dagar före, slutlig lista 3 dagar före..."
                      />
                    </div>

                    <div className="field-group">
                      <label>Avbokning / uppsägning</label>
                      <textarea
                        rows={2}
                        value={form.cancellationRules}
                        onChange={(e) =>
                          handleChange("cancellationRules", e.target.value)
                        }
                        placeholder="Ex: Avbokning utan kostnad t.o.m. 30 dagar före första resa, därefter 25 % av beräknat ordervärde..."
                      />
                    </div>

                    <div className="field-group">
                      <label>Vad ingår i avtalet?</label>
                      <textarea
                        rows={2}
                        value={form.includedBenefits}
                        onChange={(e) =>
                          handleChange("includedBenefits", e.target.value)
                        }
                        placeholder="Ex: Rabatterade priser på alla gruppresor, prioriterad buss vid slutspel, möjlighet att profilera bussen med företagets logotyp..."
                      />
                    </div>
                  </div>

                  {/* Steg 4 */}
                  <div className="section">
                    <div className="section-header">
                      <div>
                        <div className="section-title">
                          4. Marknadsstöd & interna anteckningar
                        </div>
                        <p className="section-subtitle">
                          Sådant som syns i avtalet, samt interna anteckningar
                          bara för er.
                        </p>
                      </div>
                      <span className="section-step">Steg 4</span>
                    </div>

                    <div className="field-group">
                      <label>Marknadsföring & samarbete (visas i avtalet)</label>
                      <textarea
                        rows={2}
                        value={form.marketingNotes}
                        onChange={(e) =>
                          handleChange("marketingNotes", e.target.value)
                        }
                        placeholder="Ex: Helsingbuss omnämns på företagets hemsida och sociala medier. Helsingbuss erbjuder utlottningar av resor 1 gång/år..."
                      />
                    </div>

                    <div className="field-group">
                      <label>Interna anteckningar (syns bara för Helsingbuss)</label>
                      <textarea
                        rows={2}
                        value={form.internalNotes}
                        onChange={(e) =>
                          handleChange("internalNotes", e.target.value)
                        }
                        placeholder="Ex: Viktigt att hålla extra dialog inför derby, fakturaadress är annan än besöksadress osv."
                      />
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <div className="footer-left">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handlePreviewPdf}
                    >
                      Förhandsvisa avtal (PDF)
                    </button>
                  </div>
                  <div className="footer-right">
                    {isEdit && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? "Tar bort..." : "Ta bort avtal"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "Sparar..." : isEdit ? "Spara avtal" : "Spara utkast"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .layout {
          display: flex;
          min-height: 100vh;
          background: #f5f4f0;
        }

        .page {
          flex: 1;
          padding: 80px 24px 28px;
        }

        .page-inner {
          max-width: 1280px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }

        .page-subtitle {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .page-grid {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 16px;
          max-width: 1280px;
        }

        .card {
          background: #ffffff;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
        }

        .card--list {
          min-height: 300px;
        }

        .card--form {
          min-height: 320px;
        }

        .card-header {
          padding: 18px 20px 14px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .card-header h2 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .card-subtitle {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }

        .card-count {
          font-size: 12px;
          color: #9ca3af;
          white-space: nowrap;
        }

        .card-body {
          padding: 16px 20px 4px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card-footer {
          padding: 12px 20px 14px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .footer-left {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .footer-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .list {
          padding: 8px 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .list-empty {
          padding: 10px 12px 14px;
          font-size: 13px;
          color: #6b7280;
        }

        .list-item {
          border-radius: 10px;
          padding: 8px 10px;
          border: 1px solid transparent;
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .list-item:hover {
          background: #eef2ff;
          border-color: #c7d2fe;
          box-shadow: 0 3px 10px rgba(37, 99, 235, 0.07);
        }

        .list-item--active {
          background: #e0ebff;
          border-color: #2563eb;
          box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.4),
            0 10px 25px rgba(15, 23, 42, 0.18);
        }

        .list-main {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .list-title {
          font-size: 14px;
          font-weight: 600;
        }

        .list-meta {
          font-size: 12px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .section {
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 14px 14px 12px;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
        }

        .section-subtitle {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .section-step {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 999px;
          background: #e5e7eb;
          color: #374151;
          white-space: nowrap;
        }

        .grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .grid-three {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        label {
          font-size: 12px;
          font-weight: 500;
          color: #374151;
        }

        input,
        select,
        textarea {
          border-radius: 8px;
          border: 1px solid #d1d5db;
          padding: 7px 9px;
          font-size: 13px;
          width: 100%;
          outline: none;
          background: #ffffff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease,
            background 0.15s ease;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
          background: #ffffff;
        }

        textarea {
          resize: vertical;
        }

        .help-text {
          font-size: 11px;
          color: #9ca3af;
        }

        .alert {
          margin: 8px 12px 0;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 12px;
          display: flex;
          align-items: center;
        }

        .alert-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background: #ecfdf3;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .badge {
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
        }

        .badge--green {
          background: #ecfdf3;
          color: #166534;
        }

        .badge--red {
          background: #fef2f2;
          color: #b91c1c;
        }

        .badge--grey {
          background: #e5e7eb;
          color: #374151;
        }

        .btn {
          border-radius: 999px;
          border: 1px solid transparent;
          font-size: 13px;
          padding: 6px 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s ease, color 0.15s ease,
            box-shadow 0.15s ease, border-color 0.15s ease;
          white-space: nowrap;
        }

        .btn-primary {
          background: #194c66;
          color: #ffffff;
          border-color: #194c66;
          box-shadow: 0 8px 20px rgba(25, 76, 102, 0.25);
        }

        .btn-primary:hover {
          background: #123548;
          border-color: #123548;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35);
        }

        .btn-ghost {
          background: transparent;
          color: #374151;
          border-color: #d1d5db;
        }

        .btn-ghost:hover {
          background: #f3f4f6;
        }

        .btn-danger {
          background: #b91c1c;
          color: #ffffff;
          border-color: #b91c1c;
        }

        .btn-danger:hover {
          background: #991b1b;
          border-color: #991b1b;
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: default;
          box-shadow: none;
        }

        @media (max-width: 1024px) {
          .page-grid {
            grid-template-columns: minmax(0, 1.2fr);
          }

          .card--list {
            order: 2;
          }

          .card--form {
            order: 1;
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 20px 10px 22px;
          }

          .page-inner {
            max-width: 100%;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .page-grid {
            max-width: 100%;
          }

          .grid-two,
          .grid-three {
            grid-template-columns: minmax(0, 1fr);
          }

          .card-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .card-footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .footer-right {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </>
  );
}
