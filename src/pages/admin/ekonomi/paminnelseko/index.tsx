import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return String(value);
  }
}

function statusText(value: string) {
  if (value === "urgent") return "Prioriterad";
  if (value === "due") return "Redo att skickas";
  return "Kommande";
}

export default function PaminnelsekoPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [settings, setSettings] = useState<any>({});
  const [filter, setFilter] = useState("all");

  const [includeFee, setIncludeFee] = useState(true);
  const [includeInterest, setIncludeInterest] = useState(false);
  const [useRecommended, setUseRecommended] = useState(true);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadQueue() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("filter", filter);

      const res = await fetch("/api/admin/ekonomi/paminnelseko?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta påminnelsekön.");
      }

      setRows(json.rows || []);
      setSummary(json.summary || {});
      setSettings(json.settings || {});
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta påminnelsekön.");
    } finally {
      setLoading(false);
    }
  }

  async function sendOne(row: any) {
    const useFee = useRecommended ? row.recommended_include_fee : includeFee;
    const useInterest = useRecommended ? row.recommended_include_interest : includeInterest;

    const ok = window.confirm(
      "Vill du skicka påminnelse?\n\n" +
        row.customer_name +
        "\nFaktura: " +
        row.invoice_number +
        "\nBelopp: " +
        fmtMoney(row.unpaid_amount) +
        "\n\nPåminnelseavgift: " +
        (useFee ? "Ja" : "Nej") +
        "\nDröjsmålsränta: " +
        (useInterest ? "Ja" : "Nej")
    );

    if (!ok) return;

    try {
      setSending(row.id);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/paminnelseko", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send_one",
          invoice_id: row.id,
          include_fee: useFee,
          include_interest: useInterest,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skicka påminnelse.");
      }

      setMessage("Påminnelsen skickades.");
      await loadQueue();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skicka påminnelse.");
    } finally {
      setSending("");
    }
  }

  async function sendAllDue() {
    const ok = window.confirm(
      "Vill du skicka alla påminnelser som är redo i kön?\n\nAntal: " +
        (summary.dueCount || 0) +
        "\nBelopp: " +
        fmtMoney(summary.dueAmount)
    );

    if (!ok) return;

    try {
      setSending("all");
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/paminnelseko", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send_due",
          include_fee: includeFee,
          include_interest: includeInterest,
          use_recommended: useRecommended,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skicka påminnelsekön.");
      }

      setMessage(
        "Kön är körd. Skickade " +
          json.sentCount +
          " påminnelser. Misslyckade: " +
          json.failedCount +
          "."
      );

      await loadQueue();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skicka påminnelsekön.");
    } finally {
      setSending("");
    }
  }

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Ekonomi
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Automatisk påminnelsekö
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Här samlas förfallna kundfakturor som bör få påminnelse. Du kan skicka en åt gången eller hela kön.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadQueue}
                  disabled={loading || Boolean(sending)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Uppdatera
                </button>

                <button
                  type="button"
                  onClick={sendAllDue}
                  disabled={Boolean(sending) || !summary.dueCount}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {sending === "all" ? "Skickar..." : "Skicka alla redo"}
                </button>
              </div>
            </div>

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 shadow-sm">
                {message}
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Förfallna i kö" value={summary.totalCount || 0} />
              <SummaryCard label="Redo att skickas" value={summary.dueCount || 0} tone="amber" />
              <SummaryCard label="Prioriterade" value={summary.urgentCount || 0} tone="red" />
              <SummaryCard label="Förfallet belopp" value={fmtMoney(summary.overdueAmount)} tone="amber" />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Inställningar för körning</h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr_1fr_1fr_auto] lg:items-end">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Visa
                  </label>

                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  >
                    <option value="all">Alla förfallna</option>
                    <option value="due">Redo att skickas</option>
                    <option value="urgent">Prioriterade</option>
                  </select>
                </div>

                <CheckBox
                  checked={useRecommended}
                  onChange={setUseRecommended}
                  label="Använd rekommenderat"
                  sub="Systemet väljer avgift/ränta efter dagar och antal påminnelser."
                />

                <CheckBox
                  checked={includeFee}
                  onChange={setIncludeFee}
                  label={"Påminnelseavgift " + fmtMoney(settings.reminder_fee_amount)}
                  sub="Används när rekommenderat är avstängt."
                />

                <CheckBox
                  checked={includeInterest}
                  onChange={setIncludeInterest}
                  label={"Dröjsmålsränta " + (settings.late_interest_percent || 0) + "%"}
                  sub="Används när rekommenderat är avstängt."
                />

                <button
                  type="button"
                  onClick={loadQueue}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12384c]"
                >
                  Filtrera
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Viktigt:</strong> Påminnelsekön skickar inte helt själv i bakgrunden ännu. Den samlar och föreslår vilka som ska skickas. Vill du ha helt schemalagd körning senare kan vi koppla detta till en cron/scheduler.
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-bold text-[#194C66]">Påminnelsekö</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fakturor visas när de är förfallna och ännu inte betalda.
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Laddar påminnelsekö...
                </div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Inga fakturor finns i påminnelsekön just nu.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1350px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Status</Th>
                        <Th>Kund</Th>
                        <Th>Faktura</Th>
                        <Th>OCR</Th>
                        <Th>Förfall</Th>
                        <Th className="text-right">Dagar sen</Th>
                        <Th className="text-right">Belopp</Th>
                        <Th className="text-right">Påminnelser</Th>
                        <Th>Nästa påminnelse</Th>
                        <Th>Rekommendation</Th>
                        <Th>Åtgärd</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => (
                        <tr key={row.id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (row.queue_status === "urgent" ? "bg-red-100 text-red-700" : row.queue_status === "due" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                              {statusText(row.queue_status)}
                            </span>
                          </Td>

                          <Td>
                            <div className="font-bold text-[#194C66]">{row.customer_name}</div>
                            <div className="mt-1 text-xs text-slate-500">{row.customer_email || "Ingen e-post"}</div>
                          </Td>

                          <Td>{row.invoice_number || "—"}</Td>
                          <Td>{row.ocr_number || "—"}</Td>
                          <Td>{fmtDate(row.due_date)}</Td>
                          <Td className="text-right font-bold">{row.days_overdue}</Td>
                          <Td className="text-right font-black text-red-700">{fmtMoney(row.unpaid_amount)}</Td>
                          <Td className="text-right">{row.reminder_count}</Td>
                          <Td>{fmtDate(row.next_reminder_date)}</Td>

                          <Td>
                            <div className="text-xs leading-5 text-slate-600">
                              Avgift: <strong>{row.recommended_include_fee ? "Ja" : "Nej"}</strong>
                              <br />
                              Ränta: <strong>{row.recommended_include_interest ? "Ja" : "Nej"}</strong>
                            </div>
                          </Td>

                          <Td>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => sendOne(row)}
                                disabled={Boolean(sending) || !row.due_for_reminder}
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                              >
                                {sending === row.id ? "Skickar..." : "Skicka"}
                              </button>

                              <a
                                href={row.href}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                              >
                                Öppna
                              </a>
                            </div>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "amber" | "red";
}) {
  const cls =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

function CheckBox({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  sub: string;
}) {
  return (
    <label className="flex min-h-[74px] items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />

      <span>
        <span className="block font-bold text-[#194C66]">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{sub}</span>
      </span>
    </label>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
