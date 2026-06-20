import { useEffect, useState } from "react";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";

type PriceRule = {
  id?: string;
  line_code: string;
  from_stop_name: string;
  to_stop_name: string;
  passenger_type_key: string;
  ticket_type_key: string;
  price_sek: number;
  is_active?: boolean;
};

type ImportRow = {
  rowNumber?: number;
  line_code: string;
  from_stop_name: string;
  to_stop_name: string;
  passenger_type_key: string;
  ticket_type_key: string;
  price_sek: number;
};

const emptyPrice: PriceRule = {
  line_code: "811",
  from_stop_name: "",
  to_stop_name: "Ängelholms Flygplats",
  passenger_type_key: "adult",
  ticket_type_key: "economy",
  price_sek: 0,
  is_active: true,
};

const exampleImport = `Linje; Från hållplats; Till hållplats; Resenärstyp; Biljettyp; Pris
811; Helsingborg C; Ängelholms Flygplats; Vuxen; Ekonomi; 149
811; Helsingborg C; Ängelholms Flygplats; Vuxen; Plus; 199
811; Helsingborg Stattena; Ängelholms Flygplats; Vuxen; Ekonomi; 139
811; Ängelholm Station; Ängelholms Flygplats; Vuxen; Ekonomi; 79
811; Ängelholm Station; Ängelholms Flygplats; Barn; Ekonomi; 49`;

function passengerLabel(key: string) {
  if (key === "adult") return "Vuxen";
  if (key === "child") return "Barn";
  if (key === "youth") return "Ungdom";
  if (key === "senior") return "Senior";
  return key;
}

function ticketLabel(key: string) {
  if (key === "economy") return "Ekonomi";
  if (key === "plus") return "Plus";
  return key;
}

export default function ShuttlePrislistaPage() {
  const [prices, setPrices] = useState<PriceRule[]>([]);
  const [form, setForm] = useState<PriceRule>(emptyPrice);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [importText, setImportText] = useState(exampleImport);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);

  async function loadPrices() {
    const response = await fetch("/api/admin/shuttle/price-rules");
    const data = await response.json();

    if (Array.isArray(data.prices)) {
      setPrices(data.prices);
    }
  }

  useEffect(() => {
    loadPrices();
  }, []);

  function updateForm(field: keyof PriceRule, value: string) {
    setForm((current) => ({
      ...current,
      [field]: field === "price_sek" ? Number(value || 0) : value,
    }));
  }

  async function savePrice() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/shuttle/price-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Kunde inte spara pris.");
      }

      setMessage("Priset sparades.");
      setForm(emptyPrice);
      await loadPrices();
    } catch (error: any) {
      setMessage(error?.message || "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePrice(id?: string) {
    if (!id) return;

    const response = await fetch(`/api/admin/shuttle/price-rules?id=${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      setMessage(data.message || "Kunde inte ta bort pris.");
      return;
    }

    setMessage("Priset togs bort.");
    await loadPrices();
  }

  async function runImport(mode: "preview" | "import") {
    setImporting(true);
    setImportMessage("");
    setImportErrors([]);

    try {
      const response = await fetch("/api/admin/shuttle/price-rules-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          text: importText,
        }),
      });

      const data = await response.json();

      setImportRows(Array.isArray(data.rows) ? data.rows : []);
      setImportErrors(Array.isArray(data.errors) ? data.errors : []);

      if (!response.ok || !data.ok) {
        setImportMessage(data.message || "Importen kunde inte genomföras.");
        return;
      }

      setImportMessage(
        mode === "preview"
          ? `${data.count || 0} prisrader kunde läsas in.`
          : data.message || "Prislistan importerades."
      );

      if (mode === "import") {
        await loadPrices();
      }
    } catch (error: any) {
      setImportMessage(error?.message || "Något gick fel vid import.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Header />
      <AdminMenu />

      <main className="min-h-screen space-y-6 bg-[#f7f9fb] px-8 py-6 pt-24 md:ml-[280px] md:px-8 lg:px-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#007764]">
            Flygbuss - Airport Shuttle
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Prislista
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Här styr du pris per linje, från-hållplats, till-hållplats,
            resenärstyp och biljettyp. Samma kombination uppdateras om den redan finns.
          </p>

          {message ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Importera prislista
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Klistra in prislistan med semikolon. Första raden får gärna vara rubriker.
            </p>

            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              rows={12}
              className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:border-[#007764]"
            />

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runImport("preview")}
                disabled={importing}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                Förhandsgranska priser
              </button>

              <button
                type="button"
                onClick={() => runImport("import")}
                disabled={importing}
                className="rounded-2xl bg-[#007764] px-5 py-3 text-sm font-semibold text-white hover:bg-[#006A59] disabled:opacity-60"
              >
                Importera priser
              </button>
            </div>

            {importMessage ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {importMessage}
              </div>
            ) : null}

            {importErrors.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <strong>Rader att kontrollera:</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {importErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {importRows.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Rad</th>
                      <th className="px-4 py-3">Linje</th>
                      <th className="px-4 py-3">Från</th>
                      <th className="px-4 py-3">Till</th>
                      <th className="px-4 py-3">Resenär</th>
                      <th className="px-4 py-3">Biljettyp</th>
                      <th className="px-4 py-3">Pris</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {importRows.map((item) => (
                      <tr
                        key={`${item.rowNumber || ""}-${item.line_code}-${item.from_stop_name}-${item.passenger_type_key}-${item.ticket_type_key}`}
                      >
                        <td className="px-4 py-3">{item.rowNumber || "-"}</td>
                        <td className="px-4 py-3">{item.line_code}</td>
                        <td className="px-4 py-3">{item.from_stop_name}</td>
                        <td className="px-4 py-3">{item.to_stop_name}</td>
                        <td className="px-4 py-3">{passengerLabel(item.passenger_type_key)}</td>
                        <td className="px-4 py-3">{ticketLabel(item.ticket_type_key)}</td>
                        <td className="px-4 py-3 font-semibold">{item.price_sek} kr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>

          <aside className="rounded-3xl border border-[#b7e5dc] bg-[#f0fbf8] p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#007764]">
              Viktigt att komma ihåg
            </p>

            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Så fungerar prisimporten
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
              <p>
                Varje prisrad gäller för en unik kombination av linje, från-hållplats,
                till-hållplats, resenärstyp och biljettyp.
              </p>

              <div className="rounded-2xl bg-white p-4">
                <strong className="text-slate-950">
                  Nyckeln som styr priset:
                </strong>
                <p className="mt-2">
                  Linje + Från hållplats + Till hållplats + Resenärstyp + Biljettyp = Pris
                </p>
              </div>

              <p>
                Om samma kombination redan finns uppdateras priset. Om kombinationen
                saknas skapas en ny prisrad.
              </p>

              <p>
                Importformat:
              </p>

              <pre className="overflow-auto rounded-2xl bg-white p-4 text-xs leading-5 text-slate-700">
{`Linje; Från hållplats; Till hållplats; Resenärstyp; Biljettyp; Pris
811; Helsingborg C; Ängelholms Flygplats; Vuxen; Ekonomi; 149
811; Ängelholm Station; Ängelholms Flygplats; Barn; Ekonomi; 49`}
              </pre>

              <p>
                Godkända resenärstyper: Vuxen, Barn, Ungdom och Senior.
                Godkända biljettyper: Ekonomi och Plus.
              </p>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Lägg till eller uppdatera ett pris manuellt
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <input
              value={form.line_code}
              onChange={(event) => updateForm("line_code", event.target.value)}
              placeholder="Linje, t.ex. 811"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]"
            />

            <input
              value={form.from_stop_name}
              onChange={(event) => updateForm("from_stop_name", event.target.value)}
              placeholder="Från hållplats"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]"
            />

            <input
              value={form.to_stop_name}
              onChange={(event) => updateForm("to_stop_name", event.target.value)}
              placeholder="Till hållplats"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]"
            />

            <select
              value={form.passenger_type_key}
              onChange={(event) => updateForm("passenger_type_key", event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]"
            >
              <option value="adult">Vuxen</option>
              <option value="child">Barn</option>
              <option value="youth">Ungdom</option>
              <option value="senior">Senior</option>
            </select>

            <select
              value={form.ticket_type_key}
              onChange={(event) => updateForm("ticket_type_key", event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]"
            >
              <option value="economy">Ekonomi</option>
              <option value="plus">Plus</option>
            </select>

            <input
              value={form.price_sek}
              onChange={(event) => updateForm("price_sek", event.target.value)}
              placeholder="Pris"
              type="number"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007764]"
            />
          </div>

          <button
            type="button"
            onClick={savePrice}
            disabled={saving}
            className="mt-5 rounded-2xl bg-[#007764] px-5 py-3 text-sm font-semibold text-white hover:bg-[#006A59] disabled:opacity-60"
          >
            {saving ? "Sparar..." : "Spara pris"}
          </button>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Aktiva priser
          </h2>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Linje</th>
                  <th className="px-4 py-3">Från</th>
                  <th className="px-4 py-3">Till</th>
                  <th className="px-4 py-3">Resenär</th>
                  <th className="px-4 py-3">Biljettyp</th>
                  <th className="px-4 py-3">Pris</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {prices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Inga priser finns ännu.
                    </td>
                  </tr>
                ) : (
                  prices.map((item) => (
                    <tr
                      key={item.id || `${item.line_code}-${item.from_stop_name}-${item.passenger_type_key}-${item.ticket_type_key}`}
                    >
                      <td className="px-4 py-3">{item.line_code}</td>
                      <td className="px-4 py-3">{item.from_stop_name}</td>
                      <td className="px-4 py-3">{item.to_stop_name}</td>
                      <td className="px-4 py-3">{passengerLabel(item.passenger_type_key)}</td>
                      <td className="px-4 py-3">{ticketLabel(item.ticket_type_key)}</td>
                      <td className="px-4 py-3 font-semibold">{item.price_sek} kr</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => deletePrice(item.id)}
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
