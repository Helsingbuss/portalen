import { supabase } from "../lib/supabase";

export type AppProfileRole = {
  role?: string | null;
  role_key?: string | null;
  is_active?: boolean | null;
};

export type MyAppProfile = {
  userId: string;
  email: string;
  displayName: string;
  phone: string;
  title: string;
  department: string;
  notes: string;
  avatarUrl: string;
  roles: AppProfileRole[];
};

export type AgentRule = {
  id: string;
  ruleKey: string;
  title: string;
  description: string;
  category: string;
  sortOrder: number;
};

function roleLabel(role?: string | null) {
  const value = String(role || "").toLowerCase();

  if (value === "agent") return "Bokningsagent";
  if (value === "admin") return "Admin";
  if (value === "owner") return "Ägare";
  if (value === "super_admin") return "Superadmin";
  if (value === "driver") return "Chaufför";
  if (value === "partner") return "Partner";

  return role || "Användare";
}

export function getMainRoleLabel(roles: AppProfileRole[]) {
  const active = roles.find((role) => role.is_active !== false) || roles[0];
  return roleLabel(active?.role_key || active?.role);
}

export async function getMyAppProfile(): Promise<MyAppProfile> {
  const { data, error } = await supabase.rpc("get_my_app_profile");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta profil.");
  }

  const profile = raw.profile || {};
  const email = String(raw.email || "");

  return {
    userId: String(raw.userId || ""),
    email,
    displayName: String(profile.display_name || email.split("@")[0] || ""),
    phone: String(profile.phone || ""),
    title: String(profile.title || ""),
    department: String(profile.department || ""),
    notes: String(profile.notes || ""),
    avatarUrl: String(profile.avatar_url || ""),
    roles: Array.isArray(raw.roles) ? raw.roles : [],
  };
}

export async function updateMyAppProfile(input: {
  displayName: string;
  phone: string;
  title: string;
  department: string;
  notes: string;
  avatarUrl?: string;
}) {
  const { data, error } = await supabase.rpc("upsert_my_app_profile", {
    p_payload: input,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte spara profil.");
  }

  return raw;
}

export async function getAgentRules(): Promise<AgentRule[]> {
  const { data, error } = await supabase.rpc("get_agent_rules");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta agentregler.");
  }

  return Array.isArray(raw.rules)
    ? raw.rules.map((row: any) => ({
        id: String(row.id || ""),
        ruleKey: String(row.rule_key || ""),
        title: String(row.title || ""),
        description: String(row.description || ""),
        category: String(row.category || "Allmänt"),
        sortOrder: Number(row.sort_order || 0),
      }))
    : [];
}
