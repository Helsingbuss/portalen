// src/pages/admin/trips/new.tsx
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import DeparturesEditor, { DepartureRow } from "@/components/trips/DeparturesEditor";

type TripKind = "flerdagar" | "dagsresa" | "shopping";

type Form = {
  title: string;
  subtitle: string;
  trip_kind: TripKind;
  badge: string;          // SPARAS som "Text|#bg|#fg" (om färger finns)
  ribbon: string;
  city: string;
  country: string;
  price_from: string;     // skrivs om till number/null vid submit
  hero_image: string;     // public url
  published: boolean;
  external_url?: string;
  year?: number;          // 2025–2027
  summary?: string;       // kort om resan
};

type LineStop = { name: string; time?: string };
type Line = { title: string; stops: LineStop[] };

// ---------------- Helpers ----------------
function fmtDate(d: Date) {
  return d.toLocaleDateString("sv-SE", { day: "2-digit", month: "short", year: "numeric" });
}
function extractDates(rows: DepartureRow[]): Date[] {
  const out: Date[] = [];
  for (const r of rows as any[]) {
    const raw = (r as any)?.date || (r as any)?.datum || (r as any)?.day || (r as any)?.when || null;
    if (!raw || typeof raw !== "string") continue;
    const iso = raw.length <= 10 ? `${raw}T00:00:00` : raw;
    const parsed = new Date(iso);
    if (!isNaN(parsed.getTime())) out.push(parsed);
  }
  const seen = new Set<string>();
  const uniq: Date[] = [];
  for (const d of out.sort((a, b) => a.getTime() - b.getTime())) {
    const key = d.toISOString().slice(0, 10);
    if (!seen.has(key)) { seen.add(key); uniq.push(d); }
  }
  return uniq;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] font-medium text-[#194C66]/80 mb-1">{children}</div>;
}
function Help({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] text-[#194C66]/60 mt-1">{children}</div>;
}
function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b">
        <h3 className="text-sm font-semibold tracking-wide text-[#194C66]">{title}</h3>
        {aside}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

// ---- Badge helpers (samma logik som i widget) ----
function badgeAutoColors(txt: string) {
  const s = String(txt || "").toLowerCase();
  if (/ny(het)?/.test(s)) return { bg: "#10b981", fg: "#ffffff" };
  if (/rabatt|kampanj|rea/.test(s)) return { bg: "#ef4444", fg: "#ffffff" };
  if (/sista|limited|slut/.test(s)) return { bg: "#f59e0b", fg: "#111827" };
  return { bg: "#3b82f6", fg: "#ffffff" };
}
function parseBadgeSpec(raw?: string | null) {
  if (!raw) return null;
  const parts = String(raw).split("|").map(s => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  const text = parts[0];
  let bg: string | undefined, fg: string | undefined;
  if (parts[1] && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(parts[1])) bg = parts[1];
  if (parts[2] && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(parts[2])) fg = parts[2];
  const auto = badgeAutoColors(text);
  return { text, bg: bg || auto.bg, fg: fg || auto.fg };
}

// --------------- Lines editor ---------------
function LinesEditor({
  lines,
  setLines,
  maxLines = 3,
}: { lines: Line[]; setLines: (v: Line[]) => void; maxLines?: number }) {

  function addLine() {
    if (lines.length >= maxLines) return;
    setLines([...lines, { title: `Linje ${String.fromCharCode(65 + lines.length)}`, stops: [] }]);
  }
  function removeLine(idx: number) { const next = [...lines]; next.splice(idx, 1); setLines(next); }
  function updLineTitle(idx: number, title: string) { const next = [...lines]; next[idx] = { ...next[idx], title }; setLines(next); }
  function addStop(idx: number) { const next = [...lines]; next[idx] = { ...next[idx], stops: [...next[idx].stops, { name: "", time: "" }] }; setLines(next); }
  function updStop(idx: number, sIdx: number, patch: Partial<LineStop>) {
    const next = [...lines]; const row = next[idx].stops[sIdx] || { name: "", time: "" };
    next[idx].stops[sIdx] = { ...row, ...patch }; setLines(next);
  }
  function removeStop(idx: number, sIdx: number) { const next = [...lines]; next[idx].stops.splice(sIdx, 1); setLines(next); }

  return (
    <div className="space-y-4">
      {lines.length === 0 && (
        <div className="text-sm text-gray-500 border rounded-xl p-3">Inga linjer tillagda ännu.</div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={addLine}
          disabled={lines.length >= maxLines}
          className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50"
        >
          + Lägg till linje
        </button>
      </div>

      {lines.map((ln, idx) => (
        <div key={idx} className="rounded-xl border p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <FieldLabel>Linjens namn</FieldLabel>
              <input
                className="border rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                value={ln.title}
                onChange={(e) => updLineTitle(idx, e.target.value)}
                placeholder={`Ex. Linje ${String.fromCharCode(65 + idx)}`}
              />
            </div>
            <button
              type="button"
              onClick={() => removeLine(idx)}
              className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50"
              aria-label="Ta bort linje"
            >
              Ta bort
            </button>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-[#194C66]/70">Hållplatser</div>
              <button type="button" onClick={() => addStop(idx)} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50">
                + Lägg till hållplats
              </button>
            </div>

            {ln.stops.length === 0 && (
              <div className="text-sm text-gray-500">Inga hållplatser ännu.</div>
            )}

            <div className="mt-2 space-y-2">
              {ln.stops.map((st, sIdx) => (
                <div key={sIdx} className="grid md:grid-cols-[1fr_160px_auto] gap-2">
                  <input
                    className="border rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    placeholder="Hållplats (ex. Helsingborg Knutpunkten)"
                    value={st.name}
                    onChange={(e) => updStop(idx, sIdx, { name: e.target.value })}
                  />
                  <input
                    className="border rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    placeholder="Tid (ex. 06:30)"
                    value={st.time || ""}
                    onChange={(e) => updStop(idx, sIdx, { time: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeStop(idx, sIdx)}
                    className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50"
                    aria-label="Ta bort hållplats"
                  >
                    Ta bort
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Page ----------------
export default function NewTripPage() {
  const router = useRouter();

  const [f, setF] = useState<Form>({
    title: "",
    subtitle: "",
    trip_kind: "dagsresa",
    badge: "",        // här sparas sammansatt badge
    ribbon: "",
    city: "",
    country: "",
    price_from: "",
    hero_image: "",
    published: true,
    external_url: "",
    year: new Date().getFullYear(),
    summary: "",
  });

  // UI-fält för badge (byggs ihop till f.badge vid spar)
  const [badgeText, setBadgeText] = useState("");
  const [badgeBg, setBadgeBg] = useState("");
  const [badgeFg, setBadgeFg] = useState("");

  const [departures, setDepartures] = useState<DepartureRow[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState<null | "upload" | "save">(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function upd<K extends keyof Form>(k: K, v: Form[K]) { setF((s) => ({ ...s, [k]: v })); }
  function safeJson<T = any>(text: string | null): T | null { if (!text) return null; try { return JSON.parse(text) as T; } catch { return null; } }

  // Prefill om ?id= finns (inkl. badge → UI-fält)
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    if (!id) return;

    (async () => {
      try {
        setBusy("save");
        const r = await fetch(`/api/public/trips/${id}`);
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error || "Kunde inte läsa resa.");

        const t = j.trip || j;

        upd("title", t.title || "");
        upd("subtitle", t.subtitle || "");
        upd("trip_kind", (t.trip_kind || "dagsresa") as any);
        upd("badge", t.badge || "");
        upd("ribbon", t.ribbon || "");
        upd("city", t.city || "");
        upd("country", t.country || "");
        upd("price_from", t.price_from != null ? String(t.price_from) : "");
        upd("hero_image", t.hero_image || "");
        upd("published", !!t.published);
        upd("external_url", t.external_url || "");
        upd("year", t.year || new Date().getFullYear());
        upd("summary", t.summary || "");

        // badge → UI
        const spec = parseBadgeSpec(t.badge);
        if (spec) {
          setBadgeText(spec.text || "");
          setBadgeBg(spec.bg || "");
          setBadgeFg(spec.fg || "");
        } else {
          setBadgeText("");
          setBadgeBg("");
          setBadgeFg("");
        }

        // Departures (stöder både depart_date och date)
        const deps: any[] = (t.departures || []).map((d: any) => ({
          date: String(d.depart_date || d.date || "").slice(0,10),
        }));
        setDepartures(deps.filter(d => d.date));

        // Lines om finns i trip
        if (Array.isArray(t.lines)) setLines(t.lines);
      } catch (e) {
        console.warn("Prefill failed", e);
      } finally {
        setBusy(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      setErr(null); setMsg(null); setBusy("upload");
      const fd = new FormData(); fd.append("file", file); fd.append("kind", "cover");
      const r = await fetch("/api/trips/upload-media", { method: "POST", body: fd });
      const j = safeJson<any>(await r.text());
      if (!r.ok || (j && j.ok === false)) throw new Error(j?.error || "Upload failed");
      const url: string | undefined = j?.file?.url || j?.url || j?.publicUrl || j?.location;
      if (!url) throw new Error("Upload lyckades men ingen URL returnerades.");
      upd("hero_image", url); setMsg("Bild uppladdad.");
    } catch (e: any) {
      setErr(e?.message || "Tekniskt fel vid uppladdning.");
    } finally { setBusy(null); if (input) input.value = ""; }
  }

  async function onSave() {
    setErr(null); setMsg(null); setBusy("save");
    try {
      // Bygg badge som "Text|#bg|#fg" om färger finns
      const badge =
        badgeText.trim()
          ? [
              badgeText.trim(),
              /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(badgeBg.trim()) ? badgeBg.trim() : "",
              /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(badgeFg.trim()) ? badgeFg.trim() : "",
            ]
              .filter(Boolean)
              .join("|")
          : (f.badge?.trim() || "");

      const payload = {
        title: f.title.trim(),
        subtitle: f.subtitle.trim() || null,
        trip_kind: f.trip_kind,
        badge: badge || null,
        ribbon: f.ribbon.trim() || null,
        city: f.city.trim() || null,
        country: f.country.trim() || null,
        price_from: f.price_from ? Number(f.price_from) : null,
        hero_image: f.hero_image || null,
        published: !!f.published,
        external_url: f.external_url?.trim() || null,
        year: f.year || null,
        summary: f.summary?.trim() || null,
        departures,
        lines,
      };

      if (!payload.title) throw new Error("Ange titel.");
      if (!payload.hero_image) throw new Error("Ladda upp eller ange en bild.");

      // OBS: denna post går till create (din befintliga rutt).
      // Om du vill skilja på create/update kan vi lägga till /api/trips/update och växla här baserat på ?id=.
      const r = await fetch("/api/trips/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = safeJson<any>(await r.text());
      if (!r.ok || (j && j.ok === false)) throw new Error(j?.error || "Kunde inte spara.");

      setMsg("Resan sparades.");
      setTimeout(() => router.push("/admin/trips"), 800);
    } catch (e: any) {
      setErr(e?.message || "Tekniskt fel.");
    } finally { setBusy(null); }
  }

  // ------- Preview-data -------
  const uniqueDates = useMemo(() => extractDates(departures), [departures]);
  const previewDatesText = useMemo(() => {
    if (uniqueDates.length === 0) return "";
    if (uniqueDates.length === 1) return `Nästa avgång: ${fmtDate(uniqueDates[0])}`;
    const shown = uniqueDates.slice(0, 3).map(fmtDate).join(", ");
    const rest = uniqueDates.length - 3;
    return rest > 0 ? `Flera datum: ${shown} + ${rest} till` : `Flera datum: ${shown}`;
  }, [uniqueDates]);

  const linesSummary = useMemo(() => {
    if (!lines.length) return "";
    if (lines.length === 1) return `Linje: ${lines[0].title || "Utan namn"}`;
    const first = lines.slice(0, 2).map((l) => l.title || "Utan namn").join(", ");
    const rest = lines.length - 2;
    return rest > 0 ? `Flera linjer: ${first} + ${rest} till` : `Linjer: ${first}`;
  }, [lines]);

  // Förhandsvisningens badge (från UI-fält – fall back till f.badge)
  const previewBadgeSpec = useMemo(() => {
    const ui =
      badgeText.trim()
        ? [badgeText.trim(), badgeBg.trim(), badgeFg.trim()].filter(Boolean).join("|")
        : f.badge;
    return parseBadgeSpec(ui);
  }, [badgeText, badgeBg, badgeFg, f.badge]);

  // ------- Preview UI -------
  const preview = useMemo(
    () => (
      <div className="rounded-2xl overflow-hidden border bg-white shadow-sm">
        {/* 600x390 aspect */}
        <div className="relative bg-[#f3f4f6] aspect-[600/390]">
          {f.hero_image ? (
            <img src={f.hero_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Ingen bild vald</div>
          )}
          {f.ribbon && (
            <div
              className="absolute left-3 top-3 text-white text-sm font-semibold px-3 py-1"
              style={{ background: "#ef4444", transform: "rotate(-10deg)", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}
            >
              {f.ribbon}
            </div>
          )}

          {previewBadgeSpec && (
            <div
              className="absolute right-3 top-3 text-xs font-extrabold px-3 py-1.5 rounded-full shadow"
              style={{ background: previewBadgeSpec.bg, color: previewBadgeSpec.fg }}
            >
              {previewBadgeSpec.text}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {f.trip_kind && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{f.trip_kind}</span>}
            {f.country && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{f.country}</span>}
            {f.year && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{f.year}</span>}
          </div>

        <div className="mt-2 text-lg font-semibold text-[#0f172a]">{f.title || "Titel"}</div>
        <div className="text-sm text-[#0f172a]/70">{f.subtitle}</div>
        {f.summary && <div className="mt-2 text-sm text-[#0f172a]/80">{f.summary}</div>}

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-[#0f172a]/80">
            {previewDatesText && <div>{previewDatesText}</div>}
            {linesSummary && <div>{linesSummary}</div>}
          </div>

          {f.price_from && (
            <div className="text-sm font-semibold px-3 py-2 bg-[#eef2f7] rounded-full whitespace-nowrap">
              fr. {Number(f.price_from).toLocaleString("sv-SE")} kr
            </div>
          )}
        </div>

        {f.external_url && (
          <div className="mt-2 text-xs text-[#0f172a]/60 truncate">Länk: {f.external_url}</div>
        )}
        </div>
      </div>
    ),
    [f, previewDatesText, linesSummary, previewBadgeSpec]
  );

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        {/* EXTRA LUFT */}
        <main className="px-6 pb-16 pt-14 lg:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT — FORM */}
            <div className="lg:col-span-2 space-y-8">

              <Card title="Grundinfo">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Titel</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={f.title} onChange={(e) => upd("title", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Undertitel</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={f.subtitle} onChange={(e) => upd("subtitle", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <FieldLabel>Kort om resan</FieldLabel>
                  <textarea
                    className="border rounded-xl px-3 py-2.5 w-full min-h-[90px] focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    placeholder="Beskriv resan kort – visas i förhandsvisningen"
                    value={f.summary || ""} onChange={(e) => upd("summary", e.target.value)}
                  />
                </div>

                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Kategori</FieldLabel>
                    <select
                      className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={f.trip_kind}
                      onChange={(e) => upd("trip_kind", e.target.value as Form["trip_kind"])}
                    >
                      <option value="flerdagar">Flerdagar</option>
                      <option value="dagsresa">Dagsresa</option>
                      <option value="shopping">Shopping</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>År</FieldLabel>
                    <select
                      className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={f.year ?? new Date().getFullYear()}
                      onChange={(e) => upd("year", Number(e.target.value) as any)}
                    >
                      {[2025, 2026, 2027].map((y) => (<option value={y} key={y}>{y}</option>))}
                    </select>
                  </div>
                </div>

                {/* Badge-inställningar */}
                <div className="mt-4 grid md:grid-cols-3 gap-4">
                  <div>
                    <FieldLabel>Badge – text</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      placeholder='t.ex. "Nyhet" eller "Kampanj"'
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                    />
                    <Help>Lämna tomt om du inte vill visa badge.</Help>
                  </div>
                  <div>
                    <FieldLabel>Badge – bakgrund</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      placeholder="#ef4444"
                      value={badgeBg}
                      onChange={(e) => setBadgeBg(e.target.value)}
                    />
                    <Help>Valfritt. HEX, t.ex. #ef4444. Auto-färg om tomt.</Help>
                  </div>
                  <div>
                    <FieldLabel>Badge – textfärg</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      placeholder="#ffffff"
                      value={badgeFg}
                      onChange={(e) => setBadgeFg(e.target.value)}
                    />
                    <Help>Valfritt. HEX. Auto om tomt.</Help>
                  </div>
                </div>

                <div className="mt-4 grid md:grid-cols-3 gap-4">
                  <div>
                    <FieldLabel>Stad</FieldLabel>
                    <input className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={f.city} onChange={(e) => upd("city", e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Land</FieldLabel>
                    <input className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      value={f.country} onChange={(e) => upd("country", e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Pris från (SEK)</FieldLabel>
                    <input className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      inputMode="numeric" value={f.price_from}
                      onChange={(e) => upd("price_from", e.target.value.replace(/[^\d]/g, ""))} />
                  </div>
                </div>
              </Card>

              <Card title="Media">
                <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
                  <div>
                    <FieldLabel>Hero-bild (URL)</FieldLabel>
                    <input
                      className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                      placeholder="https://…" value={f.hero_image} onChange={(e) => upd("hero_image", e.target.value)}
                    />
                    <Help>Alternativ: ladda upp fil här nedan så fylls URL i automatiskt. Rekommenderad storlek: <b>600×390 px</b></Help>
                  </div>
                  <div>
                    <FieldLabel>Ladda upp bild</FieldLabel>
                    <input type="file" accept="image/*" onChange={onUpload} disabled={busy === "upload"} />
                  </div>
                </div>
              </Card>

              <Card title="Länkar">
                <FieldLabel>Extern länk</FieldLabel>
                <input
                  className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                  placeholder="https://helsingbuss.se/ullared eller /ullared"
                  value={f.external_url || ""} onChange={(e) => upd("external_url", e.target.value)}
                />
              </Card>

              <Card title="Linjer & hållplatser">
                <LinesEditor lines={lines} setLines={setLines} />
              </Card>

              <Card title="Turlista / avgångar" aside={<span className="text-[12px] text-slate-500">Visas i förhandsvisningen</span>}>
                <DeparturesEditor value={departures} onChange={setDepartures} />
              </Card>

              <Card title="Publicering">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={f.published} onChange={(e) => upd("published", e.target.checked)} />
                    <span>Publicerad (visa på webb)</span>
                  </label>
                  <button
                    onClick={onSave}
                    disabled={busy !== null}
                    className="ml-auto px-5 py-2 rounded-[25px] bg-[#194C66] text-white disabled:opacity-60"
                  >
                    {busy === "save" ? "Sparar…" : "Spara resa"}
                  </button>
                </div>
              </Card>

              {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">{err}</div>}
              {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3">{msg}</div>}
            </div>

            {/* RIGHT — PREVIEW */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-16">
                <div className="text-sm text-[#194C66]/70 mb-2">Förhandsvisning</div>
                {preview}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
