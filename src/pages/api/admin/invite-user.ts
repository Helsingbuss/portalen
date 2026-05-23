import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type ApiResponse = {
  ok: boolean;
  error?: string;
  invited?: boolean;
  userId?: string;
  email?: string;
  role?: string;
};

const allowedRoles = ["admin", "agent", "driver", "partner", "owner", "super_admin"];

function getEnv(name: string, fallbackName?: string) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "");
}

async function findUserByEmail(admin: any, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(error.message);
    }

    const users = data?.users || [];
    const found = users.find((user: any) => {
      return String(user.email || "").toLowerCase() === normalizedEmail;
    });

    if (found) return found;

    if (users.length < 1000) break;
  }

  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Endast POST är tillåtet.",
    });
  }

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_KEY");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return res.status(500).json({
      ok: false,
      error:
        "Saknar Supabase miljövariabler. Kontrollera NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_KEY och SUPABASE_SERVICE_KEY.",
    });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "Saknar inloggningstoken.",
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const verifier = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: callerData, error: callerError } = await verifier.auth.getUser(token);

  if (callerError || !callerData?.user?.id) {
    return res.status(401).json({
      ok: false,
      error: "Kunde inte verifiera inloggad användare.",
    });
  }

  const callerId = callerData.user.id;

  const { data: adminRoles, error: adminRoleError } = await admin
    .from("app_user_roles")
    .select("role,is_active")
    .eq("user_id", callerId)
    .eq("is_active", true)
    .in("role", ["admin", "owner", "super_admin"]);

  if (adminRoleError) {
    return res.status(500).json({
      ok: false,
      error: adminRoleError.message,
    });
  }

  if (!adminRoles || adminRoles.length === 0) {
    return res.status(403).json({
      ok: false,
      error: "Ingen adminbehörighet.",
    });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  const role = String(req.body?.role || "").trim().toLowerCase();
  const displayName = String(req.body?.displayName || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const notes = String(req.body?.notes || "").trim();
  const sendInvite = Boolean(req.body?.sendInvite ?? true);

  if (!email.includes("@")) {
    return res.status(400).json({
      ok: false,
      error: "Ogiltig e-postadress.",
    });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      ok: false,
      error: "Ogiltig roll.",
    });
  }

  try {
    let user = await findUserByEmail(admin, email);
    let invited = false;

    if (!user) {
      if (!sendInvite) {
        return res.status(404).json({
          ok: false,
          error: "Användaren finns inte i Supabase Auth.",
        });
      }

      const redirectTo =
        process.env.SUPABASE_INVITE_REDIRECT_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        undefined;

      const { data: inviteData, error: inviteError } =
        await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: {
            display_name: displayName,
            phone,
            invited_role: role,
          },
        });

      if (inviteError) {
        return res.status(400).json({
          ok: false,
          error: inviteError.message,
        });
      }

      user = inviteData?.user;
      invited = true;
    }

    if (!user?.id) {
      return res.status(500).json({
        ok: false,
        error: "Kunde inte hitta eller skapa användaren.",
      });
    }

    const { error: roleError } = await admin
      .from("app_user_roles")
      .upsert(
        {
          user_id: user.id,
          role,
          role_key: role,
          is_active: true,
          display_name: displayName || null,
          phone: phone || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,role",
        }
      );

    if (roleError) {
      return res.status(500).json({
        ok: false,
        error: roleError.message,
      });
    }

    return res.status(200).json({
      ok: true,
      invited,
      userId: user.id,
      email,
      role,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte bjuda in användaren.",
    });
  }
}
