import { useState } from "react";
import Logo from "../../components/Logo";
import { supabase } from "../../lib/supabaseClient";

export default function GlomtLosenord() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: "http://localhost:3000/reset-losenord", // ändra när du deployar
    });

    setLoading(false);

    if (error) {
      setMessage("Kunde inte skicka återställningsmail. Kontrollera e-postadressen.");
    } else {
      setMessage("Ett mail med återställningslänk har skickats till din e-post.");
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

            <h2 className="text-xl font-semibold text-center mb-4">
              Glömt ditt lösenord?
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              Ange din e-postadress så skickar vi en länk för att återställa lösenordet.
            </p>

            <form onSubmit={handleReset} className="space-y-5">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-900 py-3 text-white font-semibold text-lg shadow hover:bg-blue-800 transition"
              >
                {loading ? "Skickar..." : "Skicka återställningsmail"}
              </button>
            </form>

            {message && (
              <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
            )}

            <div className="mt-6 text-center">
              <a href="/inloggning" className="text-blue-600 hover:underline text-sm">
                Tillbaka till inloggning
              </a>
            </div>
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
