import { useState } from 'react';
import { useRouter } from 'next/router';
import Logo from '../../components/Logo';
import { supabase } from '../../lib/supabaseClient';

export default function Losenord() {
  const router = useRouter();
  const { email } = router.query;
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

   const { data, error } = await supabase
  .from("admins")
  .select("id, name")
  .eq("email", email)
  .eq("password", password) // jämför lösenordet
  .single();

if (error || !data) {
  alert("Fel e-post eller lösenord");
} else {
  alert(`Välkommen ${data.name}`);
  router.push("/dashboard");
}
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex flex-1 items-center justify-center">
        <div className="flex w-full max-w-5xl gap-12 px-6">
          {/* Vänster kolumn */}
          <div className="flex-1 flex flex-col justify-center">
            <Logo />

            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-lg font-medium">Logga in som admin</h2>
              <p className="text-sm text-gray-600 mb-4">
                {email}
              </p>

              <label className="block">
                <span className="text-sm font-medium">Lösenord</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-blue-900 py-2 text-white font-semibold hover:bg-blue-800"
              >
                {loading ? 'Loggar in...' : 'Logga in'}
              </button>
            </form>
          </div>

          {/* Höger kolumn */}
          <div className="flex-1 flex items-center">
            <div className="rounded border p-6 shadow-sm bg-white">
              <h2 className="text-xl font-semibold mb-2 italic">
                Välkommen till Adminpanelen!
              </h2>
              <p className="text-sm text-gray-700">
                Skriv in ditt lösenord för att komma vidare till
                administrationsdelen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-sm text-gray-500 border-t">
        © Helsingbuss • Om cookies • <span className="ml-1">🇸🇪 Svenska</span>
      </footer>
    </div>
  );
}
