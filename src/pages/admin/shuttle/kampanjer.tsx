import { useEffect, useState } from "react";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [departures, setDepartures] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "",
    code: "",

    discount_type: "percent",

    discount_percent: "",
    discount_amount: "",

    valid_from: "",
    valid_until: "",

    max_uses: "",

    route_id: "",
    departure_id: "",

    description: "",
  });

  useEffect(() => {
    loadCampaigns();
    loadRoutes();
    loadDepartures();
  }, []);

  async function loadCampaigns() {
    const res = await fetch(
      "/api/admin/shuttle/campaigns"
    );

    const json = await res.json();

    setCampaigns(json.campaigns || []);
  }

  async function loadRoutes() {
    const res = await fetch(
      "/api/admin/shuttle/routes"
    );

    const json = await res.json();

    setRoutes(json.routes || []);
  }

  async function loadDepartures() {
    const res = await fetch(
      "/api/admin/shuttle/departures"
    );

    const json = await res.json();

    setDepartures(json.departures || []);
  }

  async function save() {
    await fetch(
      "/api/admin/shuttle/campaigns",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(form),
      }
    );

    setForm({
      name: "",
      code: "",

      discount_type: "percent",

      discount_percent: "",
      discount_amount: "",

      valid_from: "",
      valid_until: "",

      max_uses: "",

      route_id: "",
      departure_id: "",

      description: "",
    });

    loadCampaigns();
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Kampanjer & rabatter
            </h1>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                placeholder="Kampanjnamn"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                placeholder="Kod"
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    code: e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3 uppercase"
              />

              <select
                value={form.discount_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discount_type:
                      e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              >
                <option value="percent">
                  Procent
                </option>

                <option value="fixed">
                  Fast belopp
                </option>
              </select>

              <input
                type="number"
                placeholder="Rabatt %"
                value={form.discount_percent}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discount_percent:
                      e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                type="number"
                placeholder="Rabatt belopp"
                value={form.discount_amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discount_amount:
                      e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                type="number"
                placeholder="Max användningar"
                value={form.max_uses}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    max_uses:
                      e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                type="date"
                value={form.valid_from}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    valid_from:
                      e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                type="date"
                value={form.valid_until}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    valid_until:
                      e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              />

              <select
                value={form.route_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    route_id:
                      e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              >
                <option value="">
                  Alla rutter
                </option>

                {routes.map((route) => (
                  <option
                    key={route.id}
                    value={route.id}
                  >
                    {route.name}
                  </option>
                ))}
              </select>

              <select
                value={form.departure_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    departure_id:
                      e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3"
              >
                <option value="">
                  Alla avgångar
                </option>

                {departures.map(
                  (departure) => (
                    <option
                      key={departure.id}
                      value={departure.id}
                    >
                      {
                        departure.departure_date
                      }{" "}
                      ·{" "}
                      {
                        departure.departure_time
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <textarea
              placeholder="Beskrivning"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  description:
                    e.target.value,
                }))
              }
              className="mt-4 min-h-[120px] w-full rounded-xl border px-4 py-3"
            />

            <button
              onClick={save}
              className="mt-5 rounded-xl bg-[#194C66] px-5 py-3 text-white"
            >
              Skapa kampanj
            </button>
          </div>

          <div className="rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Alla kampanjer
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead className="bg-[#f8fafc] text-sm text-gray-500">
                  <tr>
                    <th className="px-4 py-3">
                      Namn
                    </th>

                    <th className="px-4 py-3">
                      Kod
                    </th>

                    <th className="px-4 py-3">
                      Rabatt
                    </th>

                    <th className="px-4 py-3">
                      Giltig till
                    </th>

                    <th className="px-4 py-3">
                      Användningar
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {campaigns.map(
                    (campaign) => (
                      <tr
                        key={campaign.id}
                        className="border-b"
                      >
                        <td className="px-4 py-3 font-semibold">
                          {campaign.name}
                        </td>

                        <td className="px-4 py-3">
                          {campaign.code}
                        </td>

                        <td className="px-4 py-3">
                          {campaign.discount_type ===
                          "percent"
                            ? `${campaign.discount_percent}%`
                            : `${campaign.discount_amount} kr`}
                        </td>

                        <td className="px-4 py-3">
                          {campaign.valid_until ||
                            "—"}
                        </td>

                        <td className="px-4 py-3">
                          {
                            campaign.used_count
                          }
                          /
                          {
                            campaign.max_uses
                          }
                        </td>

                        <td className="px-4 py-3">
                          {campaign.status}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
