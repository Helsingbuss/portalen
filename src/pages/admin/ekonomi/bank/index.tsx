import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type BankAccount = Record<string, any>;
type FinanceSettings = Record<string, any>;

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10";

const emptyAccount = {
  account_label: "",
  account_purpose: "operating",
  account_type: "business_account",
  bank_name: "Swedbank",
  clearing_number: "",
  account_number: "",
  bankgiro: "",
  plusgiro: "",
  swish_number: "",
  iban: "",
  bic: "SWEDSESS",
  is_primary_for_invoices: false,
  is_primary_for_payroll: false,
  is_active: true,
  display_order: 100,
  notes: "",
};

function purposeLabel(value?: string) {
  switch (value) {
    case "operating":
      return "Driftkonto";
    case "vat_tax":
      return "Moms/Skatt";
    case "payroll":
      return "Lön";
    case "buffer":
      return "Buffert";
    case "travel_project":
      return "Resor/Projekt";
    default:
      return "Övrigt";
  }
}

function accountTypeLabel(value?: string) {
  switch (value) {
    case "business_account":
      return "Företagskonto";
    case "placement_account":
      return "Placeringskonto företag";
    case "savings_account":
      return "Sparkonto";
    default:
      return "Annat konto";
  }
}

function maskValue(value?: string | null) {
  const text = String(value || "").replace(/\s/g, "");
  if (!text) return "—";
  if (text.length <= 4) return "****";
  return "**** " + text.slice(-4);
}

function byPurpose(accounts: BankAccount[], purpose: string) {
  return accounts.find((account) => account.account_purpose === purpose);
}

export default function EkonomiBankPage() {
  const [settings, setSettings] = useState<FinanceSettings>({});
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountForm, setAccountForm] = useState<BankAccount>(emptyAccount);
  const [editingId, setEditingId] = useState("");

  const [needsSetup, setNeedsSetup] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const operatingAccount = useMemo(() => byPurpose(accounts, "operating"), [accounts]);
  const vatTaxAccount = useMemo(() => byPurpose(accounts, "vat_tax"), [accounts]);
  const payrollAccount = useMemo(() => byPurpose(accounts, "payroll"), [accounts]);
  const bufferAccount = useMemo(() => byPurpose(accounts, "buffer"), [accounts]);
  const travelAccount = useMemo(() => byPurpose(accounts, "travel_project"), [accounts]);

  function updateSetting(key: string, value: any) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateAccount(key: string, value: any) {
    setAccountForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetAccountForm() {
    setEditingId("");
    setAccountForm(emptyAccount);
    setShowAccountForm(false);
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [settingsRes, accountsRes] = await Promise.all([
        fetch("/api/admin/ekonomi/bank"),
        fetch("/api/admin/ekonomi/bank/accounts"),
      ]);

      const settingsJson = await settingsRes.json().catch(() => ({}));
      const accountsJson = await accountsRes.json().catch(() => ({}));

      if (!settingsRes.ok || !settingsJson.ok) {
        throw new Error(settingsJson.error || "Kunde inte hämta bankinställningar.");
      }

      if (!accountsRes.ok || !accountsJson.ok) {
        throw new Error(accountsJson.error || "Kunde inte hämta bankkonton.");
      }

      setSettings(settingsJson.settings || settingsJson.defaults || {});
      setAccounts(accountsJson.accounts || []);
      setNeedsSetup(Boolean(settingsJson.needsSetup || accountsJson.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Kunde inte hämta bank & betalning.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    try {
      setSavingSettings(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/bank", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara inställningar.");
      }

      setSettings(json.settings || settings);
      setMessage("Bank- och betalningsinställningar sparades.");
      setNeedsSetup(false);
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara inställningar.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveAccount(event: FormEvent) {
    event.preventDefault();

    try {
      setSavingAccount(true);
      setError("");
      setMessage("");

      const url = editingId
        ? "/api/admin/ekonomi/bank/accounts/" + encodeURIComponent(editingId)
        : "/api/admin/ekonomi/bank/accounts";

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountForm),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara bankkonto.");
      }

      setMessage(editingId ? "Bankkontot uppdaterades." : "Bankkontot skapades.");
      resetAccountForm();
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara bankkonto.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function archiveAccount(account: BankAccount) {
    const ok = window.confirm("Vill du arkivera bankkontot " + (account.account_label || "") + "?");

    if (!ok) return;

    try {
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/ekonomi/bank/accounts/" + encodeURIComponent(account.id), {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte arkivera bankkonto.");
      }

      setMessage("Bankkontot arkiverades.");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "Kunde inte arkivera bankkonto.");
    }
  }

  function editAccount(account: BankAccount) {
    setEditingId(account.id);
    setAccountForm({
      ...emptyAccount,
      ...account,
    });
    setShowAccountForm(true);
  }

  function startNewAccount(purpose: string, label: string, type = "placement_account") {
    setEditingId("");
    setAccountForm({
      ...emptyAccount,
      account_purpose: purpose,
      account_label: label,
      account_type: type,
    });
    setShowAccountForm(true);
  }

  useEffect(() => {
    loadAll();
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
                  Bank & betalning
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Här samlar vi driftkonto, moms/skatt, lön, buffert och resor/projekt. Bokföringskonton och BAS-konton ligger separat från riktiga bankkonton.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadAll}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>

                <button
                  type="button"
                  onClick={() => startNewAccount("operating", "Helsingbuss Drift", "business_account")}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  Nytt bankkonto
                </button>
              </div>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellen för bankinställningar saknas. Kör SQL-koden först.
              </section>
            )}

            {(message || error) && (
              <section
                className={
                  "rounded-2xl border p-5 text-sm font-semibold shadow-sm " +
                  (error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700")
                }
              >
                {error || message}
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Drift" account={operatingAccount} onCreate={() => startNewAccount("operating", "Helsingbuss Drift", "business_account")} />
              <SummaryCard label="Moms/Skatt" account={vatTaxAccount} onCreate={() => startNewAccount("vat_tax", "MomsSkatt", "placement_account")} />
              <SummaryCard label="Lön" account={payrollAccount} onCreate={() => startNewAccount("payroll", "Lön", "placement_account")} />
              <SummaryCard label="Buffert" account={bufferAccount} onCreate={() => startNewAccount("buffer", "Helsingbuss Buffert", "placement_account")} />
              <SummaryCard label="Resor/Projekt" account={travelAccount} onCreate={() => startNewAccount("travel_project", "Helsingbuss Resor/Projekt", "placement_account")} />
            </div>

            {showAccountForm && (
              <form onSubmit={saveAccount} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    {editingId ? "Redigera bankkonto" : "Nytt bankkonto"}
                  </h2>

                  <button
                    type="button"
                    onClick={resetAccountForm}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Stäng
                  </button>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                  <Field label="Kontonamn" value={accountForm.account_label} onChange={(v) => updateAccount("account_label", v)} />

                  <SelectField
                    label="Syfte"
                    value={accountForm.account_purpose}
                    onChange={(v) => updateAccount("account_purpose", v)}
                    options={[
                      ["operating", "Driftkonto"],
                      ["vat_tax", "Moms/Skatt"],
                      ["payroll", "Lön"],
                      ["buffer", "Buffert"],
                      ["travel_project", "Resor/Projekt"],
                      ["other", "Övrigt"],
                    ]}
                  />

                  <SelectField
                    label="Kontotyp"
                    value={accountForm.account_type}
                    onChange={(v) => updateAccount("account_type", v)}
                    options={[
                      ["business_account", "Företagskonto"],
                      ["placement_account", "Placeringskonto företag"],
                      ["savings_account", "Sparkonto"],
                      ["other", "Annat"],
                    ]}
                  />

                  <Field label="Bank" value={accountForm.bank_name} onChange={(v) => updateAccount("bank_name", v)} />
                  <Field label="Clearingnummer" value={accountForm.clearing_number} onChange={(v) => updateAccount("clearing_number", v)} />
                  <Field label="Kontonummer" value={accountForm.account_number} onChange={(v) => updateAccount("account_number", v)} />
                  <Field label="Bankgiro" value={accountForm.bankgiro} onChange={(v) => updateAccount("bankgiro", v)} />
                  <Field label="Plusgiro" value={accountForm.plusgiro} onChange={(v) => updateAccount("plusgiro", v)} />
                  <Field label="Swishnummer" value={accountForm.swish_number} onChange={(v) => updateAccount("swish_number", v)} />
                  <Field label="IBAN" value={accountForm.iban} onChange={(v) => updateAccount("iban", v)} />
                  <Field label="BIC / SWIFT" value={accountForm.bic} onChange={(v) => updateAccount("bic", v)} />

                  <SelectField
                    label="Primärt för fakturor"
                    value={accountForm.is_primary_for_invoices ? "true" : "false"}
                    onChange={(v) => updateAccount("is_primary_for_invoices", v === "true")}
                    options={[
                      ["false", "Nej"],
                      ["true", "Ja"],
                    ]}
                  />

                  <SelectField
                    label="Primärt för lön"
                    value={accountForm.is_primary_for_payroll ? "true" : "false"}
                    onChange={(v) => updateAccount("is_primary_for_payroll", v === "true")}
                    options={[
                      ["false", "Nej"],
                      ["true", "Ja"],
                    ]}
                  />

                  <Field label="Sortering" value={accountForm.display_order} onChange={(v) => updateAccount("display_order", v)} />
                </div>

                <Textarea label="Anteckning" value={accountForm.notes} onChange={(v) => updateAccount("notes", v)} />

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetAccountForm}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Avbryt
                  </button>

                  <button
                    type="submit"
                    disabled={savingAccount}
                    className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
                  >
                    {savingAccount ? "Sparar..." : "Spara bankkonto"}
                  </button>
                </div>
              </form>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-[#194C66]">
                  Bankkonton
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Kontonumren visas maskade i listan. Öppna/redigera kontot för att se hela uppgiften.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Namn</Th>
                      <Th>Syfte</Th>
                      <Th>Kontotyp</Th>
                      <Th>Bank</Th>
                      <Th>Clearing</Th>
                      <Th>Konto</Th>
                      <Th>IBAN</Th>
                      <Th>Swish</Th>
                      <Th>BIC</Th>
                      <Th>Primär</Th>
                      <Th>Åtgärd</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {accounts.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-10 text-center text-slate-500">
                          Inga bankkonton är inlagda ännu.
                        </td>
                      </tr>
                    ) : (
                      accounts.map((account) => (
                        <tr key={account.id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">{account.account_label}</div>
                            <div className="mt-1 text-xs text-slate-500">{account.notes || "—"}</div>
                          </Td>
                          <Td>{purposeLabel(account.account_purpose)}</Td>
                          <Td>{accountTypeLabel(account.account_type)}</Td>
                          <Td>{account.bank_name || "—"}</Td>
                          <Td>{account.clearing_number || "—"}</Td>
                          <Td>{maskValue(account.account_number)}</Td>
                          <Td>{maskValue(account.iban)}</Td>
                          <Td>{account.swish_number || "—"}</Td>
                          <Td>{account.bic || "—"}</Td>
                          <Td>
                            <div className="flex flex-col gap-1">
                              {account.is_primary_for_invoices && <Badge>Fakturor</Badge>}
                              {account.is_primary_for_payroll && <Badge>Lön</Badge>}
                              {!account.is_primary_for_invoices && !account.is_primary_for_payroll && "—"}
                            </div>
                          </Td>
                          <Td>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => editAccount(account)}
                                className="rounded-lg bg-[#194C66] px-3 py-2 text-xs font-semibold text-white"
                              >
                                Redigera
                              </button>

                              <button
                                type="button"
                                onClick={() => archiveAccount(account)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                              >
                                Arkivera
                              </button>
                            </div>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <form onSubmit={saveSettings} className="space-y-8">
              <Section title="Företagsuppgifter">
                <div className="grid gap-4 lg:grid-cols-4">
                  <Field label="Företagsnamn" value={settings.company_name} onChange={(v) => updateSetting("company_name", v)} />
                  <Field label="Juridiskt namn" value={settings.legal_name} onChange={(v) => updateSetting("legal_name", v)} />
                  <Field label="Organisationsnummer" value={settings.org_number} onChange={(v) => updateSetting("org_number", v)} />
                  <Field label="Momsregistreringsnummer" value={settings.vat_number} onChange={(v) => updateSetting("vat_number", v)} />
                </div>
              </Section>

              <Section title="Betalningsinställningar">
                <div className="grid gap-4 lg:grid-cols-4">
                  <Field label="Standardvaluta" value={settings.default_currency} onChange={(v) => updateSetting("default_currency", v)} />
                  <Field label="Betalningsvillkor dagar" value={settings.default_payment_terms_days} onChange={(v) => updateSetting("default_payment_terms_days", v)} />
                  <Field label="Påminnelseavgift" value={settings.reminder_fee} onChange={(v) => updateSetting("reminder_fee", v)} />
                  <Field label="Dröjsmålsränta %" value={settings.late_interest_percent} onChange={(v) => updateSetting("late_interest_percent", v)} />
                </div>

                <Textarea
                  label="Betalningstext på faktura"
                  value={settings.invoice_payment_text}
                  onChange={(v) => updateSetting("invoice_payment_text", v)}
                  placeholder="Ex. Betalas till bankgiro. Ange fakturanummer som referens."
                />
              </Section>

              <Section title="Moms & bokföringskonton">
                <div className="grid gap-4 lg:grid-cols-4">
                  <SelectField
                    label="Momsperiod"
                    value={settings.vat_period || "quarterly"}
                    onChange={(v) => updateSetting("vat_period", v)}
                    options={[
                      ["monthly", "Månadsvis"],
                      ["quarterly", "Kvartalsvis"],
                      ["yearly", "Årsvis"],
                    ]}
                  />

                  <Field label="Standardmoms %" value={settings.standard_vat_percent} onChange={(v) => updateSetting("standard_vat_percent", v)} />
                  <Field label="Bankkonto bokföring" value={settings.accounting_bank_account} onChange={(v) => updateSetting("accounting_bank_account", v)} />
                  <Field label="Skattekonto" value={settings.accounting_tax_account} onChange={(v) => updateSetting("accounting_tax_account", v)} />
                  <Field label="Utgående moms 25 %" value={settings.accounting_vat_output_account_25} onChange={(v) => updateSetting("accounting_vat_output_account_25", v)} />
                  <Field label="Utgående moms 12 %" value={settings.accounting_vat_output_account_12} onChange={(v) => updateSetting("accounting_vat_output_account_12", v)} />
                  <Field label="Utgående moms 6 %" value={settings.accounting_vat_output_account_6} onChange={(v) => updateSetting("accounting_vat_output_account_6", v)} />
                  <Field label="Ingående moms" value={settings.accounting_vat_input_account} onChange={(v) => updateSetting("accounting_vat_input_account", v)} />
                  <Field label="Momsredovisning" value={settings.accounting_vat_report_account} onChange={(v) => updateSetting("accounting_vat_report_account", v)} />
                  <Field label="Kundfordringar" value={settings.accounting_customer_receivables_account} onChange={(v) => updateSetting("accounting_customer_receivables_account", v)} />
                  <Field label="Leverantörsskulder" value={settings.accounting_supplier_payables_account} onChange={(v) => updateSetting("accounting_supplier_payables_account", v)} />
                </div>
              </Section>

              <Section title="Anteckningar">
                <Textarea label="Intern anteckning" value={settings.notes} onChange={(v) => updateSetting("notes", v)} />
              </Section>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {savingSettings ? "Sparar..." : "Spara inställningar"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  account,
  onCreate,
}: {
  label: string;
  account?: BankAccount;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      {account ? (
        <>
          <div className="mt-2 truncate text-xl font-bold text-[#194C66]">{account.account_label}</div>
          <div className="mt-1 text-sm text-slate-500">{account.bank_name || "Bank"} · {maskValue(account.account_number)}</div>
        </>
      ) : (
        <>
          <div className="mt-2 text-lg font-bold text-amber-700">Saknas</div>
          <button
            type="button"
            onClick={onCreate}
            className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
          >
            Lägg till
          </button>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-4">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className={fieldClass}
      />
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
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
      {children}
    </span>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
