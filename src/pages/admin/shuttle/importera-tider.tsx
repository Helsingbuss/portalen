import { useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

const exampleText = `Datum; Linje; Riktning; Helsingborg C; Helsingborg Stattena; Ängelholm Station; Ängelholms Flygplats; Pris; Kapacitet
2027-01-02; 811; outbound; 08:40; 08:46; 09:08; 09:20; 199; 49
2027-01-03; 811; outbound; 10:40; 10:46; 11:08; 11:20; 199; 49`;

export default function ImporteraShuttleTiderPage() {
  const [text, setText] = useState(exampleText);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const rows = useMemo(() => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean).length;
  }, [text]);

  async function runImport(mode: "preview" | "import") {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/shuttle/departures/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          text,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        ok: false,
        message: error?.message || "Något gick fel.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <AdminMenu />

      <main className="min-h-screen space-y-6 bg-[#f7f9fb] px-8 py-6 pt-24 md:ml-[280px] md:px-8 lg:px-10">
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#007764]">
              Flygbuss
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1A545F]">
              Importera avgångstider
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Klistra in många avgångar samtidigt. Börja med förhandsgranskning
              så kontrollerar systemet datum, linje och hållplatser innan något sparas.
            </p>
          </div>

          <div className="rounded-2xl bg-[#1A545F]/5 px-4 py-3 text-sm text-[#1A545F]">
            <strong>{rows}</strong> rader i rutan
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Klistra in tider
          </label>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-h-[360px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none transition focus:border-[#007764] focus:bg-white"
            spellCheck={false}
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => runImport("preview")}
              disabled={loading}
              className="rounded-full bg-[#1A545F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#164852] disabled:opacity-60"
            >
              {loading ? "Arbetar..." : "Förhandsgranska"}
            </button>

            <button
              type="button"
              onClick={() => runImport("import")}
              disabled={loading}
              className="rounded-full bg-[#007764] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#006A59] disabled:opacity-60"
            >
              {loading ? "Importerar..." : "Importera avgångar"}
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1A545F]">
              Format
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Första raden är rubriker. Hållplatserna skrivs som egna kolumner.
              Varje rad efter det blir en avgång.
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
              <p>Datum; Linje; Riktning; Helsingborg C; Ängelholms Flygplats; Pris; Kapacitet</p>
              <p>2027-01-02; 811; outbound; 08:40; 09:20; 199; 49</p>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1A545F]">
              Tips
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Använd linjenummer som redan finns i Portalen, till exempel 811.
              Hållplatsnamnen måste matcha hållplatserna som redan finns upplagda.
            </p>
          </div>
        </aside>
      </section>

      {result ? (
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#1A545F]">
                Resultat
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {result.ok ? "Kontrollen är klar." : "Något behöver rättas."}
              </p>
            </div>

            <div
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                result.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {result.ok ? "OK" : "Fel"}
            </div>
          </div>

          {result.message ? (
            <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {result.message}
            </div>
          ) : null}

          {result.ok ? (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Giltiga
                </p>
                <strong className="mt-1 block text-2xl text-[#1A545F]">
                  {result.validCount ?? result.importedCount ?? 0}
                </strong>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Fel
                </p>
                <strong className="mt-1 block text-2xl text-[#1A545F]">
                  {result.invalidCount ?? 0}
                </strong>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Importerade
                </p>
                <strong className="mt-1 block text-2xl text-[#1A545F]">
                  {result.importedCount ?? 0}
                </strong>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Hoppade över
                </p>
                <strong className="mt-1 block text-2xl text-[#1A545F]">
                  {result.skippedCount ?? 0}
                </strong>
              </div>
            </div>
          ) : null}

          {Array.isArray(result.rows) && result.rows.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Rad</th>
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Linje</th>
                    <th className="px-4 py-3">Tid</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row: any) => (
                    <tr key={row.rowNumber} className="border-t">
                      <td className="px-4 py-3">{row.rowNumber}</td>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">{row.line}</td>
                      <td className="px-4 py-3">
                        {row.departureTime} → {row.arrivalTime}
                      </td>
                      <td className="px-4 py-3">
                        {row.errors?.length ? (
                          <span className="text-red-600">
                            {row.errors.join(" ")}
                          </span>
                        ) : (
                          <span className="text-emerald-700">Redo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {Array.isArray(result.imported) && result.imported.length > 0 ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
              {result.imported.length} avgångar importerades.
            </div>
          ) : null}

          {Array.isArray(result.skipped) && result.skipped.length > 0 ? (
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              {result.skipped.length} avgångar fanns redan och hoppades över.
            </div>
          ) : null}
        </section>
      ) : null}
      </main>
    </>
  );
}




