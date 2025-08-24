// src/pages/profile.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";
import Layout from "../components/Layout";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUser(user);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <Layout active="profile">
        <div className="flex items-center justify-center min-h-screen bg-[#F5F4F0]">
          <p>Laddar profil...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout active="profile">
      <div className="w-full bg-white rounded-lg shadow p-8 space-y-10">
        {/* Konto */}
        <section>
          <h2 className="font-semibold text-lg mb-4">Konto</h2>
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1 text-sm">
              <p>
                <strong>E-post:</strong> {user?.email}
              </p>
              <p>
                <strong>Fullständiga namn:</strong> {profile?.full_name || "-"}
              </p>
              <p>
                <strong>Titel:</strong> {profile?.title || "-"}
              </p>
              <p>
                <strong>Land:</strong> {profile?.country || "Sverige"}
              </p>
              <p>
                <strong>Språk:</strong> {profile?.language || "Svenska"}
              </p>
              <p>
                <strong>Mobil:</strong> {profile?.phone || "Ej angivet"}
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold text-white">
              {profile?.full_name
                ? profile.full_name[0].toUpperCase()
                : user?.email[0].toUpperCase()}
            </div>
          </div>
        </section>

        {/* E-legitimation */}
        <section>
          <h2 className="font-semibold text-lg mb-4">E-legitimation</h2>
          <div className="p-4 border rounded flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/bankid.png" alt="BankID" width={50} height={50} />
              <p>
                Lägg till ett elektroniskt ID för att kunna logga in på
                känsliga funktioner
              </p>
            </div>
            <a href="#" className="text-sm text-blue-600 hover:underline">
              Lägg till e-legitimation
            </a>
          </div>
        </section>

        {/* Lösenord & 2FA */}
        <section>
          <h2 className="font-semibold text-lg mb-4">Lösenord & 2FA</h2>
          <p className="text-sm">
            Lösenord: Senast ändrad okänd <br />
            <a href="#" className="text-blue-600 hover:underline">
              Ändra lösenord
            </a>
          </p>
          <p className="text-sm mt-2">
            Tvåstegsverifiering:{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Aktivera tvåstegsverifiering
            </a>
          </p>
        </section>

        {/* Kontoaktivitet */}
        <section>
          <h2 className="font-semibold text-lg mb-4">Kontoaktivitet</h2>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Webbläsare</th>
                <th className="p-2 border">Enhet</th>
                <th className="p-2 border">Land</th>
                <th className="p-2 border">Senaste aktivitet</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border">Edge 139.0</td>
                <td className="p-2 border">Windows 10</td>
                <td className="p-2 border">Sverige</td>
                <td className="p-2 border">Aktuell session</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Ladda ner data */}
        <section>
          <h2 className="font-semibold text-lg mb-4">Ladda ner dina data</h2>
          <p className="text-sm mb-2">
            Ladda ner information om din användarprofil och applikationer.
          </p>
          <a href="#" className="text-blue-600 hover:underline text-sm">
            Ladda ner data
          </a>
        </section>
      </div>
    </Layout>
  );
}
