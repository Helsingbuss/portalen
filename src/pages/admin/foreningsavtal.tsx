// src/pages/admin/foreningsavtal.tsx

import Head from "next/head";
import { useState, useEffect, ChangeEvent } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import {
  Users,
  FileSignature,
  CalendarDays,
  Percent,
  ShieldCheck,
  DownloadCloud,
  Plus,
  Trash2,
} from "lucide-react";

// Viktigt: dessa värden bör matcha enum/kolumn i databasen
type AgreementStatus = "draft" | "active" | "paused" | "ended";

type AgreementFormState = {
  associationName: string;
  orgNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;

  agreementTitle: string;
  status: AgreementStatus;
  validFrom: string;
  validTo: string;

  minTripsPerYear: string;
  discountType: "none" | "percent" | "fixed";
  discountValue: string;
  ticketKickbackPercent: string;

  bookingTerms: string;
  cancellationTerms: string;
  extrasIncluded: string;

  marketingSupport: string;
  internalNotes: string;
};

type AgreementRow = AgreementFormState & {
  id: string;
  agreementNumber: string;
};

const EMPTY_FORM: AgreementFormState = {
  associationName: "",
  orgNumber: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",

  agreementTitle: "",
  status: "draft",
  validFrom: "",
  validTo: "",

  minTripsPerYear: "",
  discountType: "none",
  discountValue: "",
  ticketKickbackPercent: "",

  bookingTerms: "",
  cancellationTerms: "",
  extrasIncluded: "",

  marketingSupport: "",
  internalNotes: "",
};

function statusLabel(status: AgreementStatus) {
  switch (status) {
    case "draft":
      return "Utkast";
    case "active":
      return "Aktivt";
    case "paused":
      return "Pausat";
    case "ended":
      return "Avslutat";
  }
}

function statusClass(status: AgreementStatus) {
  switch (status) {
    case "draft":
      return "badge badge-draft";
    case "active":
      return "badge badge-active";
    case "paused":
      return "badge badge-paused";
    case "ended":
      return "badge badge-ended";
  }
}

const toStr = (v: any) =>
  v === null || v === undefined ? "" : String(v);

function mapRowToForm(row: AgreementRow): AgreementFormState {
  return {
    associationName: row.associationName || "",
    orgNumber: row.orgNumber || "",
    contactName: row.contactName || "",
    contactEmail: row.contactEmail || "",
    contactPhone: row.contactPhone || "",
    agreementTitle: row.agreementTitle || "",
    status: (row.status as AgreementStatus) || "draft",
    validFrom: row.validFrom || "",
    validTo: row.validTo || "",
    minTripsPerYear: toStr(row.minTripsPerYear || ""),
    discountType:
      (row.discountType as AgreementFormState["discountType"]) || "none",
    discountValue: toStr(row.discountValue || ""),
    ticketKickbackPercent: toStr(row.ticketKickbackPercent || ""),
    bookingTerms: row.bookingTerms || "",
    cancellationTerms: row.cancellationTerms || "",
    extrasIncluded: row.extrasIncluded || "",
    marketingSupport: row.marketingSupport || "",
    internalNotes: row.internalNotes || "",
  };
}

export default function ForeningsavtalPage() {
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AgreementFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    async function loadAgreements() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/foreningsavtal");
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        const json = await res.json();
        const list = (json.agreements || []) as AgreementRow[];
        setAgreements(list);

        if (list.length > 0) {
          setSelectedId(list[0].id);
          setForm(mapRowToForm(list[0]));
        } else {
          setSelectedId(null);
          setForm(EMPTY_FORM);
        }
      } catch (err) {
        console.error("[foreningsavtal] load error:", err);
        setErrorMessage(
          "Kunde inte ladda föreningsavtal. Kontrollera API:t."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAgreements();
  }, []);

  const selectedAgreement =
    agreements.find((a) => a.id === selectedId) || null;

  function handleInputChange(
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleNewAgreement() {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setSaveMessage(null);
    setErrorMessage(null);
  }

  function handleSelectAgreement(a: AgreementRow) {
    setSelectedId(a.id);
    setForm(mapRowToForm(a));
    setSaveMessage(null);
    setErrorMessage(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setSaveMessage(null);
      setErrorMessage(null);

      const res = await fetch("/api/admin/foreningsavtal/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedId || undefined,
          data: {
            ...form,
            minTripsPerYear:
              form.minTripsPerYear.trim() === ""
                ? null
                : Number(form.minTripsPerYear),
            discountValue:
              form.discountValue.trim() === ""
                ? null
                : Number(form.discountValue),
            ticketKickbackPercent:
              form.ticketKickbackPercent.trim() === ""
                ? null
                : Number(form.ticketKickbackPercent),
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[foreningsavtal] save response:", text);
        throw new Error(`Kunde inte spara (status ${res.status}).`);
      }

      const json = await res.json();
      const saved = json.agreement as AgreementRow;

      setAgreements((prev) => {
        const index = prev.findIndex((a) => a.id === saved.id);
        if (index === -1) {
          return [saved, ...prev];
        }
        const next = [...prev];
        next[index] = saved;
        return next;
      });

      setSelectedId(saved.id);
      setForm(mapRowToForm(saved));
      setSaveMessage("Avtalet sparades.");
    } catch (err: any) {
      console.error("[foreningsavtal] save error:", err);
      setErrorMessage(
        err?.message || "Kunde inte spara avtalet. Kontrollera API:t."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;

    const ok = window.confirm(
      "Vill du verkligen radera avtalet? Detta går inte att ångra."
    );
    if (!ok) return;

    try {
      setDeleting(true);
      setSaveMessage(null);
      setErrorMessage(null);

      const res = await fetch("/api/admin/foreningsavtal/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[foreningsavtal] delete response:", text);
        throw new Error(`Kunde inte ta bort (status ${res.status}).`);
      }

      // uppdatera listan lokalt
      const currentList = agreements;
      const newList = currentList.filter((a) => a.id !== selectedId);
      setAgreements(newList);

      if (newList.length > 0) {
        setSelectedId(newList[0].id);
        setForm(mapRowToForm(newList[0]));
      } else {
        setSelectedId(null);
        setForm(EMPTY_FORM);
      }

      setSaveMessage("Avtalet har raderats.");
    } catch (err: any) {
      console.error("[foreningsavtal] delete error:", err);
      setErrorMessage(
        err?.message || "Kunde inte ta bort avtalet. Kontrollera API:t."
      );
    } finally {
      setDeleting(false);
    }
  }

  function handlePreview() {
    if (!selectedAgreement) {
      setErrorMessage("Spara avtalet först innan du förhandsvisar PDF.");
      return;
    }

    try {
      setPreviewing(true);
      setErrorMessage(null);

      if (typeof window === "undefined") return;

      const data = selectedAgreement;

      const previewWindow = window.open("", "_blank");
      if (!previewWindow) {
        throw new Error(
          "Kunde inte öppna förhandsvisning (popup-blockerare?)."
        );
      }

      const html = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8" />
<title>Föreningsavtal – ${data.associationName || "Förening"}</title>
<style>
  *{box-sizing:border-box;}
  body{
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    margin:0;
    padding:32px;
    background:#f5f4f0;
  }
  .sheet{
    max-width:900px;
    margin:0 auto;
    background:#ffffff;
    border-radius:12px;
    padding:32px 40px;
    box-shadow:0 0 0 1px #e5e7eb;
  }
  h1{
    margin:0 0 4px 0;
    font-size:24px;
  }
  h2{
    margin:24px 0 6px 0;
    font-size:16px;
  }
  p, li, td{
    font-size:13px;
    line-height:1.5;
    color:#111827;
  }
  .meta{
    display:flex;
    justify-content:space-between;
    font-size:12px;
    color:#4b5563;
    margin-bottom:18px;
  }
  table.meta-table{
    width:100%;
    border-collapse:collapse;
    margin-top:8px;
  }
  table.meta-table td{
    padding:4px 8px 4px 0;
    vertical-align:top;
  }
  .label{
    width:160px;
    color:#6b7280;
  }
  .section{
    margin-top:18px;
    padding-top:12px;
    border-top:1px solid #e5e7eb;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="meta">
      <div>Helsingbuss – Föreningsavtal</div>
      <div>Avtalsnr: <strong>${data.agreementNumber || ""}</strong></div>
    </div>

    <h1>Föreningsavtal</h1>
    <p>Detta är en förhandsvisning av hur avtalet kan se ut när det skrivs ut eller sparas som PDF.</p>

    <div class="section">
      <h2>1. Parter</h2>
      <table class="meta-table">
        <tr>
          <td class="label">Förening / klubb</td>
          <td>${data.associationName || "-"}</td>
        </tr>
        <tr>
          <td class="label">Organisationsnummer</td>
          <td>${data.orgNumber || "-"}</td>
        </tr>
        <tr>
          <td class="label">Kontaktperson</td>
          <td>${data.contactName || "-"}</td>
        </tr>
        <tr>
          <td class="label">E-post</td>
          <td>${data.contactEmail || "-"}</td>
        </tr>
        <tr>
          <td class="label">Telefon</td>
          <td>${data.contactPhone || "-"}</td>
        </tr>
        <tr>
          <td class="label">Avtalstitel (internt)</td>
          <td>${data.agreementTitle || "-"}</td>
        </tr>
        <tr>
          <td class="label">Giltighet</td>
          <td>${data.validFrom || "—"} – ${data.validTo || "—"}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2>2. Rabatter & volymkrav</h2>
      <p><strong>Minsta antal resor per år:</strong> ${
        data.minTripsPerYear || "Ej angivet"
      }</p>
      <p><strong>Rabatt-typ:</strong> ${
        data.discountType === "percent"
          ? "Procent på ordinarie pris"
          : data.discountType === "fixed"
          ? "Fast rabattsumma"
          : "Ingen rabatt"
      }</p>
      <p><strong>Rabattvärde:</strong> ${
        data.discountValue ? data.discountValue : "Ej angivet"
      }</p>
      <p><strong>Kickback på biljetter:</strong> ${
        data.ticketKickbackPercent
          ? data.ticketKickbackPercent + " %"
          : "Ej angivet"
      }</p>
    </div>

    <div class="section">
      <h2>3. Bokningsregler, avbokning & vad som ingår</h2>
      <p><strong>Bokningsregler (kortfattat)</strong><br/>${
        data.bookingTerms || "Ej angivet."
      }</p>
      <p><strong>Avbokning / uppsägning</strong><br/>${
        data.cancellationTerms || "Ej angivet."
      }</p>
      <p><strong>Vad ingår i avtalet?</strong><br/>${
        data.extrasIncluded || "Ej angivet."
      }</p>
    </div>

    <div class="section">
      <h2>4. Marknadsföring & övrigt</h2>
      <p><strong>Marknadsföring & samarbete</strong><br/>${
        data.marketingSupport || "Ej angivet."
      }</p>
      <p><strong>Interna anteckningar (visas inte för föreningen)</strong><br/>${
        data.internalNotes || "Ej angivet."
      }</p>
    </div>

    <div class="section">
      <h2>5. Signaturer</h2>
      <p>_______________________________<br/>Helsingbuss</p>
      <p style="margin-top:32px;">_______________________________<br/>${
        data.associationName || "Förening"
      }</p>
    </div>
  </div>
</body>
</html>`;

      previewWindow.document.open();
      previewWindow.document.write(html);
      previewWindow.document.close();
    } catch (err: any) {
      console.error("[foreningsavtal] preview error:", err);
      setErrorMessage(
        err?.message || "Kunde inte öppna förhandsvisning av avtalet."
      );
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <>
      <Head>
        <title>Föreningsavtal – Helsingbuss Admin</title>
      </Head>

      <Header />
      <AdminMenu active="foreningsavtal" />

      <div className="page">
        <div className="page-inner">
          <div className="page-header">
            <div>
              <h1>Föreningsavtal</h1>
              <p>
                Skapa och hantera avtal med föreningar, supporterklubbar och
                organisationer. Allt samlat så att pris, villkor och volymkrav
                blir tydligt – både för dig och kunden.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleNewAgreement}
            >
              <Plus size={18} />
              Skapa nytt avtal
            </button>
          </div>

          <div className="layout-grid">
            <aside className="sidebar">
              <div className="sidebar-header">
                <Users size={18} />
                <span>Alla föreningsavtal</span>
              </div>

              {loading ? (
                <div className="sidebar-loading">Laddar avtal...</div>
              ) : (
                <ul className="agreement-list">
                  {agreements.map((a) => (
                    <li
                      key={a.id}
                      className={
                        "agreement-item" +
                        (a.id === selectedId ? " agreement-item-active" : "")
                      }
                      onClick={() => handleSelectAgreement(a)}
                    >
                      <div className="agreement-title">
                        <span className="agreement-name">
                          {a.associationName || "Namnlös förening"}
                        </span>
                        <span className={statusClass(a.status)}>
                          {statusLabel(a.status)}
                        </span>
                      </div>
                      <div className="agreement-meta">
                        <span>{a.agreementNumber || "Utan avtalsnummer"}</span>
                        {a.validFrom && a.validTo ? (
                          <span>
                            {a.validFrom} – {a.validTo}
                          </span>
                        ) : (
                          <span>Ingen giltighet satt</span>
                        )}
                      </div>
                    </li>
                  ))}
                  {agreements.length === 0 && !loading && (
                    <li className="agreement-empty">
                      Inga föreningsavtal skapade ännu. Börja med knappen{" "}
                      <strong>“Skapa nytt avtal”</strong>.
                    </li>
                  )}
                </ul>
              )}

              <div className="sidebar-footer">
                <p>
                  Senare kan vi lägga till filter, sök och export av
                  föreningsavtal här.
                </p>
              </div>
            </aside>

            <section className="content">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <FileSignature size={20} />
                    <div>
                      <h2>
                        {selectedAgreement
                          ? "Redigera föreningsavtal"
                          : "Nytt föreningsavtal"}
                      </h2>
                      <p>
                        Fyll i föreningens uppgifter, rabattupplägg och villkor.
                        Senare kan detta ligga till grund för PDF-avtal och
                        digital signering.
                      </p>
                    </div>
                  </div>

                  {selectedAgreement && (
                    <div className="card-badge">
                      <span>Avtalsnummer</span>
                      <strong>{selectedAgreement.agreementNumber}</strong>
                    </div>
                  )}
                </div>

                <div className="card-body">
                  {/* Steg 1 */}
                  <section className="section">
                    <div className="section-header">
                      <div className="section-title">
                        <Users size={18} />
                        <h3>Grunduppgifter om föreningen</h3>
                      </div>
                      <span className="section-tag">Steg 1</span>
                    </div>

                    <div className="grid-two">
                      <div className="field">
                        <label>Förening / klubb *</label>
                        <input
                          type="text"
                          name="associationName"
                          value={form.associationName}
                          onChange={handleInputChange}
                          placeholder="Ex: HIF Supporterklubb Kärnan"
                        />
                      </div>

                      <div className="field">
                        <label>Organisationsnummer</label>
                        <input
                          type="text"
                          name="orgNumber"
                          value={form.orgNumber}
                          onChange={handleInputChange}
                          placeholder="Ex: 8024-XXXX"
                        />
                      </div>

                      <div className="field">
                        <label>Kontaktperson *</label>
                        <input
                          type="text"
                          name="contactName"
                          value={form.contactName}
                          onChange={handleInputChange}
                          placeholder="Namn på ansvarig"
                        />
                      </div>

                      <div className="field">
                        <label>E-post *</label>
                        <input
                          type="email"
                          name="contactEmail"
                          value={form.contactEmail}
                          onChange={handleInputChange}
                          placeholder="namn@forening.se"
                        />
                      </div>

                      <div className="field">
                        <label>Telefon</label>
                        <input
                          type="tel"
                          name="contactPhone"
                          value={form.contactPhone}
                          onChange={handleInputChange}
                          placeholder="+46 7X XXX XX XX"
                        />
                      </div>

                      <div className="field">
                        <label>Avtalstitel (internt)</label>
                        <input
                          type="text"
                          name="agreementTitle"
                          value={form.agreementTitle}
                          onChange={handleInputChange}
                          placeholder="Ex: Föreningsavtal 2025–2027 – HIF Supporter"
                        />
                      </div>
                    </div>

                    <div className="grid-three">
                      <div className="field">
                        <label>Avtalsstatus</label>
                        <select
                          name="status"
                          value={form.status}
                          onChange={handleInputChange}
                        >
                          <option value="draft">Utkast</option>
                          <option value="active">Aktivt</option>
                          <option value="paused">Pausat</option>
                          <option value="ended">Avslutat</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>Giltigt från</label>
                        <input
                          type="date"
                          name="validFrom"
                          value={form.validFrom}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="field">
                        <label>Giltigt till</label>
                        <input
                          type="date"
                          name="validTo"
                          value={form.validTo}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Steg 2 */}
                  <section className="section">
                    <div className="section-header">
                      <div className="section-title">
                        <Percent size={18} />
                        <h3>Rabatter & volymkrav</h3>
                      </div>
                      <span className="section-tag">Steg 2</span>
                    </div>

                    <div className="grid-three">
                      <div className="field">
                        <label>Minsta resor per år</label>
                        <input
                          type="number"
                          min={0}
                          name="minTripsPerYear"
                          value={form.minTripsPerYear}
                          onChange={handleInputChange}
                          placeholder="Ex: 5"
                        />
                      </div>

                      <div className="field">
                        <label>Rabatt-typ</label>
                        <select
                          name="discountType"
                          value={form.discountType}
                          onChange={handleInputChange}
                        >
                          <option value="none">Ingen rabatt</option>
                          <option value="percent">
                            Procent på ordinarie pris
                          </option>
                          <option value="fixed">Fast rabattsumma</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>
                          Rabattvärde{" "}
                          {form.discountType === "percent"
                            ? "(%)"
                            : form.discountType === "fixed"
                            ? "(kr per resa)"
                            : ""}
                        </label>
                        <input
                          type="number"
                          min={0}
                          name="discountValue"
                          value={form.discountValue}
                          onChange={handleInputChange}
                          placeholder={
                            form.discountType === "percent"
                              ? "Ex: 10"
                              : "Ex: 500"
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Kickback på biljetter (%)</label>
                        <input
                          type="number"
                          min={0}
                          name="ticketKickbackPercent"
                          value={form.ticketKickbackPercent}
                          onChange={handleInputChange}
                          placeholder="Ex: 5"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Steg 3 */}
                  <section className="section">
                    <div className="section-header">
                      <div className="section-title">
                        <ShieldCheck size={18} />
                        <h3>Villkor, uppsägning & tillägg</h3>
                      </div>
                      <span className="section-tag">Steg 3</span>
                    </div>

                    <div className="field">
                      <label>Bokningsregler (kortfattat)</label>
                      <textarea
                        name="bookingTerms"
                        value={form.bookingTerms}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Ex: Bokning senast 14 dagar före avresa, preliminär passagerarlista 7 dagar före, slutlig lista 3 dagar före..."
                      />
                    </div>

                    <div className="field">
                      <label>Avbokning / uppsägning</label>
                      <textarea
                        name="cancellationTerms"
                        value={form.cancellationTerms}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Ex: Avbokning utan kostnad t.o.m. 30 dagar före första resa, därefter 25 % av beräknat ordervärde..."
                      />
                    </div>

                    <div className="field">
                      <label>Vad ingår i avtalet?</label>
                      <textarea
                        name="extrasIncluded"
                        value={form.extrasIncluded}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Ex: Rabatterade priser på alla supporterresor, prioriterad buss vid slutspel, möjlighet att profilera bussen med föreningens flaggor..."
                      />
                    </div>
                  </section>

                  {/* Steg 4 */}
                  <section className="section">
                    <div className="section-header">
                      <div className="section-title">
                        <CalendarDays size={18} />
                        <h3>Marknadsstöd & interna anteckningar</h3>
                      </div>
                      <span className="section-tag">Steg 4</span>
                    </div>

                    <div className="field">
                      <label>Marknadsföring & samarbete (visas i avtalet)</label>
                      <textarea
                        name="marketingSupport"
                        value={form.marketingSupport}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Ex: Helsingbuss omnämns på föreningens hemsida och sociala medier. Helsingbuss erbjuder utlottningar av resa 1 ggr/år."
                      />
                    </div>

                    <div className="field">
                      <label>Interna anteckningar (syns bara för Helsingbuss)</label>
                      <textarea
                        name="internalNotes"
                        value={form.internalNotes}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Ex: Viktigt att hålla extra dialog inför derbyn, fakturaadress är annan än besöksadress osv."
                      />
                    </div>
                  </section>
                </div>

                <div className="card-footer">
                  <div className="footer-left">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handlePreview}
                      disabled={previewing || !selectedAgreement}
                    >
                      <DownloadCloud size={18} />
                      {previewing
                        ? "Öppnar förhandsvisning..."
                        : "Förhandsvisa avtal (PDF)"}
                    </button>

                    {saveMessage && (
                      <p className="save-msg">{saveMessage}</p>
                    )}
                    {errorMessage && (
                      <p className="error-msg">{errorMessage}</p>
                    )}
                  </div>
                  <div className="footer-right">
                    <button type="button" className="btn-ghost">
                      Avbryt
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={handleDelete}
                      disabled={deleting || !selectedId}
                    >
                      <Trash2 size={16} />
                      {deleting ? "Tar bort..." : "Ta bort avtal"}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <FileSignature size={18} />
                      {saving ? "Sparar..." : "Spara utkast"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          padding: 80px 24px 28px;
          background: #f5f4f0;
        }

        .page-inner {
          max-width: 1320px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }

        .page-header p {
          margin: 0;
          font-size: 14px;
          color: #4b5563;
          max-width: 520px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          border: none;
          padding: 9px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: #007764;
          color: #ffffff;
          box-shadow: 0 10px 22px rgba(0, 119, 100, 0.25);
          white-space: nowrap;
        }

        .btn-primary:hover {
          background: #006254;
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          background: #ffffff;
          color: #111827;
        }

        .btn-secondary[disabled] {
          opacity: 0.6;
          cursor: default;
        }

        .btn-secondary:hover:not([disabled]) {
          background: #f3f4f6;
        }

        .btn-ghost {
          border: none;
          background: transparent;
          font-size: 13px;
          color: #6b7280;
          padding: 6px 10px;
          cursor: pointer;
        }

        .btn-danger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          border: 1px solid #fecaca;
          padding: 7px 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          background: #fef2f2;
          color: #b91c1c;
        }

        .btn-danger[disabled] {
          opacity: 0.6;
          cursor: default;
        }

        .btn-danger:hover:not([disabled]) {
          background: #fee2e2;
        }

        .layout-grid {
          display: grid;
          grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
          gap: 16px;
          align-items: flex-start;
        }

        .sidebar {
          background: #f3f4f6;
          border-radius: 14px;
          padding: 12px 12px 10px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #111827;
        }

        .sidebar-loading {
          padding: 8px;
          font-size: 12px;
          color: #4b5563;
        }

        .agreement-list {
          list-style: none;
          margin: 4px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .agreement-item {
          border-radius: 10px;
          padding: 8px 9px;
          border: 1px solid transparent;
          background: #ffffff;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease,
            transform 0.05s ease;
        }

        .agreement-item:hover {
          border-color: #cbd5f5;
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
          transform: translateY(-1px);
        }

        .agreement-item-active {
          border-color: #007764;
          box-shadow: 0 10px 22px rgba(0, 119, 100, 0.2);
        }

        .agreement-empty {
          font-size: 12px;
          color: #6b7280;
          padding: 6px 8px 2px;
        }

        .agreement-title {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 2px;
        }

        .agreement-name {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
        }

        .agreement-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 11px;
          color: #6b7280;
        }

        .badge {
          border-radius: 999px;
          padding: 2px 7px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border: 1px solid transparent;
        }

        .badge-draft {
          background: #eef2ff;
          color: #3730a3;
          border-color: #c7d2fe;
        }

        .badge-active {
          background: #ecfdf3;
          color: #166534;
          border-color: #bbf7d0;
        }

        .badge-paused {
          background: #fef9c3;
          color: #854d0e;
          border-color: #facc15;
        }

        .badge-ended {
          background: #fef2f2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .sidebar-footer {
          margin-top: 4px;
          font-size: 11px;
          color: #6b7280;
        }

        .content {
          min-width: 0;
        }

        .card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
          display: flex;
          flex-direction: column;
        }

        .card-header {
          padding: 14px 16px 8px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .card-title {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .card-title h2 {
          margin: 0 0 2px 0;
          font-size: 17px;
          font-weight: 600;
        }

        .card-title p {
          margin: 0;
          font-size: 13px;
          color: #4b5563;
          max-width: 520px;
        }

        .card-badge {
          text-align: right;
          font-size: 11px;
          color: #6b7280;
          white-space: nowrap;
        }

        .card-badge strong {
          display: block;
          font-size: 13px;
          color: #111827;
        }

        .card-body {
          padding: 12px 16px 8px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section {
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 10px 12px 10px;
          background: #f9fafb;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .section-title h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .section-tag {
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 999px;
          background: #e5e7eb;
          color: #4b5563;
        }

        .grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
        }

        .grid-three {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px 14px;
          margin-top: 8px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 13px;
        }

        .field label {
          font-weight: 500;
          color: #374151;
        }

        .field input,
        .field select,
        .field textarea {
          border-radius: 8px;
          border: 1px solid #d1d5db;
          padding: 7px 9px;
          font-size: 13px;
          outline: none;
          resize: vertical;
        }

        .field textarea {
          min-height: 60px;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #007764;
          box-shadow: 0 0 0 1px rgba(0, 119, 100, 0.18);
        }

        .card-footer {
          padding: 10px 16px 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .footer-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .save-msg {
          font-size: 12px;
          color: #166534;
        }

        .error-msg {
          font-size: 12px;
          color: #b91c1c;
        }

        @media (max-width: 1180px) {
          .page-inner {
            max-width: 100%;
          }
        }

        @media (max-width: 1024px) {
          .layout-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .sidebar {
            order: 2;
          }

          .content {
            order: 1;
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 20px 10px 22px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .grid-two,
          .grid-three {
            grid-template-columns: minmax(0, 1fr);
          }

          .card-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .card-badge {
            text-align: left;
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
