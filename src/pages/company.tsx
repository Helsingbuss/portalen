// src/pages/company.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Layout from "../components/Layout";

export default function Company() {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      const { data, error } = await supabase
        .from("company")
        .select("*")
        .limit(1) // säkerställ bara en rad
        .single();

      if (!error) {
        setCompany(data);
      }
      setLoading(false);
    };

    fetchCompany();
  }, []);

  return (
    <Layout active="company">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen bg-[#F5F4F0]">
          <p>Laddar företagsinställningar...</p>
        </div>
      ) : (
        <div className="w-full bg-white rounded-lg shadow p-8 space-y-10">
          <h1 className="text-xl font-bold mb-6">Företagsinställningar</h1>

          {/* Företag */}
          <section>
            <h2 className="font-semibold text-lg mb-4">Företag</h2>
            <div className="border rounded p-4">
              <p className="text-sm mb-2">
                Här visas din företags- och faktureringsinformation.
              </p>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p>
                    <strong>Organisations nr:</strong>{" "}
                    {company?.orgnr || "XXXXXX-XXXX"}
                  </p>
                  <p>
                    <strong>Företagsnamn:</strong>{" "}
                    {company?.name || "Helsingbuss"}
                  </p>
                  <p>
                    <strong>Obligatorisk tvåstegsverifiering:</strong> Inaktiverad
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Adress:</strong>{" "}
                    {company?.address || "Hofverbergsgatan 2B"}
                  </p>
                  <p>
                    <strong>E-postadress för fakturor:</strong>{" "}
                    {company?.billing_email || "ekonomi@helsingbuss.se"}
                  </p>
                  <p>
                    <strong>Er referens:</strong>{" "}
                    {company?.reference || "Andreas Ekelöf"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Logotyp */}
          <section>
            <h2 className="font-semibold text-lg mb-4">Logotyp</h2>
            <div className="p-4 border rounded flex flex-col items-center justify-center">
              <p className="text-sm mb-2">
                Här kan du ladda upp företagets logotyp. Den visas på fakturor &
                offerter.
              </p>
              <input type="file" accept="image/*" className="border rounded p-2" />
            </div>
          </section>

          {/* Medgivanden */}
          <section>
            <h2 className="font-semibold text-lg mb-4">Medgivanden</h2>
            <div className="p-4 border rounded text-sm">
              Här kan du se dina medgivanden. Ett medgivande innebär att du har
              gett tillåtelse till ett annat företag att hämta och använda data
              från ditt företag för att bearbeta det i ett specifikt program.
            </div>
          </section>

          {/* Administratörer */}
          <section>
            <h2 className="font-semibold text-lg mb-4">Administratörer</h2>
            <div className="p-4 border rounded text-sm">
              <p className="mb-2">
                Här visas de som är administratörer i Helsingbuss Portalen.
                Administratörer kan hantera användare, fakturor och samarbeten.
              </p>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Namn</th>
                    <th className="p-2 border">E-postadress för fakturor</th>
                    <th className="p-2 border">Telefonnummer</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border">Andreas Ekelöf</td>
                    <td className="p-2 border">ekonomi@helsingbuss.se</td>
                    <td className="p-2 border">+46 (0)729 42 35 37</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </Layout>
  );
}
