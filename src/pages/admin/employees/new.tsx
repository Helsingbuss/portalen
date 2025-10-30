import { useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "drivers"; // vi återanvänder samma bucket och policies

type Emp = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  national_id: string;
  role: string;
  department: string;
  employment_type: "timanställd" | "heltid" | "deltid" | "konsult" | "";
  hired_at: string; // YYYY-MM-DD
  note: string;
  active: boolean;
};

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

export default function NewEmployeePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<Emp>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    national_id: "",
    role: "",
    department: "",
    employment_type: "timanställd",
    hired_at: "",
    note: "",
    active: true,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    fileRef.current?.click();
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function onSave() {
    try {
      setSaving(true);
      setError(null);

      // 1) Skapa employee först (utan bild)
      const res = await fetch("/api/employees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          employment_type: form.employment_type || null,
          hired_at: form.hired_at || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      const { id } = await res.json();

      // 2) Om bild vald – ladda upp till storage och patcha avatar_url
      if (file) {
        const ext = (() => {
          const n = (file.name || "").toLowerCase();
          const m = n.match(/\.(png|jpg|jpeg|webp|gif)$/i);
          if (m) return m[1].toLowerCase();
          if (file.type.includes("png")) return "png";
          if (file.type.includes("webp")) return "webp";
          if (file.type.includes("gif")) return "gif";
          return "jpg";
        })();

        const key = `employees/${id}/avatar_${Date.now()}.${ext}`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(key, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || "image/jpeg",
          });
        if (up.error) throw up.error;

        // patcha pathen
        const pRes = await fetch(`/api/employees/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: key }),
        });
        if (!pRes.ok) {
          const j = await pRes.json().catch(() => ({}));
          throw new Error(j?.error || `HTTP ${pRes.status}`);
        }
      }

      alert("Anställd skapad ✅");
      router.push("/admin/employees");
    } catch (e: any) {
      setError(e?.message || "Kunde inte skapa anställd");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 space-y-6">
          <div className="mt-4" />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              {error}
            </div>
          )}

          <h1 className="text-xl font-semibold text-[#194C66]">Lägg till anställd</h1>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-[110px] h-[110px] rounded-full bg-[#e9eef2] overflow-hidden flex items-center justify-center text-sm text-[#194C66]/70">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Förhandsvisning" className="w-full h-full object-cover" />
                ) : (
                  "Ingen bild"
                )}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={pickFile}
                  className="px-3 py-1.5 rounded border text-sm text-[#194C66]"
                >
                  Välj profilbild
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-[#194C66]/80">
                Förnamn
                <input
                  value={form.first_name}
                  onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>
              <label className="text-sm text-[#194C66]/80">
                Efternamn
                <input
                  value={form.last_name}
                  onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>

              <label className="text-sm text-[#194C66]/80">
                Telefon
                <input
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>
              <label className="text-sm text-[#194C66]/80">
                E-post
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>

              <label className="text-sm text-[#194C66]/80">
                Personnummer
                <input
                  value={form.national_id}
                  onChange={(e) => setForm((s) => ({ ...s, national_id: e.target.value }))}
                  placeholder="ÅÅÅÅMMDD-XXXX"
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>

              <label className="text-sm text-[#194C66]/80">
                Roll
                <input
                  value={form.role}
                  onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
                  placeholder="t.ex. Chaufför, Admin"
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>

              <label className="text-sm text-[#194C66]/80">
                Avdelning
                <input
                  value={form.department}
                  onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))}
                  placeholder="t.ex. Trafik"
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>

              <label className="text-sm text-[#194C66]/80">
                Anställningsform
                <select
                  value={form.employment_type}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, employment_type: e.target.value as Emp["employment_type"] }))
                  }
                  className="mt-1 w-full border rounded px-2 py-1"
                >
                  <option value="timanställd">Timanställd</option>
                  <option value="heltid">Heltid</option>
                  <option value="deltid">Deltid</option>
                  <option value="konsult">Konsult</option>
                </select>
              </label>

              <label className="text-sm text-[#194C66]/80">
                Anställd sedan
                <input
                  type="date"
                  value={form.hired_at}
                  onChange={(e) => setForm((s) => ({ ...s, hired_at: e.target.value }))}
                  className="mt-1 w-full border rounded px-2 py-1"
                />
              </label>
            </div>

            <div className="mt-4">
              <label className="text-sm text-[#194C66]/80 block mb-1">Anteckning</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                className="w-full border rounded px-2 py-2 min-h-[120px]"
              />
            </div>

            <div className="mt-3">
              <label className="inline-flex items-center gap-2 text-sm text-[#194C66]/80">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((s) => ({ ...s, active: e.target.checked }))}
                />
                Aktiv
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onSave}
                disabled={saving}
                className={cls(
                  "px-5 py-2 rounded-[25px] text-sm font-medium",
                  saving ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-[#194C66] text-white"
                )}
              >
                {saving ? "Sparar…" : "Skapa anställd"}
              </button>
            </div>
          </div>

          <div className="pb-4" />
        </main>
      </div>
    </>
  );
}
