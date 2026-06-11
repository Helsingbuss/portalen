import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

const tableName = "system_documentation";

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const defaultDocs = [
  {
    title: "Kom igång med portalen",
    slug: "kom-igang-med-portalen",
    category: "Start",
    summary: "Grundläggande introduktion till hur portalen används.",
    content: "Här samlar vi en enkel introduktion för nya användare. Börja med att kontrollera menyn, din roll och vilka moduler du har åtkomst till. Portalen är uppdelad i bokningar, drift, ekonomi, rapporter och systeminställningar.",
    tags: ["start", "portal", "introduktion"],
    status: "published",
    is_pinned: true,
    sort_order: 1,
  },
  {
    title: "Bokningar och offerter",
    slug: "bokningar-och-offerter",
    category: "Bokning",
    summary: "Hur bokningar, offerter och kundärenden hanteras.",
    content: "Här beskriver vi hur en offert tas emot, hur prisförslag hanteras och hur en bokning går vidare till körning, faktura och eventuell uppföljning.",
    tags: ["bokning", "offert", "kund"],
    status: "published",
    is_pinned: true,
    sort_order: 2,
  },
  {
    title: "Ekonomiflöde",
    slug: "ekonomiflode",
    category: "Ekonomi",
    summary: "Rutiner för fakturor, leverantörer, moms och rapporter.",
    content: "Ekonomiflödet omfattar kundfakturor, leverantörsfakturor, bokföringsunderlag, momsrapport, månadsrapport, årsöversikt och låsta perioder.",
    tags: ["ekonomi", "faktura", "moms"],
    status: "published",
    is_pinned: true,
    sort_order: 3,
  },
  {
    title: "Roller och behörigheter",
    slug: "roller-och-behorigheter",
    category: "System",
    summary: "Förklaring av roller, användare och behörighet.",
    content: "Här dokumenteras vilka roller som finns, vad de får göra och hur behörighet ska användas. Exempel på roller är Superadmin, Admin, Ekonomi, Bokningsagent, Chaufför och Samarbetspartner.",
    tags: ["roller", "behörighet", "system"],
    status: "published",
    is_pinned: false,
    sort_order: 4,
  },
  {
    title: "Checklista vid felsökning",
    slug: "checklista-vid-felsokning",
    category: "Support",
    summary: "Snabb checklista när något inte fungerar.",
    content: "Kontrollera först Systemstatus & integrationer. Kör därefter npx tsc --noEmit. Kontrollera även .env.local, Supabase-tabeller och om utvecklingsservern behöver startas om.",
    tags: ["felsökning", "support", "checklista"],
    status: "published",
    is_pinned: false,
    sort_order: 5,
  },
];

function cleanString(value: any) {
  return String(value || "").trim();
}

function slugify(value: string) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanStatus(value: any) {
  const status = cleanString(value || "published").toLowerCase();
  const allowed = ["draft", "published", "archived"];

  return allowed.includes(status) ? status : "published";
}

function cleanTags(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDoc(row: any) {
  return {
    id: row.id || "",
    title: row.title || "",
    slug: row.slug || "",
    category: row.category || "Övrigt",
    summary: row.summary || "",
    content: row.content || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status || "published",
    is_pinned: row.is_pinned === true,
    sort_order: Number(row.sort_order || 0),
    source: row.source || "sparad",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}

function cleanPayload(input: any) {
  const title = cleanString(input.title);
  const slug = cleanString(input.slug) || slugify(title);

  return {
    title,
    slug,
    category: cleanString(input.category) || "Övrigt",
    summary: cleanString(input.summary),
    content: cleanString(input.content),
    tags: cleanTags(input.tags),
    status: cleanStatus(input.status),
    is_pinned: input.is_pinned === true,
    sort_order: Number(input.sort_order || 0),
    updated_at: new Date().toISOString(),
  };
}

function mergeDocs(dbRows: any[]) {
  const savedBySlug = new Map((dbRows || []).map((row) => [String(row.slug), normalizeDoc(row)]));

  const defaults = defaultDocs.map((doc) => {
    const saved = savedBySlug.get(doc.slug);

    if (saved) {
      return {
        ...saved,
        source: "sparad",
      };
    }

    return normalizeDoc({
      ...doc,
      source: "standard",
      created_at: "",
      updated_at: "",
    });
  });

  const extraSaved = (dbRows || [])
    .map(normalizeDoc)
    .filter((row) => !defaultDocs.some((doc) => doc.slug === row.slug))
    .map((row) => ({
      ...row,
      source: "sparad",
    }));

  return [...defaults, ...extraSaved].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return String(a.title).localeCompare(String(b.title), "sv");
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error: "Supabase env saknas.",
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      const warnings: string[] = [];

      if (error) {
        warnings.push("Tabellen system_documentation finns kanske inte ännu. Kör SQL-koden för att kunna spara dokumentation.");
      }

      const docs = mergeDocs(error ? [] : data || []);

      return res.status(200).json({
        ok: true,
        docs,
        warnings,
        summary: {
          total: docs.length,
          pinned: docs.filter((doc) => doc.is_pinned).length,
          published: docs.filter((doc) => doc.status === "published").length,
          drafts: docs.filter((doc) => doc.status === "draft").length,
          saved: docs.filter((doc) => doc.source === "sparad").length,
        },
      });
    }

    if (req.method === "POST") {
      const payload = cleanPayload(req.body || {});

      if (!payload.title) {
        return res.status(400).json({
          ok: false,
          error: "Rubrik saknas.",
        });
      }

      if (!payload.slug) {
        return res.status(400).json({
          ok: false,
          error: "Slug saknas.",
        });
      }

      const { data, error } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: "slug" })
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({
          ok: false,
          error: "Kunde inte spara dokumentation. Kör SQL-koden för system_documentation om tabellen saknas. " + error.message,
        });
      }

      return res.status(200).json({
        ok: true,
        doc: normalizeDoc(data),
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Metoden stöds inte.",
    });
  } catch (error: any) {
    console.error("/api/admin/system/dokumentation error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera dokumentation.",
    });
  }
}
