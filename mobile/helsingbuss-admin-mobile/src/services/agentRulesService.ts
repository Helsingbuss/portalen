import { supabase } from "../lib/supabase";

export type AgentRuleStep = {
  id: string;
  ruleKey: string;
  title: string;
  description: string;
  category: string;
  sortOrder: number;
};

export type AgentRulesAcceptanceData = {
  rulesVersion: string;
  introTitle: string;
  introText: string;
  confirmationTitle: string;
  confirmationText: string;
  rules: AgentRuleStep[];
};

export async function getAgentRulesForAcceptance(): Promise<AgentRulesAcceptanceData> {
  const { data, error } = await supabase.rpc("get_agent_rules_for_acceptance");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta agentregler.");
  }

  return {
    rulesVersion: String(raw.rulesVersion || "agentregler-2026-05-v1"),
    introTitle: String(raw.introTitle || "Agentregler"),
    introText: String(raw.introText || ""),
    confirmationTitle: String(raw.confirmationTitle || "Bekräftelse"),
    confirmationText: String(raw.confirmationText || ""),
    rules: Array.isArray(raw.rules)
      ? raw.rules.map((row: any) => ({
          id: String(row.id || ""),
          ruleKey: String(row.rule_key || ""),
          title: String(row.title || ""),
          description: String(row.description || ""),
          category: String(row.category || ""),
          sortOrder: Number(row.sort_order || 0),
        }))
      : [],
  };
}

export async function hasAcceptedAgentRules(): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_accepted_agent_rules");

  if (error) {
    console.log("has_accepted_agent_rules error:", error.message);
    return false;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return Boolean(raw?.accepted);
}

export async function acceptAgentRules(rulesVersion: string) {
  const { data, error } = await supabase.rpc("accept_agent_rules", {
    p_rules_version: rulesVersion,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte godkänna agentregler.");
  }

  return raw;
}
