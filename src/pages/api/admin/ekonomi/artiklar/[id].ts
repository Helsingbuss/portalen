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

  if (error) return [];

  return data || [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Artikel-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("finance_articles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const vatRates = await safeSelect(supabase, "company_vat_rates", "*");

      return res.status(200).json({
        ok: true,
        article: data,
        vatRates,
      });
    }

    if (req.method === "PUT") {
      const payload = buildArticle(req.body || {});

      if (!payload.article_name) {
        return res.status(400).json({
          ok: false,
          error: "Artikelnamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("finance_articles")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        article: data,
      });
    }

    if (req.method === "DELETE") {
      const { data, error } = await supabase
        .from("finance_articles")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        article: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/artiklar/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera artikeln.",
    });
  }
}
