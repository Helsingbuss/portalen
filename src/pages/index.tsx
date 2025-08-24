// src/pages/index.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import Logo from "../components/Logo";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (error || !data.user) {
      alert("Fel e-post eller lösenord.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col justify-between"
      style={{
        backgroundImage: "url('/buss.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Innehåll */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <Logo className="h-14" />
            </div>

            {/* Formulär */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium">E-postadress</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-600 focus:ring focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Lösenord</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-600 focus:ring focus:ring-blue-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-900 py-3 text-white font-semibold text-lg shadow hover:bg-blue-800 transition"
              >
                {loading ? "Loggar in..." : "Logga in"}
              </button>

              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center space-x-2 text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>Spara min e-postadress</span>
                </label>

                <a
                  href="/inloggning/glomt-losenord"
                  className="text-blue-600 hover:underline"
                >
                  Glömt ditt lösenord?
                </a>
              </div>

              <div className="flex items-center justify-center">
                <span className="px-3 text-sm text-gray-500 bg-white relative">
                  ELLER
                </span>
              </div>

              <button
                type="button"
                disabled
                className="flex items-center justify-start gap-2 w-full rounded-lg border bg-gray-100 py-3 text-gray-400 px-3"
              >
                <img src="/bankid.png" alt="BankID" className="h-5 w-5" />
                Logga in med BankID Sverige
              </button>

              <button
                type="button"
                disabled
                className="flex items-center justify-start gap-2 w-full rounded-lg border bg-gray-100 py-3 text-gray-400 px-3"
              >
                <img src="/bankid.png" alt="BankID" className="h-5 w-5" />
                Logga in med Mobilt BankID Sverige
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-sm text-gray-200 bg-black/40">
        ©Helsingbuss • Om cookies • 🇸🇪 Svenska
      </footer>
    </div>
  );
}
