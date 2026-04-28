import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// 🔥 Scanner (client only)
const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
  { ssr: false }
);

export default function ScanPage() {
  const [status, setStatus] = useState("Startar kamera...");
  const [color, setColor] = useState("text-gray-500");

  const scanning = useRef(false);

  const successSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);

  // 🔥 FIX: skapa ljud ENDAST i browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      successSound.current = new Audio("/sounds/success.mp3");
      errorSound.current = new Audio("/sounds/error.mp3");
    }
  }, []);

  const handleScan = async (codes: any[]) => {
    if (!codes?.length) return;
    if (scanning.current) return;

    const code = codes[0].rawValue;

    console.log("SCAN:", code);

    scanning.current = true;

    try {
      setStatus("Kontrollerar biljett...");
      setColor("text-yellow-500");

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: code }),
      });

      const data = await res.json();

      if (data.success) {
        await successSound.current?.play().catch(() => {});
        navigator.vibrate?.(200);

        setStatus("✅ Godkänd biljett");
        setColor("text-green-600");
      } else {
        await errorSound.current?.play().catch(() => {});
        navigator.vibrate?.([100, 50, 100]);

        setStatus("❌ " + (data.error || "Ogiltig biljett"));
        setColor("text-red-600");
      }
    } catch (err) {
      console.error(err);

      await errorSound.current?.play().catch(() => {});
      setStatus("❌ Serverfel");
      setColor("text-red-600");
    }

    setTimeout(() => {
      scanning.current = false;
      setStatus("Redo att skanna...");
      setColor("text-gray-500");
    }, 2000);
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center p-4 transition-all duration-300 ${
        color === "text-green-600"
          ? "bg-green-50"
          : color === "text-red-600"
          ? "bg-red-50"
          : "bg-gray-100"
      }`}
    >
      <h1 className="text-xl font-semibold mb-4">
        🎟️ Skanna biljett
      </h1>

      <div className="w-full max-w-sm bg-white rounded-xl shadow p-2">
        <Scanner
          onScan={handleScan}
          constraints={{ facingMode: "environment" }}
        />
      </div>

      <p className={`mt-4 text-lg font-medium ${color}`}>
        {status}
      </p>
    </div>
  );
}
