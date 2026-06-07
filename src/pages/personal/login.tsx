import { useEffect, useState } from "react";

export default function PersonalLoginPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sendCode() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/personal/auth/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skicka kod.");
      }

      setMessage("Vi har skickat en kod om e-postadressen finns registrerad.");
      setStep("code");
    } catch (err: any) {
      setError(err?.message || "Kunde inte skicka kod.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/personal/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte verifiera kod.");
      }

      localStorage.setItem("personal_auth_token", json.token);
      window.location.href = "/personal/lonebesked";
    } catch (err: any) {
      setError(err?.message || "Kunde inte verifiera kod.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("personal_auth_token");
    if (token) {
      window.location.href = "/personal/lonebesked";
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f4f0]">
      <section className="bg-[#194C66] px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b1e3dd]">
            Helsingbuss Personal
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Logga in
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100">
            Logga in med engångskod för att se dina lönebesked och personaluppgifter.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#194C66]">
            {step === "email" ? "Ange e-postadress" : "Ange kod"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {step === "email"
              ? "Skriv den e-postadress som är kopplad till din personalprofil."
              : "Skriv den 6-siffriga koden du fick via e-post."}
          </p>

          {step === "email" ? (
            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                E-postadress
              </label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendCode();
                }}
                placeholder="namn@exempel.se"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
              />

              <button
                type="button"
                onClick={sendCode}
                disabled={loading}
                className="mt-5 w-full rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
              >
                {loading ? "Skickar..." : "Skicka kod"}
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Kod
              </label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") verifyCode();
                }}
                placeholder="123456"
                maxLength={6}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
              />

              <button
                type="button"
                onClick={verifyCode}
                disabled={loading}
                className="mt-5 w-full rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
              >
                {loading ? "Loggar in..." : "Logga in"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
              >
                Byt e-postadress
              </button>
            </div>
          )}

          {(message || error) && (
            <div className={"mt-5 rounded-xl px-4 py-3 text-sm font-semibold " + (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
              {error || message}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
