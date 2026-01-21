"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TripType = "hyra-buss" | "brollop" | "event";

const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: "hyra-buss", label: "Hyra buss" },
  { value: "brollop", label: "Bröllopskörning" },
  { value: "event", label: "Event & Specialresor" },
];

export default function QuickActionModule() {
  const router = useRouter();

  const [tripType, setTripType] = useState<TripType>("hyra-buss");
  const [date, setDate] = useState<string>("");
  const [pax, setPax] = useState<string>("");

  const styles = useMemo(() => {
    const s: Record<string, React.CSSProperties> = {
      wrap: { marginTop: 28, maxWidth: 1120 },

      glass: {
        borderRadius: 18,
        padding: 18,
        border: "1px solid rgba(255,255,255,0.18)",
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.42) 0%, rgba(2,6,23,0.32) 100%)",
        boxShadow: "0 18px 70px rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
      },

      kicker: {
        fontSize: 12,
        letterSpacing: 0.18,
        textTransform: "uppercase",
        opacity: 0.85,
        color: "rgba(255,255,255,0.86)",
      },

      title: {
        marginTop: 6,
        marginBottom: 6,
        fontSize: 24,
        lineHeight: 1.15,
        fontWeight: 700,
        color: "rgba(255,255,255,0.96)",
      },

      desc: {
        marginTop: 0,
        marginBottom: 0,
        fontSize: 14,
        color: "rgba(255,255,255,0.86)",
      },

      divider: {
        marginTop: 14,
        width: 58,
        height: 3,
        borderRadius: 99,
        background:
          "linear-gradient(90deg, rgba(180,126,46,1) 0%, rgba(238,214,149,0.95) 45%, rgba(180,126,46,0.65) 100%)",
        boxShadow: "0 2px 10px rgba(180,126,46,0.35)",
      },

      card: {
        marginTop: 16,
        borderRadius: 16,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.20)",
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 14px 34px rgba(0,0,0,0.25)",
      },

      //  VIKTIG FIX: minmax(0, ) gör att kolumner får krympa utan att gå in i varandra
      grid: {
        display: "grid",
        gap: 18,
        gridTemplateColumns:
          "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) auto",
        alignItems: "end",
      },

      //  VIKTIG FIX: tillåt barn att krympa
      field: {
        display: "grid",
        gap: 6,
        minWidth: 0,
      },

      label: {
        fontSize: 12,
        fontWeight: 700,
        color: "rgba(15,23,42,0.78)",
      },

      //  VIKTIG FIX: boxSizing + minWidth 0 + width 100% förhindrar överlappning
      input: {
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        height: 44,
        borderRadius: 12,
        border: "1px solid rgba(15,23,42,0.15)",
        padding: "0 12px",
        outline: "none",
        fontSize: 14,
        background: "white",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },

      select: {
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        height: 44,
        borderRadius: 12,
        border: "1px solid rgba(15,23,42,0.15)",
        padding: "0 10px",
        outline: "none",
        fontSize: 14,
        background: "white",
      },

      cta: {
        height: 44,
        minWidth: 120, // så knappen inte trycks ihop
        borderRadius: 12,
        border: "none",
        padding: "0 18px",
        cursor: "pointer",
        background:
          "linear-gradient(180deg, rgba(196,147,64,1) 0%, rgba(160,112,36,1) 100%)",
        color: "white",
        fontWeight: 800,
        fontSize: 14,
        whiteSpace: "nowrap",
        boxShadow: "0 10px 22px rgba(160,112,36,0.32)",
      },

      footer: {
        marginTop: 10,
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "rgba(255,255,255,0.86)",
        fontSize: 13,
      },

      dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background:
          "linear-gradient(180deg, rgba(196,147,64,1) 0%, rgba(160,112,36,1) 100%)",
        boxShadow: "0 2px 10px rgba(196,147,64,0.35)",
        flex: "0 0 auto",
      },
    };

    return s;
  }, []);

  function onNext(e: React.FormEvent) {
    e.preventDefault();

    const params = new URLSearchParams();
    params.set("typ", tripType);
    if (date) params.set("avresa", date);
    if (pax) params.set("antal", pax);

    router.push(`/offertforfragan?${params.toString()}`);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.glass}>
        <div style={styles.kicker}>SNABBSTART</div>
        <div style={styles.title}>Gör en offertförfrågan</div>
        <p style={styles.desc}>
          Fyll i några uppgifter så kompletterar du resten i nästa steg.
        </p>
        <div style={styles.divider} />

        <div style={styles.card}>
          <form onSubmit={onNext}>
            <div style={styles.grid} className="hb-qam-grid">
              <div style={styles.field}>
                <div style={styles.label}>Typ av resa?</div>
                <select
                  style={styles.select}
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as TripType)}
                >
                  {TRIP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Avresa</div>
                <input
                  style={styles.input}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Antal resenärer</div>
                <input
                  style={styles.input}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  type="text"
                  value={pax}
                  onChange={(e) => setPax(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Ange antal"
                />
              </div>

              <button type="submit" style={styles.cta}>
                Nästa
              </button>
            </div>
          </form>
        </div>

        <div style={styles.footer}>
          <span style={styles.dot} />
          <span>Du fyller i resten på nästa steg.</span>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          .hb-qam-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }
          .hb-qam-grid :global(button) {
            grid-column: 1 / -1;
            width: 100%;
          }
        }
        @media (max-width: 560px) {
          .hb-qam-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .hb-qam-grid :global(button) {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
