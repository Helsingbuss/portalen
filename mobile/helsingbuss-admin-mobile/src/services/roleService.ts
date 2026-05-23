import { supabase } from "../lib/supabase";

export type UserRoleKey = "admin" | "agent" | "driver" | "partner" | "owner" | "super_admin";

export type MyActiveRole = {
  role: UserRoleKey;
  roleKey: UserRoleKey;
  displayName: string;
  isActive: boolean;
};

export async function getMyActiveRoles(): Promise<MyActiveRole[]> {
  const { data, error } = await supabase.rpc("get_my_active_roles");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta roller.");
  }

  return Array.isArray(raw.roles)
    ? raw.roles.map((row: any) => ({
        role: String(row.role || "") as UserRoleKey,
        roleKey: String(row.roleKey || row.role || "") as UserRoleKey,
        displayName: String(row.displayName || ""),
        isActive: Boolean(row.isActive),
      }))
    : [];
}

export function getRoleLabel(role: string) {
  const value = String(role || "").toLowerCase();

  if (value === "super_admin") return "Superadmin";
  if (value === "owner") return "Ägare";
  if (value === "admin") return "Admin";
  if (value === "agent") return "Bokningsagent";
  if (value === "driver") return "Förare";
  if (value === "partner") return "Partner";

  return "Användare";
}

export function getRoleDescription(role: string) {
  const value = String(role || "").toLowerCase();

  if (value === "super_admin") return "Full systemåtkomst och alla behörigheter.";
  if (value === "owner") return "Ägarvy med full kontroll.";
  if (value === "admin") return "Portal, drift, användare, offerter och bokningar.";
  if (value === "agent") return "Offerter, kundkontakt, biljetter och bokningar.";
  if (value === "driver") return "Körorder, passagerare, scanning och förarvy.";
  if (value === "partner") return "Uppdrag, offertförfrågningar och partnerinformation.";

  return "Tillgång enligt behörighet.";
}

export function getRoleStartPath(role: string) {
  const value = String(role || "").toLowerCase();

  if (value === "super_admin") return "/admin/dashboard";
  if (value === "owner") return "/admin/dashboard";
  if (value === "admin") return "/admin/dashboard";
  if (value === "agent") return "/agent/dashboard";
  if (value === "driver") return "/driver/dashboard";
  if (value === "partner") return "/partner/dashboard";

  return "/";
}
