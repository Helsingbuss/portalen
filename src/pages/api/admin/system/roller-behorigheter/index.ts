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


function mergeUsers(authUsers: any[], profileRows: any[], assignments: any[]) {
  const profilesById = new Map<string, any>();
  const profilesByEmail = new Map<string, any>();

  for (const profile of profileRows || []) {
    if (profile.id) profilesById.set(String(profile.id), profile);
    if (profile.user_id) profilesById.set(String(profile.user_id), profile);
    if (email(profile)) profilesByEmail.set(String(email(profile)).toLowerCase(), profile);
  }

  const users: any[] = [];

  for (const user of authUsers || []) {
    const profile =
      profilesById.get(String(user.id)) ||
      profilesByEmail.get(String(user.email || "").toLowerCase()) ||
      {};

    const merged = { ...user, ...profile };
    const assignment = assignmentFor(merged, assignments);

    const roleKey = assignment?.role_key || baseRole(merged);
    const permissions = assignment?.permissions || rolePermissions(roleKey);

    users.push({
      id: user.id,
      name: displayName(merged),
      email: user.email || email(profile),
      role_key: roleKey,
      role: roleName(roleKey),
      permissions,
      status: assignment?.is_active === false ? "Inaktiv" : activeStatus({ ...merged, ...assignment }),
      last_seen: lastSeen(merged),
      source: "Supabase Auth",
      href: "/admin/system/anvandare/" + encodeURIComponent(user.id),
    });
  }

  for (const profile of profileRows || []) {
    const profileEmail = String(email(profile) || "").toLowerCase();
    const exists = users.some((user) => {
      return String(user.id) === String(profile.id || profile.user_id) || String(user.email || "").toLowerCase() === profileEmail;
    });

    if (exists) continue;

    const assignment = assignmentFor(profile, assignments);
    const roleKey = assignment?.role_key || baseRole(profile);
    const permissions = assignment?.permissions || rolePermissions(roleKey);

    const id = profile.id || profile.user_id || profileEmail || displayName(profile);

    users.push({
      id,
      name: displayName(profile),
      email: email(profile),
      role_key: roleKey,
      role: roleName(roleKey),
      permissions,
      status: assignment?.is_active === false ? "Inaktiv" : activeStatus({ ...profile, ...assignment }),
      last_seen: lastSeen(profile),
      source: "Profil-tabell",
      href: "/admin/system/anvandare/" + encodeURIComponent(String(id)),
    });
  }

  return users;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();
    const warnings: string[] = [];

    const authResult = await getAuthUsers(supabase);
    if (authResult.warning) warnings.push(authResult.warning);

    const profileTables = ["profiles", "user_profiles", "admin_users", "users", "employees", "staff_users"];
    const profileResults = [];

    for (const table of profileTables) {
      const result = await safeSelect(supabase, table);
      if (result.warning) warnings.push(result.warning);
      if (result.data.length > 0) profileResults.push(result);
    }

    const assignmentsResult = await safeSelect(supabase, "app_user_roles");
    if (assignmentsResult.warning) warnings.push(assignmentsResult.warning);

    const users = mergeUsers(
      authResult.data,
      profileResults.flatMap((result) => result.data),
      assignmentsResult.data
    );

    const summary = {
      users: users.length,
      activeUsers: users.filter((user) => user.status === "Aktiv").length,
      inactiveUsers: users.filter((user) => user.status !== "Aktiv").length,
      roleTemplates: roleTemplates.length,
      assignedRoles: assignmentsResult.data.length,
    };

    return res.status(200).json({
      ok: true,
      summary,
      users,
      roleTemplates,
      allPermissions,
      warnings: filterVisibleWarnings(warnings),
    });
  } catch (error: any) {
    console.error("/api/admin/system/roller-behorigheter error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta roller och behörigheter.",
    });
  }
}
