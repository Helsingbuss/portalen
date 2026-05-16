import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function NewShuttleDeparturePage() {
  const router = useRouter();

  const [routes, setRoutes] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    route_id: "",

    departure_date: "",
    departure_time: "",

    return_date: "",
    return_time: "",

    price: "",
    capacity: "50",

    booked_count: "0",

    status: "open",
  });

  function update(
    key: string,
    value: any
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadRoutes() {
    try {
      const res = await fetch(
        "/api/admin/shuttle/routes"
      );

      const json = await res.json();

      setRoutes(json.routes || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadRoutes();
  }, []);

  async function save() {
    try {
      setSaving(true);

      const res = await fetch(
        "/api/admin/shuttle/departures",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...form,
            price: Number(form.price || 0),
            capacity: Number(
              form.capacity || 0
            ),
            booked_count: Number(
              form.booked_count || 0
            ),
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error ||
            "Kunde inte skapa avgång."
        );
      }

      router.push(
        "/admin/shuttle/avgangar"
      );
    } catch (e: any) {
      alert(
        e?.message || "Något gick fel."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div>
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Skapa avgång
            </h1>

            <p className="mt-1 text-sm text-[#194C66]/70">
              Skapa ny flygbussavgång.
            </p>
          </div>

          <div className="mt-6 rounded-3xl bg-white p-6 shadow">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Rutt">
                <select
                  value={form.route_id}
                  onChange={(e) =>
                    update(
                      "route_id",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="">
                    Välj rutt
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
              </Field>

              <Field label="Pris">
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    update(
                      "price",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2"
                />
              </Field>

              <Field label="Avgångsdatum">
                <input
                  type="date"
                  value={form.departure_date}
                  onChange={(e) =>
                    update(
                      "departure_date",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2"
                />
              </Field>

              <Field label="Avgångstid">
                <input
                  type="time"
                  value={form.departure_time}
                  onChange={(e) =>
                    update(
                      "departure_time",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2"
                />
              </Field>

              <Field label="Returdatum">
                <input
                  type="date"
                  value={form.return_date}
                  onChange={(e) =>
                    update(
                      "return_date",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2"
                />
              </Field>

              <Field label="Returtid">
                <input
                  type="time"
                  value={form.return_time}
                  onChange={(e) =>
                    update(
                      "return_time",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2"
                />
              </Field>

              <Field label="Kapacitet">
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) =>
                    update(
                      "capacity",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2"
                />
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    update(
                      "status",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="open">
                    Öppen
                  </option>

                  <option value="closed">
                    Stängd
                  </option>

                  <option value="full">
                    Fullbokad
                  </option>
                </select>
              </Field>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="mt-6 rounded-full bg-[#194C66] px-6 py-3 font-semibold text-white"
            >
              {saving
                ? "Sparar..."
                : "Skapa avgång"}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-[#194C66]">
        {label}
      </div>

      {children}
    </label>
  );
}
