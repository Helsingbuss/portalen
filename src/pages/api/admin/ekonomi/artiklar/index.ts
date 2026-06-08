import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env saknas.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanNumber(value: any, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : fallback;
}

function cleanBoolean(value: any, fallback = false) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

function calculatePrices(body: any) {
  const vatPercent = cleanNumber(body.vat_percent, 0);
  const priceExcl = cleanNumber(body.price_excl_vat, 0);
  const priceIncl = cleanNumber(body.price_incl_vat, 0);

  if (priceExcl > 0 && priceIncl <= 0) {
    return {
      price_excl_vat: priceExcl,
      price_incl_vat: Number((priceExcl * (1 + vatPercent / 100)).toFixed(2)),
    };
  }

  if (priceIncl > 0 && priceExcl <= 0) {
    return {
      price_excl_vat: vatPercent > 0 ? Number((priceIncl / (1 + vatPercent / 100)).toFixed(2)) : priceIncl,
      price_incl_vat: priceIncl,
    };
  }

  return {
    price_excl_vat: priceExcl,
    price_incl_vat: priceIncl,
  };
}

function buildArticle(body: any) {
  const prices = calculatePrices(body);

  return {
    article_number: cleanText(body.article_number),
    article_name: cleanText(body.article_name),
    article_name_en: cleanText(body.article_name_en),
    article_group: cleanText(body.article_group),

    sales_accounting: cleanText(body.sales_accounting),
    sales_account: cleanText(body.sales_account),
    vat_percent: cleanNumber(body.vat_percent, 25),
    vat_account: cleanText(body.vat_account),

    unit: cleanText(body.unit) || "st",
    price_excl_vat: prices.price_excl_vat,
    price_incl_vat: prices.price_incl_vat,
    currency: cleanText(body.currency) || "SEK",

    purchase_price_excl_vat: cleanNumber(body.purchase_price_excl_vat, 0),
    stock_quantity: cleanNumber(body.stock_quantity, 0),
    is_stock_item: cleanBoolean(body.is_stock_item, false),

    is_active: cleanBoolean(body.is_active, true),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

async function safeSelect(supabase: any, table: string, select = "*") {
  const { data, error } = await supabase
    .from(table)
    .select(select);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return data || [];
}

function uniqueGroups(rows: any[]) {
  return [...new Set(rows.map((row) => row.article_group).filter(Boolean))].sort();
}

function buildSummary(rows: any[]) {
  const active = rows.filter((row) => row.is_active !== false);

  return {
    total: rows.length,
    active: active.length,
    inactive: rows.length - active.length,
    groups: uniqueGroups(rows).length,
    stockItems: rows.filter((row) => row.is_stock_item).length,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const payload = buildArticle(req.body || {});

      if (!payload.article_name) {
        return res.status(400).json({
          ok: false,
          error: "Artikelnamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("finance_articles")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return res.status(200).json({
            ok: false,
            needsSetup: true,
            error: "Tabellen finance_articles saknas. Kör SQL-koden först.",
          });
        }

        throw error;
      }

      return res.status(201).json({
        ok: true,
        article: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const group = String(req.query.group || "").trim();
    const includeInactive = String(req.query.includeInactive || "") === "true";

    let query: any = supabase
      .from("finance_articles")
      .select("*")
      .order("article_number", { ascending: true })
      .order("article_name", { ascending: true })
      .limit(500);

    if (!includeInactive) query = query.eq("is_active", true);
    if (group) query = query.eq("article_group", group);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        const vatRates = await safeSelect(supabase, "company_vat_rates", "*");

        return res.status(200).json({
          ok: true,
          needsSetup: true,
          articles: [],
          groups: [],
          vatRates,
          summary: buildSummary([]),
        });
      }

      throw error;
    }

    let articles = data || [];

    if (q) {
      articles = articles.filter((row: any) => {
        const haystack = [
          row.article_number,
          row.article_name,
          row.article_name_en,
          row.article_group,
          row.sales_accounting,
          row.sales_account,
          row.unit,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const allArticles = await safeSelect(supabase, "finance_articles", "*");
    const vatRates = await safeSelect(supabase, "company_vat_rates", "*");

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      articles,
      groups: uniqueGroups(allArticles),
      vatRates,
      summary: buildSummary(allArticles),
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/artiklar error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera artiklar.",
    });
  }
}
