import { useEffect, useMemo, useState } from "react";
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

function parseAmount(value: any) {
  let text = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/kr/gi, "");

  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    text = text.replace(",", ".");
  }

  const num = Number(text);

  return Number.isFinite(num) ? num : 0;
}

function detectDelimiter(line: string) {
  const candidates = [
    { delimiter: ";", count: (line.match(/;/g) || []).length },
    { delimiter: "\t", count: (line.match(/\t/g) || []).length },
    { delimiter: ",", count: (line.match(/,/g) || []).length },
  ];

  candidates.sort((a, b) => b.count - a.count);

  return candidates[0]?.count > 0 ? candidates[0].delimiter : ";";
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  return cells;
}

function parseCsv(text: string) {
  const clean = text.replace(/^\uFEFF/, "").trim();

  if (!clean) {
    return {
      headers: [] as string[],
      rows: [] as string[][],
    };
  }

  const lines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      headers: [] as string[],
      rows: [] as string[][],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const allRows = lines.map((line) => parseCsvLine(line, delimiter));
  const headers = allRows[0].map((header, index) => header || "Kolumn " + (index + 1));
  const rows = allRows.slice(1);

  return { headers, rows };
}

function guessColumn(headers: string[], keywords: string[]) {
  const normalized = headers.map((header) => header.toLowerCase());

  for (const keyword of keywords) {
    const index = normalized.findIndex((header) => header.includes(keyword));
    if (index >= 0) return String(index);
  }

  return "";
}

export default function BankhandelserPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bankTransactions, setBankTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});

  const [bankAccountId, setBankAccountId] = useState("");
  const [status, setStatus] = useState("");
  const [csvText, setCsvText] = useState("");

  const [dateColumn, setDateColumn] = useState("");
  const [descriptionColumn, setDescriptionColumn] = useState("");
  const [amountColumn, setAmountColumn] = useState("");
  const [balanceColumn, setBalanceColumn] = useState("");
  const [referenceColumn, setReferenceColumn] = useState("");

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const parsed = useMemo(() => parseCsv(csvText), [csvText]);

  const columnOptions = useMemo(() => {
    return [
      ["", "Välj kolumn"],
      ...parsed.headers.map((header, index) => [String(index), header] as [string, string]),
    ] as [string, string][];
  }, [parsed.headers]);

  const previewRows = useMemo(() => {
    if (!parsed.rows.length) return [];

    return parsed.rows.slice(0, 10).map((row) => ({
      transaction_date: dateColumn !== "" ? row[Number(dateColumn)] || "" : "",
      description: descriptionColumn !== "" ? row[Number(descriptionColumn)] || "" : "",
      reference: referenceColumn !== "" ? row[Number(referenceColumn)] || "" : "",
      amount: amountColumn !== "" ? parseAmount(row[Number(amountColumn)]) : 0,
      balance: balanceColumn !== "" ? parseAmount(row[Number(balanceColumn)]) : null,
      raw_data: Object.fromEntries(parsed.headers.map((header, index) => [header, row[index] || ""])),
    }));
  }, [parsed, dateColumn, descriptionColumn, referenceColumn, amountColumn, balanceColumn]);

  const importRows = useMemo(() => {
    if (!parsed.rows.length) return [];

    return parsed.rows.map((row) => ({
      transaction_date: dateColumn !== "" ? row[Number(dateColumn)] || "" : "",
      description: descriptionColumn !== "" ? row[Number(descriptionColumn)] || "" : "",
      reference: referenceColumn !== "" ? row[Number(referenceColumn)] || "" : "",
      amount: amountColumn !== "" ? row[Number(amountColumn)] || "" : "",
      balance: balanceColumn !== "" ? row[Number(balanceColumn)] || "" : "",
      currency: "SEK",
      raw_data: Object.fromEntries(parsed.headers.map((header, index) => [header, row[index] || ""])),
    }));
  }, [parsed, dateColumn, descriptionColumn, referenceColumn, amountColumn, balanceColumn]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (bankAccountId) params.set("bank_account_id", bankAccountId);

      const res = await fetch("/api/admin/ekonomi/bankhandelser?" + params.toString());
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta bankhändelser.");
      }

      setNeedsSetup(Boolean(json.needsSetup));
      setAccounts(json.accounts || []);
      setBankTransactions(json.bankTransactions || []);
      setSummary(json.summary || {});

      if (!bankAccountId && json.accounts?.[0]?.id) {
        setBankAccountId(json.accounts[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta bankhändelser.");
    } finally {
      setLoading(false);
    }
  }

  async function readFile(file?: File | null) {
    if (!file) return;

    const text = await file.text();
    setCsvText(text);
  }

  function autoMap() {
    setDateColumn(guessColumn(parsed.headers, ["datum", "bokföringsdag", "transaktionsdag", "date"]));
    setDescriptionColumn(guessColumn(parsed.headers, ["text", "beskrivning", "meddelande", "namn", "description"]));
    setAmountColumn(guessColumn(parsed.headers, ["belopp", "amount", "summa"]));
    setBalanceColumn(guessColumn(parsed.headers, ["saldo", "balance"]));
    setReferenceColumn(guessColumn(parsed.headers, ["ocr", "referens", "reference", "meddelande"]));
  }

  async function importBankTransactions() {
    try {
      setImporting(true);
      setError("");
      setMessage("");

      if (!bankAccountId) {
        throw new Error("Välj bankkonto först.");
      }

      if (!dateColumn || !descriptionColumn || !amountColumn) {
        throw new Error("Datum, beskrivning och belopp måste vara mappade.");
      }

      const validRows = importRows.filter((row) => row.transaction_date && row.description && String(row.amount || "").trim());

      if (validRows.length === 0) {
        throw new Error("Inga giltiga rader att importera.");
      }

      const res = await fetch("/api/admin/ekonomi/bankhandelser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bank_account_id: bankAccountId,
          source: "csv",
          rows: validRows,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte importera bankhändelser.");
      }

      setMessage("Importerade " + json.importedCount + " bankhändelser.");
      setCsvText("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte importera bankhändelser.");
    } finally {
      setImporting(false);
    }
  }

  async function autoMatchBankTransactions() {
    const ok = window.confirm(
      "Vill du försöka matcha alla nya bankhändelser automatiskt mot fakturor?\n\nEndast säkra träffar matchas."
    );

    if (!ok) return;

    try {
      setImporting(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/bankhandelser/auto-match", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte matcha bankhändelser.");
      }

      setMessage(
        "Matchning klar. Kontrollerade " +
          json.checkedCount +
          " bankhändelser, matchade " +
          json.matchedCount +
          " och hoppade över " +
          json.skippedCount +
          "."
      );

      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte matcha bankhändelser.");
    } finally {
      setImporting(false);
    }
  }

async function setTransactionStatus(row: any, nextStatus: string) {
    try {
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/bankhandelser", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: row.id,
          status: nextStatus,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte uppdatera bankhändelsen.");
      }

      setMessage("Bankhändelsen uppdaterades.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kunde inte uppdatera bankhändelsen.");
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (parsed.headers.length > 0) {
      autoMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.headers.join("|")]);

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
                  Bankhändelser / import
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Importera bankhändelser från CSV. I nästa steg matchar vi dem mot kundfakturor och leverantörsfakturor.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={autoMatchBankTransactions}
                  disabled={importing}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  Auto-matcha bankhändelser
                </button>

                <button
                type="button"
                onClick={loadData}
                className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
              >
                Uppdatera
              </button>
              </div>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellen för bankhändelser saknas. Kör SQL-koden först.
              </section>
            )}

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
              <SummaryCard label="Importerade" value={summary.total || 0} sub="Visas i listan" tone="neutral" />
              <SummaryCard label="Nya" value={summary.newCount || 0} sub="Ej matchade" tone="amber" />
              <SummaryCard label="Inbetalningar" value={fmtMoney(summary.incomingAmount)} sub="Plusbelopp" tone="green" />
              <SummaryCard label="Utbetalningar" value={fmtMoney(summary.outgoingAmount)} sub="Minusbelopp" tone="red" />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">Importera CSV</h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <SelectField
                  label="Bankkonto"
                  value={bankAccountId}
                  onChange={setBankAccountId}
                  options={[
                    ["", "Välj bankkonto"],
                    ...accounts.map((account) => [
                      account.id,
                      account.account_label || account.bank_name || "Bankkonto",
                    ] as [string, string]),
                  ]}
                />

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Välj CSV-fil
                  </label>

                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={(event) => readFile(event.target.files?.[0])}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-[#194C66] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={autoMap}
                    disabled={!parsed.headers.length}
                    className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Auto-mappa kolumner
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Eller klistra in CSV här
                </label>

                <textarea
                  value={csvText}
                  onChange={(event) => setCsvText(event.target.value)}
                  rows={7}
                  placeholder="Klistra in CSV från banken här..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                />
              </div>

              {parsed.headers.length > 0 && (
                <>
                  <div className="mt-6 grid gap-4 lg:grid-cols-5">
                    <SelectField label="Datum" value={dateColumn} onChange={setDateColumn} options={columnOptions} />
                    <SelectField label="Beskrivning" value={descriptionColumn} onChange={setDescriptionColumn} options={columnOptions} />
                    <SelectField label="Belopp" value={amountColumn} onChange={setAmountColumn} options={columnOptions} />
                    <SelectField label="Saldo" value={balanceColumn} onChange={setBalanceColumn} options={columnOptions} />
                    <SelectField label="Referens/OCR" value={referenceColumn} onChange={setReferenceColumn} options={columnOptions} />
                  </div>

                  <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-[#194C66]">
                      Förhandsgranskning · {parsed.rows.length} rader hittades
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-[760px] w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <Th>Datum</Th>
                            <Th>Beskrivning</Th>
                            <Th>Referens</Th>
                            <Th className="text-right">Belopp</Th>
                            <Th className="text-right">Saldo</Th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {previewRows.map((row, index) => (
                            <tr key={index}>
                              <Td>{row.transaction_date || "—"}</Td>
                              <Td>{row.description || "—"}</Td>
                              <Td>{row.reference || "—"}</Td>
                              <Td className={"text-right font-bold " + (row.amount >= 0 ? "text-emerald-700" : "text-red-700")}>
                                {fmtMoney(row.amount)}
                              </Td>
                              <Td className="text-right">{row.balance === null ? "—" : fmtMoney(row.balance)}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={importBankTransactions}
                      disabled={importing || !bankAccountId}
                      className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                    >
                      {importing ? "Importerar..." : "Importera bankhändelser"}
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto] lg:items-end">
                  <div>
                    <h2 className="text-lg font-bold text-[#194C66]">Importerade bankhändelser</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Här visas senaste importerade bankhändelser. Matchning bygger vi i nästa steg.
                    </p>
                  </div>

                  <SelectField
                    label="Status"
                    value={status}
                    onChange={setStatus}
                    options={[
                      ["", "Alla"],
                      ["new", "Nya"],
                      ["matched", "Matchade"],
                      ["ignored", "Ignorerade"],
                    ]}
                  />

                  <SelectField
                    label="Bankkonto"
                    value={bankAccountId}
                    onChange={setBankAccountId}
                    options={[
                      ["", "Alla konton"],
                      ...accounts.map((account) => [
                        account.id,
                        account.account_label || account.bank_name || "Bankkonto",
                      ] as [string, string]),
                    ]}
                  />

                  <button
                    type="button"
                    onClick={loadData}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Filtrera
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Laddar bankhändelser...</div>
              ) : bankTransactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Inga bankhändelser importerade ännu.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Th>Datum</Th>
                        <Th>Beskrivning</Th>
                        <Th>Referens</Th>
                        <Th className="text-right">Belopp</Th>
                        <Th className="text-right">Saldo</Th>
                        <Th>Status</Th>
                        <Th>Åtgärd</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {bankTransactions.map((row) => (
                        <tr key={row.id}>
                          <Td>{fmtDate(row.transaction_date)}</Td>
                          <Td>
                            <div className="font-semibold text-[#194C66]">{row.description}</div>
                            <div className="mt-1 text-xs text-slate-500">{row.source || "csv"}</div>
                          </Td>
                          <Td>{row.reference || "—"}</Td>
                          <Td className={"text-right font-black " + (Number(row.amount) >= 0 ? "text-emerald-700" : "text-red-700")}>
                            {fmtMoney(row.amount)}
                          </Td>
                          <Td className="text-right">{row.balance === null || row.balance === undefined ? "—" : fmtMoney(row.balance)}</Td>
                          <Td>
                            <StatusBadge status={row.status}>{row.status_label}</StatusBadge>
                          </Td>
                          <Td>
                            <div className="flex flex-wrap gap-2">
                              {row.status === "new" && (
                                <a
                                  href={"/admin/ekonomi/bankhandelser/" + encodeURIComponent(row.id)}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  Matcha manuellt
                                </a>
                              )}

                              {row.status !== "new" && (
                                <button
                                  type="button"
                                  onClick={() => setTransactionStatus(row, "new")}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                                >
                                  Sätt som ny
                                </button>
                              )}

                              {row.status !== "ignored" && (
                                <button
                                  type="button"
                                  onClick={() => setTransactionStatus(row, "ignored")}
                                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                >
                                  Ignorera
                                </button>
                              )}
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
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  tone: "green" | "amber" | "red" | "neutral";
}) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-700"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-[#194C66]";

  return (
    <div className={"rounded-2xl border p-5 shadow-sm " + cls}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-semibold">{sub}</div>
    </div>
  );
}

function StatusBadge({ status, children }: { status: string; children: ReactNode }) {
  const cls =
    status === "matched"
      ? "bg-emerald-100 text-emerald-700"
      : status === "ignored"
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-100 text-amber-700";

  return (
    <span className={"rounded-full px-3 py-1 text-xs font-semibold " + cls}>
      {children}
    </span>
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
