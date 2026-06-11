import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase env saknas.");

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}


const roleTemplates = [
  { key: "superadmin", name: "Superadmin", description: "Full åtkomst till hela portalen.", permissions: ["system", "users", "economy", "reports", "bookings", "operations", "settings"] },
  { key: "admin", name: "Admin", description: "Kan hantera drift, bokningar, kunder och rapporter.", permissions: ["bookings", "customers", "operations", "reports"] },
  { key: "ekonomi", name: "Ekonomi", description: "Kan hantera ekonomi, fakturor, moms och rapporter.", permissions: ["economy", "reports", "customers"] },
  { key: "agent", name: "Bokningsagent", description: "Kan hantera offerter, bokningar och kundkontakt.", permissions: ["bookings", "customers", "offers"] },
  { key: "driver", name: "Chaufför", description: "Kan se körorder, passagerare och bekräfta körningar.", permissions: ["driver_orders", "passengers"] },
  { key: "partner", name: "Samarbetspartner", description: "Kan hantera partnerförfrågningar och tilldelade uppdrag.", permissions: ["partner_requests", "partner_assignments"] },
  { key: "read_only", name: "Läsbehörighet", description: "Kan läsa men inte ändra.", permissions: ["read_only"] },
];

const allPermissions = [
  { key: "system", label: "System / inställningar" },
  { key: "users", label: "Användare & roller" },
  { key: "economy", label: "Ekonomi" },
  { key: "reports", label: "Rapporter & analys" },
  { key: "bookings", label: "Bokningar" },
  { key: "offers", label: "Offerter" },
  { key: "customers", label: "Kunder / CRM" },
  { key: "operations", label: "Drift" },
  { key: "driver_orders", label: "Körorder" },
  { key: "passengers", label: "Passagerare" },
  { key: "partner_requests", label: "Partnerförfrågningar" },
  { key: "partner_assignments", label: "Tilldelade partneruppdrag" },
  { key: "settings", label: "Inställningar" },
  { key: "read_only", label: "Läsbehörighet" },
];

function isUuid(value: any) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function roleName(key: any) {
  return roleTemplates.find((role) => role.key === key)?.name || key || "Ej angiven";
}

function rolePermissions(key: any) {
  return roleTemplates.find((role) => role.key === key)?.permissions || [];
}

function displayName(row: any) {
  return (
    row.full_name ||
    row.name ||
    row.display_name ||
    row.first_name ||
    row.user_metadata?.full_name ||
    row.user_metadata?.name ||
    row.email ||
    row.user_email ||
    "Okänd användare"
  );
}

function email(row: any) {
  return row.email || row.user_email || row.mail || "";
}

function baseRole(row: any) {
  return (
    row.portal_role ||
    row.app_metadata?.portal_role ||
    row.role ||
    row.user_role ||
    row.access_role ||
    row.profile_role ||
    "read_only"
  );
}

function lastSeen(row: any) {
  return row.last_sign_in_at || row.last_login_at || row.updated_at || row.created_at || "";
}

function activeStatus(row: any) {
  if (row.deleted_at) return "Inaktiv";
  if (row.portal_active === false) return "Inaktiv";
  if (row.is_active === false) return "Inaktiv";
  if (row.disabled === true) return "Inaktiv";
  return "Aktiv";
}

async function safeSelect(supabase: any, table: string) {
  const { data, error } = await supabase.from(table).select("*").limit(1000);

  if (error) {
    return { table, data: [], warning: table + ": " + (error.message || "kunde inte hämtas") };
  }

  return { table, data: data || [], warning: "" };
}

function filterVisibleWarnings(warnings: string[]) {
  const optionalTables = [
    "profiles",
    "user_profiles",
    "admin_users",
    "users",
    "employees",
    "staff_users",
    "roles",
    "permissions",
    "user_roles",
    "role_permissions"
  ];

  return warnings.filter((warning) => {
    const text = String(warning || "").toLowerCase();

    const isOptionalTableWarning = optionalTables.some((table) => {
      return text.includes(table.toLowerCase());
    });

    const isMissingTableWarning =
      text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("could not find") ||
      text.includes("relation");

    return !(isOptionalTableWarning && isMissingTableWarning);
  });
}

async function getAuthUsers(supabase: any) {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 500 });

    if (error) return { data: [], warning: "auth.users: " + error.message };

    return { data: data?.users || [], warning: "" };
  } catch (error: any) {
    return { data: [], warning: "auth.users: " + (error?.message || "kunde inte hämtas") };
  }
}

function assignmentFor(user: any, assignments: any[]) {
  const userId = String(user.id || user.user_id || "");
  const userEmail = String(email(user) || "").toLowerCase();

  return assignments.find((item) => {
    return (
      (item.user_id && String(item.user_id) === userId) ||
      (item.email && String(item.email).toLowerCase() === userEmail)
    );
  }) || null;
}


async function findUser(supabase: any, identifier: string) {
  const auth = await getAuthUsers(supabase);
  const warnings: string[] = [];

  if (auth.warning) warnings.push(auth.warning);

  const decoded = decodeURIComponent(identifier || "");
  const authUser = (auth.data || []).find((user: any) => {
    return String(user.id) === decoded || String(user.email || "").toLowerCase() === decoded.toLowerCase();
  }) || null;

  const profileTables = ["profiles", "user_profiles", "admin_users", "users", "employees", "staff_users"];
  let profile: any = null;

  for (const table of profileTables) {
    const result = await safeSelect(supabase, table);
    if (result.warning) warnings.push(result.warning);

    const found = (result.data || []).find((row: any) => {
      return (
        String(row.id || "") === decoded ||
        String(row.user_id || "") === decoded ||
        String(email(row) || "").toLowerCase() === decoded.toLowerCase()
      );
    });

    if (found) {
      profile = found;
      break;
    }
  }

  const merged = { ...(authUser || {}), ...(profile || {}) };
  const finalEmail = authUser?.email || email(profile) || (decoded.includes("@") ? decoded : "");

  return {
    user: {
      id: authUser?.id || profile?.id || profile?.user_id || decoded,
      name: displayName(merged),
      email: finalEmail,
      source: authUser ? "Supabase Auth" : profile ? "Profil-tabell" : "Manuell",
      last_seen: lastSeen(merged),
    },
    authUser,
    profile,
    warnings: filterVisibleWarnings(warnings),
  };
}

async function getAssignment(supabase: any, user: any) {
  const userId = String(user.id || "");
  const userEmail = String(user.email || "").toLowerCase();

  let query = supabase.from("app_user_roles").select("*").limit(1);

  if (isUuid(userId)) {
    query = query.eq("user_id", userId);
  } else if (userEmail) {
    query = query.eq("email", userEmail);
  } else {
    return null;
  }

  const { data, error } = await query;

  if (error) return null;

  return data?.[0] || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();
    const identifier = String(req.query.id || "");

    const found = await findUser(supabase, identifier);
    const assignment = await getAssignment(supabase, found.user);

    if (req.method === "GET") {
      const roleKey = assignment?.role_key || found.authUser?.app_metadata?.portal_role || baseRole(found.profile || {});
      const permissions = assignment?.permissions || found.authUser?.app_metadata?.portal_permissions || rolePermissions(roleKey);

      return res.status(200).json({
        ok: true,
        user: {
          ...found.user,
          role_key: roleKey,
          role: roleName(roleKey),
          permissions,
          is_active: assignment?.is_active ?? found.authUser?.app_metadata?.portal_active ?? true,
          note: assignment?.note || "",
        },
        roleTemplates,
        allPermissions,
        warnings: filterVisibleWarnings(found.warnings),
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const roleKey = String(body.role_key || "read_only");
      const allowedRole = roleTemplates.some((role) => role.key === roleKey);

      if (!allowedRole) {
        return res.status(400).json({ ok: false, error: "Ogiltig roll." });
      }

      const permissions = Array.isArray(body.permissions) ? body.permissions : rolePermissions(roleKey);
      const cleanPermissions = permissions.filter((permission: any) => {
        return allPermissions.some((item) => item.key === permission);
      });

      const userId = isUuid(found.user.id) ? found.user.id : null;
      const userEmail = found.user.email || (String(identifier).includes("@") ? decodeURIComponent(identifier) : "");

      if (!userId && !userEmail) {
        return res.status(400).json({
          ok: false,
          error: "Kan inte spara behörighet eftersom användaren saknar både UUID och e-post.",
        });
      }

      const payload: any = {
        role_key: roleKey,
        permissions: cleanPermissions,
        is_active: body.is_active !== false,
        note: String(body.note || ""),
        updated_at: new Date().toISOString(),
      };

      if (userId) payload.user_id = userId;
      if (userEmail) payload.email = userEmail;

      const onConflict = userId ? "user_id" : "email";

      const { data, error } = await supabase
        .from("app_user_roles")
        .upsert(payload, { onConflict })
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({
          ok: false,
          error: "Kunde inte spara behörighet. Kör SQL-koden för app_user_roles om tabellen saknas. " + error.message,
        });
      }

      if (userId) {
        const authUser = found.authUser;
        const currentMetadata = authUser?.app_metadata || {};

        await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
            ...currentMetadata,
            portal_role: roleKey,
            portal_permissions: cleanPermissions,
            portal_active: payload.is_active,
          },
        });
      }

      return res.status(200).json({
        ok: true,
        assignment: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Metoden stöds inte.",
    });
  } catch (error: any) {
    console.error("/api/admin/system/anvandare/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera användaren.",
    });
  }
}
