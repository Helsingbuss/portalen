import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type AccessStatus = {
  ok: boolean;
  enforced: boolean;
  configured: boolean;
  granted: boolean;
};

export default function LonBehorighetPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<AccessStatus | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      setError("");

      const res = await fetch("/api/admin/lon/behorighet/status");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte kontrollera behörighet.");
      }

      setStatus(json);
    } catch (err: any) {
      setError(err?.message || "Kunde inte kontrollera behörighet.");
    }
  }

  function saveToken() {
    if (!token.trim()) {
      setError("Skriv in behörighetsnyckeln först.");
      return;
    }

    document.cookie =
      "payroll_access_token=" +
      encodeURIComponent(token.trim()) +
      "; path=/; SameSite=Lax";

    setMessage("Behörighetsnyckeln sparades i webbläsaren.");
    setToken("");

    setTimeout(() => {
      loadStatus();
    }, 250);
  }

  function clearToken() {
    document.cookie =
      "payroll_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

    setMessage("Behörighetsnyckeln togs bort från webbläsaren.");
    setToken("");

    setTimeout(() => {
      loadStatus();
    }, 250);
  }

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                Lön
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                Behörighet
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Här kan du kontrollera och lägga in åtkomstnyckel för Lön-kategorin. Detta används för att skydda känsliga lönefunktioner.
              </p>
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

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Status
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <StatusCard
                  label="Skydd aktiverat"
                  value={status?.enforced ? "Ja" : "Nej"}
                  tone={status?.enforced ? "green" : "amber"}
                />

                <StatusCard
                  label="Nyckel konfigurerad"
                  value={status?.configured ? "Ja" : "Nej"}
                  tone={status?.configured ? "green" : "red"}
                />

                <StatusCard
                  label="Åtkomst i denna webbläsare"
                  value={status?.granted ? "Godkänd" : "Saknas"}
                  tone={status?.granted ? "green" : "red"}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Lägg in åtkomstnyckel
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                När löneskyddet är aktiverat behöver webbläsaren ha rätt nyckel för att kunna använda Lön-API:erna.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Klistra in åtkomstnyckel"
                  type="password"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                />

                <button
                  type="button"
                  onClick={saveToken}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                >
                  Spara nyckel
                </button>

                <button
                  type="button"
                  onClick={clearToken}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                >
                  Ta bort
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Tips:</strong> Aktivera inte löneskyddet förrän du har lagt in miljövariablerna och testat att sidan fungerar. När det är aktivt skyddas API:erna under Lön.
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "red";
}) {
  const color =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
