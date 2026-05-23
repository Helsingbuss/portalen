import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";

import { sendUnpushedAgentNotifications } from "../../services/agentNotificationsService";

const CHECK_INTERVAL_MS = 45000;

export default function AgentNotificationAutoPoll() {
  const isCheckingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNotifications = useCallback(async () => {
    if (isCheckingRef.current) return;

    try {
      isCheckingRef.current = true;

      const permission = await Notifications.getPermissionsAsync();

      if (permission.status !== "granted") {
        return;
      }

      await sendUnpushedAgentNotifications();
    } catch (error) {
      console.log("Agent notification auto poll error:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkNotifications();

    intervalRef.current = setInterval(() => {
      checkNotifications();
    }, CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        checkNotifications();
      }
    });

    return () => {
      subscription.remove();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkNotifications]);

  return null;
}
