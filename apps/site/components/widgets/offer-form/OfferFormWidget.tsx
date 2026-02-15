"use client";

import { useMemo, useState } from "react";
import styles from "./offerForm.module.css";
import type { OfferFormStep, OfferFormState, OfferSubmitPayload, OfferSubmitResponse, CustomerType, TripType, HeardFrom } from "./offerForm.types";
import { offerFormStateSchema } from "./offerForm.schema";
import { clampInt, computeReturnRoute, createDefaultState, safeTrim } from "./offerForm.utils";
import { trackOfferFormEvent } from "@/lib/telemetry/offerFormTelemetry";
import Image from "next/image";

function Info({ text }: { text: string }) {
  return (
    <span className={styles.infoWrap} tabIndex={0} aria-label="Info">
      <span className={styles.infoDot} aria-hidden="true">i</span>
      <span className={styles.tip}>{text}</span>
    </span>
  );
}

export default function OfferFormWidget() {
  const [step, setStep] = useState<OfferFormStep>(1);
  const [state, setState] = useState<OfferFormState>(() => createDefaultState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ offerNo: string } | null>(null);

  const stepLabel = useMemo(() => {
    return step === 1 ? "1. Resa" : step === 2 ? "2. Kontaktuppgifter & Önskemål" : "Klart";
  }, [step]);

  function setField<K extends keyof OfferFormState>(key: K, value: OfferFormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[String(key)];
      return copy;
    });
  }

  function setFacility<K extends keyof OfferFormState["facilities"]>(key: K, value: boolean) {
    setState((s) => ({ ...s, facilities: { ...s.facilities, [key]: value } }));
  }

  function validateCurrentStep(): boolean {
    const parsed = offerFormStateSchema.safeParse(state);
    if (parsed.success) {
      setErrors({});
      return true;
    }

    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path?.[0];
      if (!path) continue;

      // Steg-filtrering
      const step1Fields = new Set(["fromAddress","toAddress","date","time","passengers","tripType","useBusOnSite","returnSwapRoute","returnFromAddress","returnToAddress"]);
      const step2Fields = new Set(["customerType","name","phone","email","onboardContact","orgName","orgNr","resPlan","facilities","accessibilityNotes","heardFrom","newsletter"]);

      if (step === 1 && !step1Fields.has(String(path))) continue;
      if (step === 2 && !step2Fields.has(String(path))) continue;

      next[String(path)] = issue.message;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function nextStep() {
    if (!validateCurrentStep()) return;
    trackOfferFormEvent({ type: "next", stepFrom: step, stepTo: 2 });
    setStep(2);
  }

  function prevStep() {
    trackOfferFormEvent({ type: "back", stepFrom: step, stepTo: 1 });
    setStep(1);
  }

  async function submit() {
    trackOfferFormEvent({ type: "submit_click" });
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    setErrors({});
    try {
      // bygg payload
      const { rf, rt } = computeReturnRoute(state);
      const payload: OfferSubmitPayload = {
        source: "site_widget",
        state: {
          ...state,
          fromAddress: safeTrim(state.fromAddress),
          toAddress: safeTrim(state.toAddress),
          returnFromAddress: safeTrim(rf),
          returnToAddress: safeTrim(rt),
          name: safeTrim(state.name),
          phone: safeTrim(state.phone),
          email: safeTrim(state.email),
          onboardContact: safeTrim(state.onboardContact),
          orgName: safeTrim(state.orgName),
          orgNr: safeTrim(state.orgNr),
          resPlan: safeTrim(state.resPlan),
          accessibilityNotes: safeTrim(state.accessibilityNotes),
        },
        meta: {
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          url: typeof window !== "undefined" ? window.location.href : undefined,
        },
      };

      const res = await fetch("/api/offer-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as OfferSubmitResponse;
      if (!data.ok) {
        trackOfferFormEvent({ type: "submit_error", message: data.message, code: data.code });
        setErrors({ submit: data.message || "Något gick fel. Försök igen." });
        return;
      }

      trackOfferFormEvent({ type: "submit_ok", offerNo: data.offerNo });
      setSuccess({ offerNo: data.offerNo });
      setStep(3);
    } catch (e: any) {
      trackOfferFormEvent({ type: "submit_error", message: "Network/Unhandled", code: "NETWORK" });
      setErrors({ submit: "Något gick fel vid skickning. Kontrollera anslutning och försök igen." });
    } finally {
      setSubmitting(false);
    }
  }

  // när tur/retur slås på: default = “vänd rutt” = ja
  function onTripTypeChange(v: TripType) {
    setState((s) => ({
      ...s,
      tripType: v,
      returnSwapRoute: v === "roundtrip" ? true : s.returnSwapRoute,
    }));
  }

  // UI
  if (success) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.success}>
            <div className={styles.successIcon} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className={styles.successTitle}>Tack! Din offertförfrågan är skickad</h3>
            <p className={styles.successText}>
              Ditt offertnummer är: <span className={styles.offerNo}>{success.offerNo}</span>
            </p>
            <p className={styles.successText}>Du får ett prisförslag inom 24 timmar (vardagar 09–18).</p>
            <button className={${styles.btn} } onClick={() => (window.location.href = "/")}>
              Till startsidan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={${styles.card} }>
        <div className={styles.header}>
          <h3 className={styles.title}>Fyll i din resa</h3>

          <div className={styles.steps} aria-label="Steg">
            <span className={${styles.stepPill} }>1. Resa</span>
            <span className={${styles.stepPill} }>2. Kontakt</span>
          </div>
        </div>

        <div className={styles.body}>
          {/* Bild som bakgrundskänsla: sate_bus.jpg (public) */}
          <div style={{ display: "none" }}>
            <Image src="/sate_bus.jpg" alt="" width={10} height={10} />
          </div>

          {step === 1 && (
            <>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Avresa</span>
                    <Info text="Skriv adress, ort eller plats. Ex: Hyllie station, Malmö" />
                    <span className={styles.optional}>(obligatorisk)</span>
                  </div>
                  <input
                    className={styles.input}
                    value={state.fromAddress}
                    onChange={(e) => setField("fromAddress", e.target.value)}
                    placeholder="Adress"
                    autoComplete="off"
                  />
                  {errors.fromAddress && <div className={styles.err}>{errors.fromAddress}</div>}
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Destination</span>
                    <Info text="Skriv adress, ort eller plats. Ex: Liseberg, Göteborg" />
                    <span className={styles.optional}>(obligatorisk)</span>
                  </div>
                  <input
                    className={styles.input}
                    value={state.toAddress}
                    onChange={(e) => setField("toAddress", e.target.value)}
                    placeholder="Adress"
                    autoComplete="off"
                  />
                  {errors.toAddress && <div className={styles.err}>{errors.toAddress}</div>}
                </div>
              </div>

              <div className={styles.grid3} style={{ marginTop: 12 }}>
                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Datum</span>
                    <span className={styles.optional}>(obligatorisk)</span>
                  </div>
                  <input
                    className={styles.input}
                    type="date"
                    value={state.date}
                    onChange={(e) => setField("date", e.target.value)}
                  />
                  {errors.date && <div className={styles.err}>{errors.date}</div>}
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Tid</span>
                    <span className={styles.optional}>(obligatorisk)</span>
                  </div>
                  <input
                    className={styles.input}
                    type="time"
                    value={state.time}
                    onChange={(e) => setField("time", e.target.value)}
                  />
                  {errors.time && <div className={styles.err}>{errors.time}</div>}
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Antal resenärer</span>
                    <span className={styles.optional}>(obligatorisk)</span>
                  </div>
                  <input
                    className={styles.input}
                    inputMode="numeric"
                    value={state.passengers}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      if (v === "") return setField("passengers", "");
                      const n = clampInt(Number(v.replace(/\\D/g, "")), 1, 999);
                      setField("passengers", Number.isFinite(n) ? n : "");
                    }}
                    placeholder="Ange antal"
                  />
                  {errors.passengers && <div className={styles.err}>{errors.passengers}</div>}
                </div>
              </div>

              <div className={styles.row} style={{ marginTop: 12, justifyContent: "space-between" }}>
                <div className={styles.field} style={{ flex: "1 1 320px" }}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Enkel / Tur & retur</span>
                  </div>
                  <div className={styles.radioGroup} role="radiogroup" aria-label="Typ av resa">
                    <div
                      className={${styles.radioBtn} }
                      onClick={() => onTripTypeChange("oneway")}
                      role="radio"
                      aria-checked={state.tripType === "oneway"}
                      tabIndex={0}
                    >
                      Enkel
                    </div>
                    <div
                      className={${styles.radioBtn} }
                      onClick={() => onTripTypeChange("roundtrip")}
                      role="radio"
                      aria-checked={state.tripType === "roundtrip"}
                      tabIndex={0}
                    >
                      Tur & retur
                    </div>
                  </div>
                </div>

                <label className={styles.toggleRow} style={{ flex: "0 0 auto" }}>
                  <input
                    type="checkbox"
                    checked={state.useBusOnSite}
                    onChange={(e) => setField("useBusOnSite", e.target.checked)}
                  />
                  <span className={styles.label} style={{ fontSize: 12 }}>Använda bussen på plats?</span>
                </label>
              </div>

              {state.tripType === "roundtrip" && (
                <div style={{ marginTop: 10 }}>
                  <div className={styles.inlineNote} style={{ marginBottom: 8 }}>
                    Tur & retur: vill kunden <b>vända på rutten</b> (retur = destination → avresa)?
                  </div>

                  <div className={styles.radioGroup}>
                    <div
                      className={${styles.radioBtn} }
                      onClick={() => setField("returnSwapRoute", true)}
                      role="button"
                      tabIndex={0}
                    >
                      Ja, vänd rutten
                    </div>
                    <div
                      className={${styles.radioBtn} }
                      onClick={() => setField("returnSwapRoute", false)}
                      role="button"
                      tabIndex={0}
                    >
                      Nej, annan retur
                    </div>
                  </div>

                  {!state.returnSwapRoute && (
                    <div className={styles.grid2} style={{ marginTop: 10 }}>
                      <div className={styles.field}>
                        <div className={styles.labelRow}>
                          <span className={styles.label}>Retur – Avresa</span>
                          <span className={styles.optional}>(obligatorisk)</span>
                        </div>
                        <input
                          className={styles.input}
                          value={state.returnFromAddress}
                          onChange={(e) => setField("returnFromAddress", e.target.value)}
                          placeholder="Adress"
                        />
                        {errors.returnFromAddress && <div className={styles.err}>{errors.returnFromAddress}</div>}
                      </div>

                      <div className={styles.field}>
                        <div className={styles.labelRow}>
                          <span className={styles.label}>Retur – Destination</span>
                          <span className={styles.optional}>(obligatorisk)</span>
                        </div>
                        <input
                          className={styles.input}
                          value={state.returnToAddress}
                          onChange={(e) => setField("returnToAddress", e.target.value)}
                          placeholder="Adress"
                        />
                        {errors.returnToAddress && <div className={styles.err}>{errors.returnToAddress}</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errors.submit && <div className={styles.err} style={{ marginTop: 10 }}>{errors.submit}</div>}

              <div className={styles.actions}>
                <div />
                <button className={${styles.btn} } onClick={nextStep}>
                  Fortsätt
                </button>
              </div>

              <div className={styles.footerNote}>
                Genom att skicka offertförfrågan godkänner du våra resevillkor och integritetspolicy.
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className={styles.labelRow} style={{ marginBottom: 8 }}>
                <span className={styles.label}>Vem bokar</span>
                <span className={styles.optional}>(obligatorisk)</span>
              </div>

              <div className={styles.radioGroup} style={{ marginBottom: 12 }}>
                {[
                  ["privat","Privatperson"],
                  ["foretag","Företag"],
                  ["forening","Förening"],
                ].map(([v, label]) => (
                  <div
                    key={v}
                    className={${styles.radioBtn} }
                    onClick={() => setField("customerType", v as CustomerType)}
                    role="button"
                    tabIndex={0}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {(state.customerType === "foretag" || state.customerType === "forening") && (
                <div className={styles.grid2} style={{ marginBottom: 12 }}>
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <span className={styles.label}>{state.customerType === "foretag" ? "Företagsnamn" : "Föreningsnamn"}</span>
                      <span className={styles.optional}>(obligatorisk)</span>
                    </div>
                    <input className={styles.input} value={state.orgName} onChange={(e) => setField("orgName", e.target.value)} placeholder="Namn" />
                    {errors.orgName && <div className={styles.err}>{errors.orgName}</div>}
                  </div>

                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <span className={styles.label}>Org.nr</span>
                      <span className={styles.optional}>(obligatorisk)</span>
                    </div>
                    <input className={styles.input} value={state.orgNr} onChange={(e) => setField("orgNr", e.target.value)} placeholder="Ex: 802534-9187" />
                    {errors.orgNr && <div className={styles.err}>{errors.orgNr}</div>}
                  </div>
                </div>
              )}

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Namn</span>
                    <span className={styles.optional}>(obligatorisk)</span>
                  </div>
                  <input className={styles.input} value={state.name} onChange={(e) => setField("name", e.target.value)} placeholder="Fullständiga namn" />
                  {errors.name && <div className={styles.err}>{errors.name}</div>}
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Telefon</span>
                    <span className={styles.optional}>(obligatorisk)</span>
                  </div>
                  <input className={styles.input} value={state.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="Telefonnummer" />
                  {errors.phone && <div className={styles.err}>{errors.phone}</div>}
                </div>
              </div>

              <div className={styles.grid2} style={{ marginTop: 12 }}>
                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>E-postadress</span>
                    <span className={styles.optional}>(obligatorisk)</span>
                  </div>
                  <input className={styles.input} value={state.email} onChange={(e) => setField("email", e.target.value)} placeholder="E-post" />
                  {errors.email && <div className={styles.err}>{errors.email}</div>}
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Kontaktperson ombord</span>
                    <Info text="Om annan person än bokaren ska vara kontakt ombord – skriv namn & telefon." />
                    <span className={styles.optional}>(valfritt)</span>
                  </div>
                  <input className={styles.input} value={state.onboardContact} onChange={(e) => setField("onboardContact", e.target.value)} placeholder="Fullständiga namn, telefon" />
                </div>
              </div>

              <div className={styles.field} style={{ marginTop: 12 }}>
                <div className={styles.labelRow}>
                  <span className={styles.label}>Resans upplägg</span>
                  <Info text="Beskriv resan: tider, stopp, väntetid, ev. retur, bokad aktivitet, etc." />
                  <span className={styles.optional}>(valfritt)</span>
                </div>
                <textarea className={styles.textarea} value={state.resPlan} onChange={(e) => setField("resPlan", e.target.value)} placeholder="Ex: Avresa 08:00, väntetid 6h, retur 18:30..." />
              </div>

              <div className={styles.labelRow} style={{ marginTop: 14 }}>
                <span className={styles.label}>Komfort & ombord</span>
                <span className={styles.optional}>(valfritt)</span>
              </div>

              <div className={styles.row} style={{ marginTop: 8 }}>
                <label className={styles.toggleRow}><input type="checkbox" checked={state.facilities.wc} onChange={(e) => setFacility("wc", e.target.checked)} /> <span>WC</span></label>
                <label className={styles.toggleRow}><input type="checkbox" checked={state.facilities.eluttag_usb} onChange={(e) => setFacility("eluttag_usb", e.target.checked)} /> <span>Eluttag/USB</span></label>
                <label className={styles.toggleRow}><input type="checkbox" checked={state.facilities.film_presentation} onChange={(e) => setFacility("film_presentation", e.target.checked)} /> <span>Film/Presentation</span></label>
                <label className={styles.toggleRow}><input type="checkbox" checked={state.facilities.tillganglighet} onChange={(e) => setFacility("tillganglighet", e.target.checked)} /> <span>Tillgänglighet</span></label>
                <label className={styles.toggleRow}><input type="checkbox" checked={state.facilities.bagage_extra} onChange={(e) => setFacility("bagage_extra", e.target.checked)} /> <span>Bagageutrymme extra</span></label>
              </div>

              <div className={styles.field} style={{ marginTop: 10 }}>
                <div className={styles.labelRow}>
                  <span className={styles.label}>Tillgänglighet / särskilda behov</span>
                  <span className={styles.optional}>(valfritt)</span>
                </div>
                <input
                  className={styles.input}
                  value={state.accessibilityNotes}
                  onChange={(e) => setField("accessibilityNotes", e.target.value)}
                  placeholder="Berätta om rullstol, allergi, extra tid vid påstigning..."
                />
              </div>

              <div className={styles.grid2} style={{ marginTop: 12 }}>
                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>Var fick du höra om oss?</span>
                    <span className={styles.optional}>(valfritt)</span>
                  </div>
                  <select
                    className={styles.select}
                    value={state.heardFrom}
                    onChange={(e) => setField("heardFrom", e.target.value as HeardFrom)}
                  >
                    <option value="">Välj ett alternativ</option>
                    <option value="google">Google</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="rekommendation">Rekommendation</option>
                    <option value="tidigare_kund">Tidigare kund</option>
                    <option value="annan">Annan</option>
                  </select>
                </div>

                <div className={styles.field} style={{ alignContent: "end" }}>
                  <label className={styles.toggleRow}>
                    <input type="checkbox" checked={state.newsletter} onChange={(e) => setField("newsletter", e.target.checked)} />
                    <span>Jag vill gärna få nyhetsbrev med resor & erbjudanden</span>
                  </label>
                </div>
              </div>

              {errors.submit && <div className={styles.err} style={{ marginTop: 10 }}>{errors.submit}</div>}

              <div className={styles.actions}>
                <button className={${styles.btn} } onClick={prevStep}>
                  Tillbaka
                </button>
                <button className={${styles.btn} } onClick={submit} disabled={submitting}>
                  {submitting ? "Skickar..." : "Skicka förfrågan"}
                </button>
              </div>

              <div className={styles.footerNote}>
                Genom att skicka offertförfrågan godkänner du våra resevillkor och integritetspolicy.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
