import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

export function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL eller NEXT_PUBLIC_SUPABASE_URL saknas.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY saknas i portalens .env.local.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getBearerToken(req: NextApiRequest) {
  const header = req.headers.authorization;

  if (!header) return "";

  const value = Array.isArray(header) ? header[0] : header;

  if (!value.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return value.slice(7).trim();
}

export async function requireAdminApi(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      res.status(401).json({ ok: false, error: "Saknar inloggning." });
      return null;
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      res.status(401).json({ ok: false, error: "Ogiltig inloggning." });
      return null;
    }

    const { data: roles, error: roleError } = await supabaseAdmin
      .from("app_user_roles")
      .select("role,is_active")
      .eq("user_id", userData.user.id)
      .eq("is_active", true);

    if (roleError) {
      res.status(500).json({
        ok: false,
        error: roleError.message,
        hint: "Portalen använder service role, men app_user_roles saknar grant eller tabellåtkomst.",
      });
      return null;
    }

    const isAdmin = (roles || []).some((row: any) => row.role === "admin");

    if (!isAdmin) {
      res.status(403).json({ ok: false, error: "Saknar admin-behörighet." });
      return null;
    }

    return {
      user: userData.user,
      supabaseAdmin,
    };
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte kontrollera behörighet.",
    });

    return null;
  }
}
