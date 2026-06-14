import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const emptyForm = {
  synergybus_reference: "",
  submitted_at: "",
  quote_deadline_at: "",

  customer_name: "",

  departure_date: "",
  departure_time: "",
  pickup_location: "",
  destination: "",

  travel_details: "",

  return_date: "",
  return_time: "",
  return_pickup_location: "",

  passengers: "",

  vehicle_requirements: "",

  our_price_total: "",
  supplier_cost: "",

  status: "new",
  internal_notes: "",
  raw_request_text: "",
};

export default function NewSynergyBusPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const margin = useMemo(() => {
    return Number(form.our_price_total || 0) - Number(form.supplier_cost || 0);
  }, [form.our_price_total, form.supplier_cost]);

  function updateField(name: keyof typeof emptyForm, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/offers/synergybus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Kunde inte spara SynergyBus-förfrågan.");
      }

      router.push("/admin/offers/synergybus");
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <AdminMenu />

      <main className="mx-auto max-w-5xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin/offers/synergybus" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
            ← Tillbaka till SynergyBus
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Lägg till SynergyBus-förfrågan
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Fyll i uppgifterna från SynergyBus och lägg in vårt pris för uppföljning.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Uppgifter</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="SynergyBus ID"
                value={form.synergybus_reference}
                onChange={(value) => updateField("synergybus_reference", value)}
                placeholder="Exempel: 192635"
              />

              <Field
                label="Kund"
                value={form.customer_name}
                onChange={(value) => updateField("customer_name", value)}
                placeholder="Exempel: Marika Hedberg"
              />

              <Field
                label="Lämnats"
                type="datetime-local"
                value={form.submitted_at}
                onChange={(value) => updateField("submitted_at", value)}
              />

              <Field
                label="Stängs, svensk tid"
                type="datetime-local"
                value={form.quote_deadline_at}
                onChange={(value) => updateField("quote_deadline_at", value)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Information om beställningskörningen
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Avresedag"
                type="date"
                value={form.departure_date}
                onChange={(value) => updateField("departure_date", value)}
              />

              <Field
                label="Avresetid"
                type="time"
                value={form.departure_time}
                onChange={(value) => updateField("departure_time", value)}
              />

              <Field
                label="Avgångsort"
                value={form.pickup_location}
                onChange={(value) => updateField("pickup_location", value)}
                placeholder="Exempel: Malmö Centralstation, Skeppsbron, Malmö"
              />

              <Field
                label="Destination"
                value={form.destination}
                onChange={(value) => updateField("destination", value)}
                placeholder="Exempel: Gyllehemsvägen 22, Borlänge"
              />
            </div>

            <TextArea
              label="Resplan och detaljer"
              value={form.travel_details}
              onChange={(value) => updateField("travel_details", value)}
              placeholder="Exempel: Tur och retur Malmö - Borlänge, hämtning/lämning under helgen..."
            />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="Returdatum"
                type="date"
                value={form.return_date}
                onChange={(value) => updateField("return_date", value)}
              />

              <Field
                label="Returtid"
                type="time"
                value={form.return_time}
                onChange={(value) => updateField("return_time", value)}
              />

              <Field
                label="Returplats"
                value={form.return_pickup_location}
                onChange={(value) => updateField("return_pickup_location", value)}
                placeholder="Exempel: Malmö Centralstation, Skeppsbron, Malmö"
              />

              <Field
                label="Antal personer"
                type="number"
                value={form.passengers}
                onChange={(value) => updateField("passengers", value)}
                placeholder="Exempel: 15"
              />
            </div>

            <TextArea
              label="Fordonets utrustning / krav"
              value={form.vehicle_requirements}
              onChange={(value) => updateField("vehicle_requirements", value)}
              placeholder="Exempel: Fordonet ska vara tillgängligt på destinationen under väntetiden"
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Pris och uppföljning</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Vårt pris"
                type="number"
                value={form.our_price_total}
                onChange={(value) => updateField("our_price_total", value)}
                placeholder="Exempel: 18900"
              />

              <Field
                label="Leverantörskostnad"
                type="number"
                value={form.supplier_cost}
                onChange={(value) => updateField("supplier_cost", value)}
                placeholder="Exempel: 13500"
              />

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="new">Ny</option>
                  <option value="calculating">Beräknas</option>
                  <option value="quote_sent">Offert skickad</option>
                  <option value="won">Vunnen</option>
                  <option value="lost">Förlorad</option>
                  <option value="declined">Avböjd</option>
                  <option value="booked">Bokad</option>
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">Beräknad marginal</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">
                {margin.toLocaleString("sv-SE")} kr
              </p>
            </div>

            <TextArea
              label="Intern kommentar"
              value={form.internal_notes}
              onChange={(value) => updateField("internal_notes", value)}
              placeholder="Exempel: Pris lämnat i SynergyBus, inväntar besked..."
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Klistra in originaltext
            </h2>

            <TextArea
              label="Original från SynergyBus"
              value={form.raw_request_text}
              onChange={(value) => updateField("raw_request_text", value)}
              placeholder="Klistra gärna in hela förfrågan här som säkerhetskopia."
            />
          </section>

          <div className="flex justify-end gap-3">
            <Link
              href="/admin/offers/synergybus"
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Avbryt
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? "Sparar..." : "Spara förfrågan"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-gray-700">
        {props.label}
      </span>
      <input
        type={props.type || "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}

function TextArea(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mt-4 block">
      <span className="mb-1 block text-sm font-semibold text-gray-700">
        {props.label}
      </span>
      <textarea
        rows={5}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}

