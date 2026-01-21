"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import QuickActionModule from "./QuickActionModule";

export default function HeroHeader() {
  const router = useRouter();

  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [people, setPeople] = useState("Antal resenärer");

  function submit() {
    const qs = new URLSearchParams({ date, from, to, people }).toString();
    router.push(`/boka?${qs}`);
  }

  return (
    <section style={styles.full}>
      <div style={styles.bg} />
      <div style={styles.overlay} />

      <div className="hb-hero-inner" style={styles.inner}>
        <div style={styles.left}>
          <h1 className="hb-hero-title" style={styles.h1}>
            Beställ buss i Skåne –
            <br />
            tryggt, premium och
            <br />
            personligt.
          </h1>{/* divider */}<div style={styles.divider} />

          <div style={styles.checkList}>
  <div style={styles.checkRow}><span style={styles.checkIcon}>✓</span><span>Topprustade & bekväma bussar</span></div>
  <div style={styles.checkRow}><span style={styles.checkIcon}>✓</span><span>Erfarna & serviceinriktade chaufförer</span></div>
  <div style={styles.checkRow}><span style={styles.checkIcon}>✓</span><span>Miljövänligt – HVO & Euro 6</span></div>
  <div style={styles.checkRow}><span style={styles.checkIcon}>✓</span><span>Snabb återkoppling på offerter</span></div>
</div>

          <QuickActionModule />
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>{label}</div>
      {children}
    </div>
  );
}

const styles: Record<string, any> = {
  checkList: { marginTop: 34,
    display: "grid",
    gap: 10,
    maxWidth: 560,
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  checkIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: 999,
    background: "rgba(34,197,94,0.18)",
    color: "#22c55e",
    fontWeight: 800,
    flex: "0 0 auto",
  },

  full: {
    position: "relative",
    width: "100%",
    minHeight: 720,
    overflow: "hidden",
  },
  bg: {
    position: "absolute",
    inset: 0,
    backgroundImage: "url(/header.jpeg)",
    backgroundSize: "cover",
    backgroundPosition: "center 20%",
    transform: "scale(1.01)",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(1200px 700px at 25% 35%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.00) 52%), radial-gradient(900px 600px at 85% 25%, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.00) 55%), linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.42) 48%, rgba(0,0,0,0.08) 100%), radial-gradient(140% 120% at 50% 50%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.48) 70%, rgba(0,0,0,0.62) 100%)",
  },
  inner: {
    position: "relative",
    zIndex: 2,
    maxWidth: 1400,
    margin: "0 auto",
    padding: "170px 22px 72px",
  },
  left: { color: "white", maxWidth: 980 },
  h1: { fontSize: "clamp(34px, 3.6vw, 48px)", lineHeight: 1.06, margin: 0, fontWeight: 700 },  divider: { width: 140, height: 2, marginTop: 34, marginBottom: 40, borderRadius: 999, background: "linear-gradient(90deg, rgba(176,122,42,0.0) 0%, rgba(176,122,42,0.95) 20%, rgba(255,214,140,0.95) 50%, rgba(176,122,42,0.95) 80%, rgba(176,122,42,0.0) 100%)", boxShadow: "0 6px 16px rgba(176,122,42,0.25)" },
  list: { margin: "18px 0 18px", paddingLeft: 18, display: "grid", gap: 12, maxWidth: 520 },
  li: { fontSize: 15, opacity: 0.95 },
  card: { marginTop: 52,
    boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(255,255,255,0.35)",
    borderRadius: 14,
    padding: 14,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
    gap: 12,
    alignItems: "end",
    color: "#0f172a",
  },
  input: {
    height: 42,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.15)",
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    width: "100%",
  },
  select: {
    height: 42,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.15)",
    padding: "0 10px",
    outline: "none",
    fontSize: 14,
    background: "white",
    width: "100%",
  },
  cta: {
    height: 42,
    borderRadius: 10,
    border: "none",
    padding: "0 18px",
    cursor: "pointer",
    background: "#b07a2a",
    color: "white",
    fontWeight: 800,
    fontSize: 14,
    whiteSpace: "nowrap",
  },
};































