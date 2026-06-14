import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Signup = {
  id: number;
  email: string;
  source: string;
  consent: boolean;
  status: string;
  created_at: string;
};

export default function ShuttleInterestPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState("info@helsingbuss.se");
  const [sendStatus, setSendStatus] = useState("");

  const [subject, setSubject] = useState(
    "Nu är biljetterna släppta – boka din resa med Helsingbuss Airport Shuttle"
  );

  const [previewText, setPreviewText] = useState(
    "Bokningen är nu öppen för premiärturerna."
  );

  const [emailTitle, setEmailTitle] = useState("Nu öppnar bokningen");

  const [emailBody, setEmailBody] = useState(
    "Hej!\n\nTack för att du har visat intresse för Helsingbuss Airport Shuttle.\n\nNu är bokningen öppen och du kan redan idag säkra din plats till våra premiärturer.\n\nVi har skapat en smidig bokningsupplevelse där du enkelt kan se avgångar, välja resa och boka direkt online.\n\nHar du frågor är du alltid välkommen att kontakta oss.\n\nMed vänliga hälsningar,\nHelsingbuss Airport Shuttle"
  );

  const [buttonText, setButtonText] = useState("Boka nu");
  const [buttonLink, setButtonLink] = useState("https://hbshuttle.se/start");

  const selectedCount = selectedEmails.length;

  useEffect(() => {
    async function loadSignups() {
      try {
        const response = await fetch(`/api/admin/shuttle/interest?t=${Date.now()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          setSignups([]);
          return;
        }

        const data = await response.json();
        setSignups(Array.isArray(data.signups) ? data.signups : []);
      } catch (error) {
        console.error("Could not load interest signups:", error);
        setSignups([]);
      } finally {
        setLoading(false);
      }
    }

    loadSignups();
  }, []);

  function toggleEmail(email: string) {
    setSelectedEmails((current) =>
      current.includes(email)
        ? current.filter((item) => item !== email)
        : [...current, email]
    );
  }

  function toggleAll() {
    if (selectedEmails.length === signups.length) {
      setSelectedEmails([]);
      return;
    }

    setSelectedEmails(signups.map((item) => item.email));
  }

  async function sendMail(mode: "test" | "selected") {
    setSendStatus("Skickar...");

    try {
      const response = await fetch("/api/admin/shuttle/interest-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          testEmail,
          recipients: selectedEmails,
          subject,
          previewText,
          emailTitle,
          emailBody,
          buttonText,
          buttonLink,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setSendStatus(data?.error || "Kunde inte skicka mail.");
        return;
      }

      setSendStatus(`Klart! ${data.sent} mail skickades.`);
    } catch (error) {
      console.error("Could not send email:", error);
      setSendStatus("Kunde inte skicka mail.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Header />

      <div className="flex">
        <AdminMenu />

        <main className="ml-[250px] min-w-0 flex-1 px-8 pb-12 pt-28 xl:px-10 2xl:px-12">
          <div className="mx-auto w-full max-w-[1420px] space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#007764]">
                    Helsingbuss Airport Shuttle
                  </p>

                  <h1 className="mt-3 text-3xl font-bold text-slate-900">
                    Intresseanmälningar
                  </h1>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    Här samlas personer som vill bli meddelade när bokningen öppnar.
                    Kryssa i vilka som ska få mail, skriv utskicket manuellt och
                    skicka först ett testmail innan du skickar till markerade.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#007764]/10 px-5 py-4 text-sm font-bold text-[#007764]">
                  Totalt: {signups.length} anmälningar
                </div>
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
              <div className="space-y-8">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-200 px-7 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        E-postlista
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Alla som fyllt i “Meddela mig” på hbshuttle.se visas här.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={toggleAll}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                    >
                      {selectedEmails.length === signups.length && signups.length > 0
                        ? "Avmarkera alla"
                        : "Markera alla"}
                    </button>
                  </div>

                  {loading ? (
                    <div className="p-7 text-sm text-slate-600">Laddar...</div>
                  ) : signups.length === 0 ? (
                    <div className="p-7 text-sm text-slate-600">
                      Inga intresseanmälningar ännu.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="w-[70px] px-7 py-4">
                              <input
                                type="checkbox"
                                checked={signups.length > 0 && selectedEmails.length === signups.length}
                                onChange={toggleAll}
                              />
                            </th>
                            <th className="px-7 py-4">E-post</th>
                            <th className="px-7 py-4">Källa</th>
                            <th className="px-7 py-4">Status</th>
                            <th className="px-7 py-4">Datum</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {signups.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-7 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedEmails.includes(item.email)}
                                  onChange={() => toggleEmail(item.email)}
                                />
                              </td>

                              <td className="px-7 py-4 font-medium text-slate-900">
                                {item.email}
                              </td>

                              <td className="px-7 py-4 text-slate-600">
                                {item.source || "hbshuttle.se"}
                              </td>

                              <td className="px-7 py-4">
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                  {item.status || "new"}
                                </span>
                              </td>

                              <td className="px-7 py-4 text-slate-600">
                                {item.created_at
                                  ? new Date(item.created_at).toLocaleString("sv-SE")
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-[#007764]">
                      Utskick
                    </p>

                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      Skapa mail när biljetterna släpps
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Skriv din egen text, skicka först testmail till dig själv
                      och skicka sedan till markerade mottagare.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-5">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Ämnesrad
                      </span>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm outline-none focus:border-[#007764]"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Förhandsrad
                      </span>
                      <input
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm outline-none focus:border-[#007764]"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Rubrik i mailet
                      </span>
                      <input
                        value={emailTitle}
                        onChange={(e) => setEmailTitle(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm outline-none focus:border-[#007764]"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Meddelande
                      </span>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={12}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm leading-6 outline-none focus:border-[#007764]"
                      />
                    </label>

                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Knapptext
                        </span>
                        <input
                          value={buttonText}
                          onChange={(e) => setButtonText(e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm outline-none focus:border-[#007764]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Knapplänk
                        </span>
                        <input
                          value={buttonLink}
                          onChange={(e) => setButtonLink(e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm outline-none focus:border-[#007764]"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Testmail skickas till
                      </span>
                      <input
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm outline-none focus:border-[#007764]"
                      />
                    </label>

                    <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700">
                      Markerade mottagare: {selectedCount}
                    </div>

                    {sendStatus ? (
                      <div className="rounded-2xl bg-[#007764]/10 px-5 py-4 text-sm font-bold text-[#007764]">
                        {sendStatus}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
                      >
                        Spara utkast
                      </button>

                      <button
                        type="button"
                        onClick={() => sendMail("test")}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700"
                      >
                        Skicka testmail
                      </button>

                      <button
                        type="button"
                        onClick={() => sendMail("selected")}
                        disabled={selectedCount === 0}
                        className="rounded-xl bg-[#007764] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Skicka till markerade
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="space-y-8">
                <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">
                    Förhandsvisning
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Så här kan mailet se ut för mottagaren.
                  </p>

                  <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="bg-[#06292f] px-6 py-5 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">
                        Helsingbuss Airport Shuttle
                      </p>

                      <h3 className="mt-3 text-2xl font-bold">
                        {emailTitle}
                      </h3>

                      <p className="mt-2 text-sm text-slate-200">
                        {previewText}
                      </p>
                    </div>

                    <div className="space-y-5 px-6 py-6">
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                        {emailBody}
                      </p>

                      <a
                        href={buttonLink}
                        className="inline-flex rounded-xl bg-[#007764] px-5 py-3 text-sm font-bold text-white"
                      >
                        {buttonText}
                      </a>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-amber-100 bg-amber-50 p-7">
                  <h2 className="text-lg font-bold text-slate-900">
                    Tips innan utskick
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Skicka alltid testmail först. Kontrollera ämne, länk och text.
                    När allt ser rätt ut markerar du mottagare i listan och trycker
                    på “Skicka till markerade”.
                  </p>
                </section>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
