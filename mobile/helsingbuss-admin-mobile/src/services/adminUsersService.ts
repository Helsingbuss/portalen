import { supabase } from "../lib/supabase";

export type AdminUserRoleRow = {
  userId: string;
  email: string;
  roleId: string;
  role: string;
  roleKey: string;
  displayName: string;
  phone: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
};

export type AdminUserGroup = {
  userId: string;
  email: string;
  displayName: string;
  phone: string;
  roles: AdminUserRoleRow[];
};

export function getRoleLabel(role: string) {
  const value = String(role || "").toLowerCase();

  if (value === "super_admin") return "Superadmin";
  if (value === "owner") return "Ägare";
  if (value === "admin") return "Admin";
  if (value === "agent") return "Bokningsagent";
  if (value === "driver") return "Förare";
  if (value === "partner") return "Partner";

  return role || "Okänd roll";
}

export async function getAdminUsersAndRoles(): Promise<AdminUserGroup[]> {
  const { data, error } = await supabase.rpc("get_admin_users_and_roles");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta användare.");
  }

  const rows: AdminUserRoleRow[] = Array.isArray(raw.users)
    ? raw.users.map((row: any) => ({
        userId: String(row.user_id || ""),
        email: String(row.email || ""),
        roleId: String(row.role_id || ""),
        role: String(row.role || ""),
        roleKey: String(row.role_key || row.role || ""),
        displayName: String(row.display_name || ""),
        phone: String(row.phone || ""),
        notes: String(row.notes || ""),
        isActive: Boolean(row.is_active),
        createdAt: String(row.created_at || ""),
      }))
    : [];

  const map = new Map<string, AdminUserGroup>();

  for (const row of rows) {
    const key = row.userId || row.email;

    if (!map.has(key)) {
      map.set(key, {
        userId: row.userId,
        email: row.email,
        displayName: row.displayName,
        phone: row.phone,
        roles: [],
      });
    }

    if (row.roleId && row.role) {
      map.get(key)?.roles.push(row);
    }
  }

  return Array.from(map.values());
}

export async function addRoleToUserByEmail(input: {
  email: string;
  role: string;
  displayName: string;
  phone: string;
  notes: string;
}) {
  const { data, error } = await supabase.rpc("admin_add_role_to_user_by_email", {
    p_email: input.email,
    p_role: input.role,
    p_display_name: input.displayName,
    p_phone: input.phone,
    p_notes: input.notes,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte lägga till roll.");
  }

  return raw;
}

export async function setUserRoleActive(input: {
  roleId: string;
  isActive: boolean;
}) {
  const { data, error } = await supabase.rpc("admin_set_user_role_active", {
    p_role_id: input.roleId,
    p_is_active: input.isActive,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte ändra behörighet.");
  }

  return raw;
}

export async function updateAdminUserProfileFields(input: {
  userId: string;
  displayName: string;
  phone: string;
  notes: string;
}) {
  const { data, error } = await supabase.rpc("admin_update_user_profile_fields", {
    p_user_id: input.userId,
    p_display_name: input.displayName,
    p_phone: input.phone,
    p_notes: input.notes,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte uppdatera användaren.");
  }

  return raw;
}