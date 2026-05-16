import { useState } from "react";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleScannerPage() {
  const [code, setCode] = useState("");

  function fakeScan() {
    alert(
      `Biljett scannad:\n\n${code}\n\n(Check-in funktion kommer kopplas senare)`
    );

    setCode("");
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="flex min-h-screen items-center justify-center p-6 pt-24">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#194C66]">
                QR Scanner
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Scan flygbussbiljetter och checka in
                passagerare.
              </p>
            </div>

            <div className="mt-8">
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value)
                }
                placeholder="Scanna eller skriv QR-kod..."
                className="w-full rounded-2xl border px-5 py-4 text-lg"
              />

              <button
                onClick={fakeScan}
                className="mt-5 w-full rounded-2xl bg-[#194C66] py-4 text-lg font-semibold text-white"
              >
                Scanna biljett
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-[#eef5f9] p-4 text-sm text-[#194C66]">
              Här kommer senare:
              <ul className="mt-2 space-y-1">
                <li>• Kamera-scanning</li>
                <li>• QR-läsare</li>
                <li>• Automatisk check-in</li>
                <li>• Avgångskontroll</li>
                <li>• Dubbel-scanningsskydd</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
