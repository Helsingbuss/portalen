"use client";

import { useEffect, useState } from "react";

type Metrics = {
  monthlyRevenue: number;
  monthlyCosts: number;
  monthlyProfit: number;
};

type ApiResponse =
  | ({ ok: true } & Metrics)
  | { ok: false; error: string };

export default function InvestorKpiRow() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const fetchMetrics = async () => {
      try {
        setError(null);

        const res = await fetch("/api/investor/metrics", { method: "GET" });
        const json = (await res.json()) as ApiResponse;

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!json.ok) {
          throw new Error(json.error || "API-fel");
        }

        if (alive) {
          setData({
            monthlyRevenue: json.monthlyRevenue,
            monthlyCosts: json.monthlyCosts,
            monthlyProfit: json.monthlyProfit,
          });
        }
      } catch (e: any) {
        if (alive) setError(e?.message || "Okänt fel");
      }
    };

    fetchMetrics();
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return <div style={{ fontSize: 12, color: "#b91c1c" }}>Kunde inte hämta data: {error}</div>;
  }

  if (!data) {
    return <div style={{ fontSize: 12, color: "#6b7280" }}>Laddar statistik…</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
      <div style={{ padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Omsättning / månad</div>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{Math.round(data.monthlyRevenue).toLocaleString("sv-SE")} kr</div>
      </div>

      <div style={{ padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Kostnader / månad</div>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{Math.round(data.monthlyCosts).toLocaleString("sv-SE")} kr</div>
      </div>

      <div style={{ padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Resultat / månad</div>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{Math.round(data.monthlyProfit).toLocaleString("sv-SE")} kr</div>
      </div>
    </div>
  );
}
