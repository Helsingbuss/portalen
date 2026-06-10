import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
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
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "matched": return "Matchad";
    case "ignored": return "Ignorerad";
    case "new": return "Ny";
    default: return status || "Status";
  }
}

export default function BankhandelseMatchPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [bankTransaction, setBankTransaction] = useState<any>(null);
  const [customerCandidates, setCustomerCandidates] = useState<any[]>([]);
  const [supplierCandidates, setSupplierCandidates] = useState<any[]>([]);

  const [selectedType, setSelectedType] = useState("customer");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const amount = Number(bankTransaction?.amount || 0);
  const recommendedType = amount < 0 ? "supplier" : "customer";

  const visibleCandidates = useMemo(() => {
    return selectedType === "supplier" ? supplierCandidates : customerCandidates;
  }, [selectedType, supplierCandidates, customerCandidates]);

  async function loadMatchData() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/ekonomi/bankhandelser/" + encodeURIComponent(id) + "/match");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta matchningsdata.");
      }

      setBankTransaction(json.bankTransaction);
      setCustomerCandidates(json.customerCandidates || []);
      setSupplierCandidates(json.supplierCandidates || []);

      const nextType = Number(json.bankTransaction?.amount || 0) < 0 ? "supplier" : "customer";
      setSelectedType(nextType);

      const list = nextType === "supplier" ? json.supplierCandidates || [] : json.customerCandidates || [];
      setSelectedInvoiceId(list?.[0]?.id || "");
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta matchningsdata.");
    } finally {
      setLoading(false);
    }
  }

  function changeType(value: string) {
    setSelectedType(value);

    const list = value === "supplier" ? supplierCandidates : customerCandidates;
    setSelectedInvoiceId(list?.[0]?.id || "");
  }

  async function matchSelected() {
    if (!selectedInvoiceId) {
      setError("Välj en faktura först.");
      return;
    }

    const selected = visibleCandidates.find((item) => item.id === selectedInvoiceId);

    const ok = window.confirm(
      "Vill du matcha bankhändelsen mot denna faktura?\n\n" +
        (selected?.name || "") +
        "\nFaktura: " +
        (selected?.invoice_number || "") +
        "\nBelopp: " +
        fmtMoney(selected?.amount_due)
    );

    if (!ok) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/bankhandelser/" + encodeURIComponent(id) + "/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: selectedType,
          invoice_id: selectedInvoiceId,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte matcha bankhändelsen.");
      }

      setMessage("Bankhändelsen matchades och fakturan markerades som betald.");
      await loadMatchData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte matcha bankhändelsen.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadMatchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
                  Matcha bankhändelse
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Välj vilken kundfaktura eller leverantörsfaktura bankhändelsen hör till.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/admin/ekonomi/bankhandelser"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Till bankhändelser
                </a>

                <button
                  type="button"
                  onClick={loadMatchData}
                  disabled={loading || saving}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  Ladda om
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

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar matchning...
              </section>
            ) : (
              <>
                <section className="grid gap-4 lg:grid-cols-4">
                  <SummaryCard label="Datum" value={fmtDate(bankTransaction?.transaction_date)} />
                  <SummaryCard label="Belopp" value={fmtMoney(bankTransaction?.amount)} tone={amount >= 0 ? "green" : "red"} />
                  <SummaryCard label="Status" value={statusLabel(bankTransaction?.status)} />
                  <SummaryCard label="Rekommendation" value={recommendedType === "supplier" ? "Leverantör" : "Kund"} />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Bankhändelse</h2>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <Info label="Beskrivning" value={bankTransaction?.description || "—"} />
                    <Info label="Referens" value={bankTransaction?.reference || "—"} />
                    <Info label="Saldo" value={bankTransaction?.balance === null || bankTransaction?.balance === undefined ? "—" : fmtMoney(bankTransaction?.balance)} />
                  </div>

                  {bankTransaction?.status === "matched" && (
                    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                      Denna bankhändelse är redan matchad.
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[#194C66]">Välj matchning</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Kandidaterna sorteras efter hur bra belopp, OCR och text verkar stämma.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
                      <SelectField
                        label="Typ"
                        value={selectedType}
                        onChange={changeType}
                        options={[
                          ["customer", "Kundfaktura"],
                          ["supplier", "Leverantörsfaktura"],
                        ]}
                      />

                      <SelectField
                        label="Faktura"
                        value={selectedInvoiceId}
                        onChange={setSelectedInvoiceId}
                        options={[
                          ["", "Välj faktura"],
                          ...visibleCandidates.map((item) => [
                            item.id,
                            item.name + " · Faktura " + item.invoice_number + " · " + fmtMoney(item.amount_due),
                          ] as [string, string]),
                        ]}
                      />

                      <button
                        type="button"
                        onClick={matchSelected}
                        disabled={saving || bankTransaction?.status === "matched"}
                        className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                      >
                        Matcha vald
                      </button>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="text-lg font-bold text-[#194C66]">
                      Kandidater
                    </h2>
                  </div>

                  {visibleCandidates.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Inga öppna fakturor hittades för vald typ.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <Th>Match</Th>
                            <Th>Namn</Th>
                            <Th>Faktura</Th>
                            <Th>OCR</Th>
                            <Th>Förfallodatum</Th>
                            <Th className="text-right">Belopp</Th>
                            <Th>Öppna</Th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {visibleCandidates.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedInvoiceId(item.id)}
                              className={"cursor-pointer transition hover:bg-slate-50 " + (selectedInvoiceId === item.id ? "bg-emerald-50" : "")}
                            >
                              <Td>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                  {item.score}
                                </span>
                              </Td>
                              <Td className="font-bold text-[#194C66]">{item.name}</Td>
                              <Td>{item.invoice_number || "—"}</Td>
                              <Td>{item.ocr_number || "—"}</Td>
                              <Td>{fmtDate(item.due_date)}</Td>
                              <Td className="text-right font-black">{fmtMoney(item.amount_due)}</Td>
                              <Td>
                                <a
                                  href={item.href}
                                  onClick={(event) => event.stopPropagation()}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                                >
                                  Öppna
                                </a>
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
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
  tone?: "green" | "red";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 font-bold text-[#194C66]">{value}</div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide " + className}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-5 py-4 " + className}>{children}</td>;
}
