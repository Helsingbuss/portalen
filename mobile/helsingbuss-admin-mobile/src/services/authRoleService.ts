import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export type AppRoleResult = {
  role: string;
  agent?: any;
  email?: string;
};

export async function getCurrentAppRole(): Promise<AppRoleResult> {
  const { data: userData } = await supabase.auth.getUser();
  const email = String(userData.user?.email || "").toLowerCase();

  try {
    const { data, error } = await supabase.rpc("get_my_app_role");

    if (error) {
      console.log("get_my_app_role error:", error.message);
    } else {
      const raw = typeof data === "string" ? JSON.parse(data) : data;
      const role = String(raw?.role || "user").toLowerCase();

      console.log("APP ROLE RESULT:", raw);

      if (role && role !== "user") {
        return {
          role,
          agent: raw?.agent || {},
          email,
        };
      }
    }
  } catch (error: any) {
    console.log("getCurrentAppRole exception:", error?.message || error);
  }

  // Tillfällig säker fallback för testanvändaren
  if (email === "agent@helsingbuss.se") {
    return {
      role: "agent",
      agent: {},
      email,
    };
  }

  return {
    role: "user",
    agent: {},
    email,
  };
}

export async function redirectUserByRole() {
  const result = await getCurrentAppRole();
  const role = String(result.role || "user").toLowerCase();

  console.log("REDIRECT ROLE:", role, "EMAIL:", result.email);

  if (role === "agent") {
    router.replace("/role-select" as any);
    return "agent";
  }

  if (role === "admin" || role === "owner" || role === "super_admin") {
    router.replace("/role-select" as any);
    return role;
  }

  return "blocked";
}
