// src/pages/demo-login.tsx
import { useState } from "react";
import { useRouter } from "next/router";

const DEMO_EMAIL = "demo@helsingbuss.se";
const DEMO_PASSWORD = "Demo2025!";

export default function DemoLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Superenkel demo–kontroll
    if (email.trim() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError("Fel e-post eller lösenord (demo-konto).");
      return;
    }

    setLoading(true);

    // Låtsas “logga in” och gå till Mina sidor demo
    await router.push("/mina-sidor/demo");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-lg font-semibold text-white">
            H
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            Helsingbuss – Demo inloggning
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Använd demo@helsingbuss.se / Demo2025! för att visa Mina sidor.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-slate-700">E-post</label>
            <input
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <label className="text-slate-700">Lösenord</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loggar in…" : "Logga in (demo)"}
          </button>
        </form>
      </div>
    </div>
  );
}
