// src/pages/admin/trips/new.tsx
import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import DeparturesEditor, { DepartureRow } from "@/components/trips/DeparturesEditor";

type TripKind = "flerdagar" | "dagsresa" | "shopping";

type Form = {
  title: string;
  subtitle: string;
  trip_kind: TripKind;
  badge: string;
  ribbon: string;
  city: string;
  country: string;
  price_from: string;   // skrivs om till number/null vid submit
  hero_image: string;   // public url
  published: boolean;
};

export default function NewTripPage() {
  const router = useRouter();

  const [f, setF] = useState<Form>({
    title: "",
    subtitle: "",
    trip_kind: "dagsresa",
    badge: "",
    ribbon: "",
    city: "",
    country: "",
    price_from: "",
    hero_image: "",
    published: true,
  });

  const [departures, setDepartures] = useState<DepartureRow[]>([]);

  const [busy, setBusy] = useState<null | "upload" | "save">(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function upd<K extends keyof Form>(k: K, v: Form[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  // Säker JSON-parser (backend kan skicka text vid fel)
  function safeJson<T = any>(text: string | null): T | null {
    if (!text) return null;
    try { return JSON.parse(text) as T; } catch { return null; }
  }

  // --- ERSATT & FÄRDIG onUpload ---
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;         // spara referensen innan await
    const file = input?.files?.[0];
    if (!file) return;

    try {
      setErr(null);
      setMsg(null);
      setBusy("upload");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "cover");          // använd "gallery" om du vill bygga galleri

      const r = await fetch("/api/trips/upload-media", {
        method: "POST",
        body: fd,
        // credentials: "include",        // avkommentera om din API-route kräver cookie/JWT
      });

      const text = await r.text();
      const j = safeJson<any>(text);

      if (!r.ok || (j && j.ok === false)) {
        const msg = j?.error || j?.message || text || `Upload failed (${r.status})`;
        throw new Error(msg);
      }

      const url: string | undefined =
        j?.file?.url || j?.url || j?.publicUrl || j?.location;

      if (!url || typeof url !== "string") {
        throw new Error("Upload lyckades men ingen URL returnerades.");
      }

      // Sätt hjältebilden i ditt form-state
      upd("hero_image", url);
      setMsg("Bild uppladdad.");
    } catch (e: any) {
      setErr(e?.message || "Tekniskt fel vid uppladdning.");
    } finally {
      setBusy(null);
      if (input) input.value = "";         // rensa så man kan ladda upp samma fil igen
    }
  }

  // --- Spara resa ---
  async function onSave() {
    setErr(null);
    setMsg(null);
    setBusy("save");
    try {
      const payload = {
        title: f.title.trim(),
        subtitle: f.subtitle.trim() || null,
        trip_kind: f.trip_kind,
        badge: f.badge.trim() || null,
        ribbon: f.ribbon.trim() || null,
        city: f.city.trim() || null,
        country: f.country.trim() || null,
        price_from: f.price_from ? Number(f.price_from) : null,
        hero_image: f.hero_image || null,
        published: !!f.published,
        departures, // skicka med avgångar om din backend stöder det
      };

      if (!payload.title) throw new Error("Ange titel.");
      if (!payload.hero_image) throw new Error("Ladda upp eller ange en bild.");

      const r = await fetch("/api/trips/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // credentials: "include",        // avkommentera om din API-route kräver cookie/JWT
      });

      const text = await r.text();
      const j = safeJson<any>(text);

      if (!r.ok || (j && j.ok === false)) {
        const msg = j?.error || j?.message || text || "Kunde inte spara.";
        throw new Error(msg);
      }

      setMsg("Resan sparades.");
      setTimeout(() => router.push("/admin/trips"), 800);
    } catch (e: any) {
      setErr(e?.message || "Tekniskt fel.");
    } finally {
      setBusy(null);
    }
  }

  const preview = useMemo(
    () => (
      <div className="rounded-xl overflow-hidden border bg-white">
        <div className="relative h-48 bg-[#f3f4f6]">
          {f.hero_image ? (
            // använder vanlig <img> här i admin för att slippa next/image-varningar
            <img src={f.hero_image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              Ingen bild vald
            </div>
          )}

          {/* Ribbon */}
          {f.ribbon && (
            <div
              className="absolute left-3 top-3 text-white text-sm font-semibold px-3 py-1"
              style={{
                background: "#ef4444",
                transform: "rotate(-10deg)",
                borderRadius: 6,
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              {f.ribbon}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex gap-2 text-xs">
            {f.trip_kind && (
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{f.trip_kind}</span>
            )}
            {f.country && <span className="text-gray-500">{f.country}</span>}
          </div>

          <div className="mt-2 text-lg font-semibold text-[#0f172a]">{f.title || "Titel"}</div>
          <div className="text-sm text-[#0f172a]/70">{f.subtitle}</div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-[#0f172a]/60">
              {f.city ? "Nästa avgång" : ""}{" "}
              {f.city ? <b>{f.city}</b> : ""}
            </span>
            {f.price_from && (
              <span className="text-sm font-semibold px-3 py-2 bg-[#eef2f7] rounded-full">
                fr. {Number(f.price_from).toLocaleString("sv-SE")} kr
              </span>
            )}
          </div>
        </div>
      </div>
    ),
    [f]
  );

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="p-6 space-y-6">
          <h1 className="text-xl font-semibold text-[#194C66]">Lägg upp resa</h1>

          {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3">{err}</div>}
          {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded p-3">{msg}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-[#194C66]/70 mb-1">Titel</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={f.title}
                    onChange={(e) => upd("title", e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-sm text-[#194C66]/70 mb-1">Undertitel</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={f.subtitle}
                    onChange={(e) => upd("subtitle", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-[#194C66]/70 mb-1">Kategori</div>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={f.trip_kind}
                    onChange={(e) => upd("trip_kind", e.target.value as Form["trip_kind"])}
                  >
                    <option value="flerdagar">Flerdagar</option>
                    <option value="dagsresa">Dagsresa</option>
                    <option value="shopping">Shopping</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-[#194C66]/70 mb-1">Badge (liten tag)</div>
                    <input
                      className="border rounded px-3 py-2 w-full"
                      value={f.badge}
                      onChange={(e) => upd("badge", e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="text-sm text-[#194C66]/70 mb-1">Banderoll (röd)</div>
                    <input
                      className="border rounded px-3 py-2 w-full"
                      value={f.ribbon}
                      onChange={(e) => upd("ribbon", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-[#194C66]/70 mb-1">Stad</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={f.city}
                    onChange={(e) => upd("city", e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-sm text-[#194C66]/70 mb-1">Land</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={f.country}
                    onChange={(e) => upd("country", e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-sm text-[#194C66]/70 mb-1">Pris från (SEK)</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    inputMode="numeric"
                    value={f.price_from}
                    onChange={(e) => upd("price_from", e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <div className="text-sm text-[#194C66]/70 mb-1">Hero-bild (URL)</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="https://…"
                    value={f.hero_image}
                    onChange={(e) => upd("hero_image", e.target.value)}
                  />
                  <div className="text-xs text-[#194C66]/60 mt-1">
                    Alternativ: ladda upp fil här nedan så fylls URL i automatiskt.
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#194C66]/70 mb-1">Ladda upp bild</label>
                  <input type="file" accept="image/*" onChange={onUpload} disabled={busy === "upload"} />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.published}
                    onChange={(e) => upd("published", e.target.checked)}
                  />
                </label>
                <span>Publicerad (visa på webb)</span>

                <button
                  onClick={onSave}
                  disabled={busy !== null}
                  className="ml-auto px-5 py-2 rounded-[25px] bg-[#194C66] text-white disabled:opacity-60"
                >
                  {busy === "save" ? "Sparar…" : "Spara resa"}
                </button>
              </div>
            </div>

            {/* Förhandsvisning */}
            <div className="lg:col-span-1">
              <div className="text-sm text-[#194C66]/70 mb-2">Förhandsvisning</div>
              {preview}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
