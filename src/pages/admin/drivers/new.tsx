// src/pages/admin/drivers/new.tsx
import { useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import { useRouter } from "next/router";

const CARD_TOP_SPACE = "mt-14";

function isValidPNR(v: string) {
  if (!v) return true; // frivilligt fält
  return /^[0-9]{8}-[0-9]{4}$/.test(v) || /^[0-9]{6}-[0-9]{4}$/.test(v);
}

type DocRow = {
  type: string;
  expires_at: string;
  file: File | null;
};

export default function NewDriverPage() {
  const router = useRouter();

  // Formfält
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [personalNumber, setPersonalNumber] = useState("");
  const [employmentType, setEmploymentType] = useState<"heltid" | "tim" | "vik" | "annat">("tim");
  const [hiredAt, setHiredAt] = useState<string>("");
  const [licenseClasses, setLicenseClasses] = useState(""); // komma-separerat
  const [note, setNote] = useState("");
  const [active, setActive] = useState(true);

  // Uppladdningar
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addDocRow() {
    setDocs((prev) => [...prev, { type: "körkort", expires_at: "", file: null }]);
  }
  function updateDocRow(i: number, patch: Partial<DocRow>) {
    setDocs((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeDocRow(i: number) {
    setDocs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function uploadPhoto(driverId: string) {
    if (!photoFile) return;
    const fd = new FormData();
    fd.append("driver_id", driverId);
    fd.append("photo", photoFile);

    const res = await fetch("/api/drivers/upload-photo", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || "Kunde inte ladda upp profilbild.");
    }
  }

  async function uploadDocs(driverId: string) {
    // Kör rad för rad – enklare felhantering
    for (const row of docs) {
      if (!row.file) continue;
      const fd = new FormData();
      fd.append("driver_id", driverId);
      fd.append("type", row.type || "övrigt");
      if (row.expires_at) fd.append("expires_at", row.expires_at);
      fd.append("doc", row.file);

      const res = await fetch("/api/drivers/upload-doc", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Kunde inte ladda upp dokument.");
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Lätt validering
    if (!firstName.trim() || !lastName.trim()) {
      setError("För- och efternamn måste fyllas i.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Fyll i minst e-post eller telefon.");
      return;
    }
    if (!isValidPNR(personalNumber)) {
      setError("Ogiltigt personnummer. Använd YYYYMMDD-XXXX eller YYMMDD-XXXX.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        personal_number: personalNumber.trim() || null,
        employment_type: employmentType,
        hired_at: hiredAt || null,
        license_classes: licenseClasses
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        note: note.trim() || null,
        active,
      };

      // 1) Skapa chauffören
      const res = await fetch("/api/drivers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      const driverId: string = j.id;

      // 2) Ladda upp profilbild (om vald)
      if (photoFile) {
        await uploadPhoto(driverId);
      }

      // 3) Ladda upp dokument (om angivna)
      if (docs.some((d) => d.file)) {
        await uploadDocs(driverId);
      }

      // 4) Vidare till profilsidan
      router.push(`/admin/drivers/${driverId}`);
    } catch (e: any) {
      setError(e?.message || "Kunde inte skapa chaufför.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className={`p-6 space-y-6 ${CARD_TOP_SPACE}`}>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">Lägg till chaufför</h1>
          </div>

          <form onSubmit={onSubmit} className="bg-white rounded-xl shadow p-5 space-y-6">
            {/* Form – två kolumner */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Vänster kolumn */}
              <div className="space-y-3">
                <label className="text-sm text-[#194C66]/80 block">
                  Förnamn *
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>

                <label className="text-sm text-[#194C66]/80 block">
                  Telefon
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>

                <label className="text-sm text-[#194C66]/80 block">
                  Anställningsform
                  <select
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as any)}
                  >
                    <option value="heltid">Heltid</option>
                    <option value="tim">Timanställd</option>
                    <option value="vik">Vikariat</option>
                    <option value="annat">Annat</option>
                  </select>
                </label>

                <label className="text-sm text-[#194C66]/80 block">
                  Anställd sedan
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    type="date"
                    value={hiredAt}
                    onChange={(e) => setHiredAt(e.target.value)}
                  />
                </label>

                <label className="text-sm text-[#194C66]/80 block">
                  Anteckning (valfritt)
                  <textarea
                    className="mt-1 w-full border rounded px-2 py-2 min-h-[96px]"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-[#194C66]">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  Aktiv
                </label>
              </div>

              {/* Höger kolumn */}
              <div className="space-y-3">
                <label className="text-sm text-[#194C66]/80 block">
                  Efternamn *
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>

                <label className="text-sm text-[#194C66]/80 block">
                  E-post
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <label className="text-sm text-[#194C66]/80 block">
                  Personnummer
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    placeholder="YYYYMMDD-XXXX eller YYMMDD-XXXX"
                    value={personalNumber}
                    onChange={(e) => setPersonalNumber(e.target.value)}
                  />
                </label>

                <label className="text-sm text-[#194C66]/80 block">
                  Körkortsklasser (komma-separerade)
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    placeholder="t.ex. D, DE"
                    value={licenseClasses}
                    onChange={(e) => setLicenseClasses(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* Profilbild */}
            <div className="border rounded-lg p-4">
              <div className="text-[#194C66] font-semibold mb-2">Profilbild (valfritt)</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="block"
              />
              <div className="text-xs text-[#194C66]/70 mt-2">
                Rekommenderat format: JPG/PNG, max ~5 MB.
              </div>
            </div>

            {/* Dokument */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-[#194C66] font-semibold">Dokument (valfritt)</div>
                <button
                  type="button"
                  onClick={addDocRow}
                  className="px-3 py-1 rounded-[25px] border text-sm text-[#194C66]"
                >
                  + Lägg till rad
                </button>
              </div>

              {docs.length === 0 && (
                <div className="text-sm text-[#194C66]/60 mt-2">
                  Inga dokument tillagda ännu.
                </div>
              )}

              <div className="mt-3 space-y-3">
                {docs.map((row, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <label className="text-sm text-[#194C66]/80 block">
                      Typ
                      <select
                        className="mt-1 w-full border rounded px-2 py-1"
                        value={row.type}
                        onChange={(e) => updateDocRow(i, { type: e.target.value })}
                      >
                        <option value="körkort">Körkort</option>
                        <option value="yrkeskompetens">YKB / Yrkeskompetens</option>
                        <option value="förarkort">Förarkort</option>
                        <option value="läkarintyg">Läkarintyg</option>
                        <option value="utbildning">Utbildning</option>
                        <option value="övrigt">Övrigt</option>
                      </select>
                    </label>

                    <label className="text-sm text-[#194C66]/80 block">
                      Giltig t.o.m.
                      <input
                        type="date"
                        className="mt-1 w-full border rounded px-2 py-1"
                        value={row.expires_at}
                        onChange={(e) => updateDocRow(i, { expires_at: e.target.value })}
                      />
                    </label>

                    <label className="text-sm text-[#194C66]/80 block md:col-span-2">
                      Fil
                      <input
                        type="file"
                        className="mt-1 block"
                        onChange={(e) => updateDocRow(i, { file: e.target.files?.[0] || null })}
                      />
                    </label>

                    <div className="md:col-span-4">
                      <button
                        type="button"
                        onClick={() => removeDocRow(i)}
                        className="text-[#194C66] underline text-sm"
                      >
                        Ta bort rad
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm disabled:opacity-50"
              >
                {saving ? "Sparar…" : "Spara ny chaufför"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}
