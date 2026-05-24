import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "../lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getProjectId() {
  return (
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra as any)?.eas?.projectId ||
    (Constants.manifest as any)?.extra?.eas?.projectId ||
    ""
  );
}

export async function registerPushTokenForCurrentUser(appRole: "admin" | "agent" | "driver" = "admin") {
  try {
    console.log("[PUSH] Startar registrering av push-token");

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session?.user) {
      console.log("[PUSH] Ingen inloggad användare, hoppar över push-token");
      return { ok: false, error: "Inte inloggad" };
    }

    if (!Device.isDevice) {
      console.log("[PUSH] Push kräver riktig telefon, inte simulator/webb");
      return { ok: false, error: "Push kräver riktig enhet" };
    }

    const permission = await Notifications.getPermissionsAsync();

    let finalStatus = permission.status;

    if (permission.status !== "granted") {
      const request = await Notifications.requestPermissionsAsync();
      finalStatus = request.status;
    }

    if (finalStatus !== "granted") {
      console.log("[PUSH] Användaren nekade pushnotiser");
      return { ok: false, error: "Pushnotiser ej godkända" };
    }

    const projectId = getProjectId();

    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const expoPushToken = tokenResult.data;

    console.log("[PUSH] Expo token:", expoPushToken);

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Helsingbuss",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1B5955",
      });
    }

    const { data, error } = await supabase.rpc("save_app_push_token", {
      p_expo_push_token: expoPushToken,
      p_app_role: appRole,
      p_platform: Platform.OS,
      p_device_name: Device.deviceName || "",
    });

    if (error) {
      console.log("[PUSH] Supabase fel:", error.message);
      return { ok: false, error: error.message };
    }

    console.log("[PUSH] Token sparad:", data);

    return { ok: true, token: expoPushToken, data };
  } catch (error: any) {
    console.log("[PUSH] Fel:", error?.message || error);
    return { ok: false, error: error?.message || String(error) };
  }
}
