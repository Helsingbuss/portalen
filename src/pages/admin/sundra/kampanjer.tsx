import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Campaign = {
  id: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;

  discount_type?: "percent" | "fixed" | string | null;
  discount_value?: number | null;

  applies_to?: "all" | "trip" | string | null;
  trip_id?: string | null;

  starts_at?: string | null;
  ends_at?: string | null;

  max_uses?: number | null;
  used_count?: number | null;

  status?: "active" | "inactive" | "draft" | string | null;
  created_at?: string | null;
};

type Trip = {
  id: string;
  title?: string | null;
  destination?: string | null;
};

function statusLabel(status?: string | null) {
  if (status === "active") return "Aktiv";
  if (status === "inactive") return "Inaktiv";
  if (status === "draft") return "Utkast";
  return status || "—";
}

function statusClass(status?: string | null) {
  if (status === "active") return "bg-green-100 text-green-700";
  if (status === "inactive") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function discountLabel(campaign: Campaign) {
  if (campaign.discount_type === "fixed") {
    return `${Number(campaign.discount_value || 0).toLocaleString("sv-SE")} kr`;
  }

  return `${Number(campaign.discount_value || 0).toLocaleString("sv-SE")}%`;
}

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export default function SundraCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",

    discount_type: "percent",
    discount_value: "",

    applies_to: "all",
    trip_id: "",

    starts_at: "",
    ends_at: "",

    max_uses: "",

    status: "active",
  });

  function update(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadCampaigns() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/campaigns");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta kampanjer.");
      }

      setCampaigns(json.campaigns || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTrips() {
    try {
      setLoadingTrips(true);

      const res = await fetch("/api/admin/sundra/trips");
      const json = await res.json().catch(() => ({}));

      if (res.ok && json?.ok) {
        setTrips(json.trips || []);
      }
    } finally {
      setLoadingTrips(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
    loadTrips();
  }, []);

  async function saveCampaign() {
    try {
      setSaving(true);
      setError("");

      if (!form.code.trim()) {
        throw new Error("Rabattkod saknas.");
      }

      if (!form.name.trim()) {
        throw new Error("Namn på kampanjen saknas.");
      }

      if (!form.discount_value || Number(form.discount_value) <= 0) {
        throw new Error("Rabattvärde måste vara större än 0.");
      }

      if (form.applies_to === "trip" && !form.trip_id) {
        throw new Error("Välj vilken resa kampanjen ska gälla.");
      }

      const res = await fetch("/api/admin/sundra/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          code: form.code.trim().toUpperCase(),
          discount_value: Number(form.discount_value || 0),
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          trip_id: form.applies_to === "trip" ? form.trip_id : null,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte skapa kampanj.");
      }

      setForm({
        code: "",
        name: "",
        description: "",
        discount_type: "percent",
        discount_value: "",
        applies_to: "all",
        trip_id: "",
        starts_at: "",
        ends_at: "",
        max_uses: "",
        status: "active",
      });

      await loadCampaigns();
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return campaigns.filter((c) => {
      const matchSearch =
        !q ||
        c.code?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q);

      const matchFilter = filter === "all" || c.status === filter;

      return matchSearch && matchFilter;
    });
  }, [campaigns, search, filter]);

  const stats = useMemo(() => {
    return {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === "active").length,
      inactive: campaigns.filter((c) => c.status === "inactive").length,
      used: campaigns.reduce((sum, c) => sum + Number(c.used_count || 0), 0),
    };
  }, [campaigns]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Kampanjer & rabatter
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Skapa rabattkoder som kan användas i kassan före betalning.
              </p>
            </div>

            <button
              onClick={loadCampaigns}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat title="Kampanjer" value={stats.total} />
            <Stat title="Aktiva" value={stats.active} />
            <Stat title="Inaktiva" value={stats.inactive} />
            <Stat title="Användningar" value={stats.used} />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <section className="rounded-3xl bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Skapa rabattkod
              </h2>

              <div className="mt-5 space-y-4">
                <Field label="Rabattkod">
                  <input
                    value={form.code}
                    onChange={(e) => update("code", e.target.value.toUpperCase())}
                    placeholder="SOMMAR100"
                    className="w-full rounded-xl border px-3 py-2 uppercase"
                  />
                </Field>

                <Field label="Kampanjnamn">
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Sommarkampanj"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <Field label="Beskrivning">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Intern beskrivning av kampanjen..."
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Rabatt typ">
                    <select
                      value={form.discount_type}
                      onChange={(e) => update("discount_type", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="percent">Procent</option>
                      <option value="fixed">Fast belopp</option>
                    </select>
                  </Field>

                  <Field
                    label={
                      form.discount_type === "percent"
                        ? "Rabatt i %"
                        : "Rabatt i kr"
                    }
                  >
                    <input
                      type="number"
                      value={form.discount_value}
                      onChange={(e) => update("discount_value", e.target.value)}
                      placeholder={form.discount_type === "percent" ? "10" : "100"}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <Field label="Gäller">
                  <select
                    value={form.applies_to}
                    onChange={(e) => update("applies_to", e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="all">Alla resor</option>
                    <option value="trip">Specifik resa</option>
                  </select>
                </Field>

                {form.applies_to === "trip" && (
                  <Field label="Välj resa">
                    <select
                      value={form.trip_id}
                      onChange={(e) => update("trip_id", e.target.value)}
                      disabled={loadingTrips}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="">
                        {loadingTrips ? "Laddar resor..." : "Välj resa"}
                      </option>

                      {trips.map((trip) => (
                        <option key={trip.id} value={trip.id}>
                          {trip.title}
                          {trip.destination ? ` · ${trip.destination}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Startdatum">
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(e) => update("starts_at", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Slutdatum">
                    <input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(e) => update("ends_at", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Max användningar">
                    <input
                      type="number"
                      value={form.max_uses}
                      onChange={(e) => update("max_uses", e.target.value)}
                      placeholder="Tomt = obegränsat"
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </Field>

                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) => update("status", e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="active">Aktiv</option>
                      <option value="draft">Utkast</option>
                      <option value="inactive">Inaktiv</option>
                    </select>
                  </Field>
                </div>

                <button
                  onClick={saveCampaign}
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#194C66] px-4 py-3 font-semibold text-white hover:bg-[#16384d] disabled:opacity-50"
                >
                  {saving ? "Sparar..." : "Skapa rabattkod"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-white shadow">
              <div className="border-b p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#194C66]">
                      Alla kampanjer
                    </h2>
                    <p className="text-sm text-gray-500">
                      {filtered.length} av {campaigns.length} kampanjer
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Sök kod eller kampanj..."
                      className="w-full rounded-xl border px-3 py-2 text-sm md:w-64"
                    />

                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      <option value="all">Alla</option>
                      <option value="active">Aktiva</option>
                      <option value="draft">Utkast</option>
                      <option value="inactive">Inaktiva</option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-gray-500">
                  Laddar kampanjer...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  Inga kampanjer hittades.
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((campaign) => (
                    <div key={campaign.id} className="p-5 hover:bg-[#f8fafc]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-[#0f172a]">
                              {campaign.name || "Kampanj"}
                            </h3>

                            <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-bold text-[#194C66]">
                              {campaign.code}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                campaign.status
                              )}`}
                            >
                              {statusLabel(campaign.status)}
                            </span>
                          </div>

                          {campaign.description && (
                            <p className="mt-2 max-w-2xl text-sm text-gray-600">
                              {campaign.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              Rabatt: {discountLabel(campaign)}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              Gäller:{" "}
                              {campaign.applies_to === "trip"
                                ? "Specifik resa"
                                : "Alla resor"}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              Använd: {campaign.used_count || 0}
                              {campaign.max_uses
                                ? ` / ${campaign.max_uses}`
                                : " / obegränsat"}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              {fmtDate(campaign.starts_at)} –{" "}
                              {fmtDate(campaign.ends_at)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#194C66]">
                            {discountLabel(campaign)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Rabatt
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
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
      <div className="mb-1 text-sm font-medium text-[#194C66]">{label}</div>
      {children}
    </label>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}
