// src/pages/users.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Layout from "../components/Layout";

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    phone: "",
    booking: false,
    visualplan: false,
    priceboard: false,
    crewcenter: false,
    reports: false,
    schedule: false,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error) setUsers(data || []);
  };

  const handleCheckboxChange = (field: string) => {
    setNewUser((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev],
    }));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").insert([newUser]);
    if (!error) {
      setNewUser({
        email: "",
        full_name: "",
        phone: "",
        booking: false,
        visualplan: false,
        priceboard: false,
        crewcenter: false,
        reports: false,
        schedule: false,
      });
      fetchUsers();
    } else {
      console.error("Fel vid tillägg av användare:", error.message);
    }
  };

  return (
    <Layout active="users">
      <div className="w-full bg-white rounded-lg shadow p-8 space-y-10">
        <h1 className="text-xl font-bold mb-6">Hantera användare</h1>

        {/* Lägg till användare */}
        <form
          onSubmit={handleAddUser}
          className="space-y-4 border p-4 rounded bg-gray-50"
        >
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Fullständigt namn"
              value={newUser.full_name}
              onChange={(e) =>
                setNewUser({ ...newUser, full_name: e.target.value })
              }
              className="border rounded p-2"
              required
            />
            <input
              type="email"
              placeholder="E-postadress"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="border rounded p-2"
              required
            />
            <input
              type="text"
              placeholder="Telefonnummer"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              className="border rounded p-2"
            />
          </div>

          {/* Behörigheter */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newUser.booking}
                onChange={() => handleCheckboxChange("booking")}
              />
              Booking
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newUser.visualplan}
                onChange={() => handleCheckboxChange("visualplan")}
              />
              VisualPlan
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newUser.priceboard}
                onChange={() => handleCheckboxChange("priceboard")}
              />
              PriceBoard
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newUser.crewcenter}
                onChange={() => handleCheckboxChange("crewcenter")}
              />
              CrewCenter
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newUser.reports}
                onChange={() => handleCheckboxChange("reports")}
              />
              Reports
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newUser.schedule}
                onChange={() => handleCheckboxChange("schedule")}
              />
              Schedule
            </label>
          </div>

          <button
            type="submit"
            className="bg-[#194C66] text-white px-4 py-2 rounded hover:bg-[#163b4e]"
          >
            Lägg till användare
          </button>
        </form>

        {/* Lista användare */}
        <section>
          <h2 className="font-semibold text-lg mb-4">Befintliga användare</h2>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Namn</th>
                <th className="p-2 border">E-post</th>
                <th className="p-2 border">Telefon</th>
                <th className="p-2 border">Behörigheter</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-2 border">{u.full_name}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.phone}</td>
                  <td className="p-2 border">
                    {[
                      u.booking && "Booking",
                      u.visualplan && "VisualPlan",
                      u.priceboard && "PriceBoard",
                      u.crewcenter && "CrewCenter",
                      u.reports && "Reports",
                      u.schedule && "Schedule",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </Layout>
  );
}
