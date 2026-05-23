import * as Notifications from "expo-notifications";

import { supabase } from "../lib/supabase";

export type AgentNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink: string;
  sourceType: string;
  sourceId: string;
  isRead: boolean;
  pushedAt: string;
  createdAt: string;
};

function cleanPushText(value: string) {
  return String(value || "")
    .replace(/Ãƒ¥/g, "å")
    .replace(/Ãƒ¤/g, "ä")
    .replace(/Ãƒ¶/g, "ö")
    .replace(/Ãƒ…/g, "Å")
    .replace(/Ãƒ„/g, "Ä")
    .replace(/Ãƒ–/g, "Ö")
    .replace(/Ã¥/g, "å")
    .replace(/Ã¤/g, "ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã…/g, "Å")
    .replace(/Ã„/g, "Ä")
    .replace(/Ã–/g, "Ö")
    .replace(/ï»¿/g, "")
    .replace(/Â/g, "");
}

export async function getMyAgentNotifications(): Promise<AgentNotificationItem[]> {
  const { data, error } = await supabase.rpc("get_my_agent_notifications", {
    p_limit: 80,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta agentnotiser.");
  }

  return Array.isArray(raw.notifications)
    ? raw.notifications.map((row: any) => ({
        id: String(row.id || ""),
        type: String(row.type || "info"),
        title: cleanPushText(String(row.title || "")),
        body: cleanPushText(String(row.body || "")),
        deepLink: String(row.deep_link || ""),
        sourceType: String(row.source_type || ""),
        sourceId: String(row.source_id || ""),
        isRead: Boolean(row.is_read),
        pushedAt: String(row.pushed_at || ""),
        createdAt: String(row.created_at || ""),
      }))
    : [];
}

export async function markAgentNotificationRead(id: string) {
  const { error } = await supabase.rpc("mark_agent_notification_read", {
    p_notification_id: id,
  });

  if (error) throw new Error(error.message);
}

export async function markAgentNotificationPushed(id: string) {
  const { error } = await supabase.rpc("mark_agent_notification_pushed", {
    p_notification_id: id,
  });

  if (error) throw new Error(error.message);
}

export async function sendAgentNotificationPopup(item: AgentNotificationItem) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: cleanPushText(item.title),
      body: cleanPushText(item.body),
      data: {
        type: item.type,
        deepLink: item.deepLink,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
      },
      sound: true,
    },
    trigger: null,
  });

  await markAgentNotificationPushed(item.id);
}

export async function sendUnpushedAgentNotifications() {
  const notifications = await getMyAgentNotifications();

  const unpushed = notifications.filter((item) => !item.pushedAt && !item.isRead);

  for (const item of unpushed.slice(0, 5)) {
    await sendAgentNotificationPopup(item);
  }

  return unpushed.length;
}
