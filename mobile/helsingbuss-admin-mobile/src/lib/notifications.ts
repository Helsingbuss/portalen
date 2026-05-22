import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type PushRegisterResult = {
  ok: boolean;
  token?: string;
  message: string;
};

function getProjectId() {
  return (
    (Constants as any).easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    null
  );
}

async function getCurrentMainRole() {
  const { data, error } = await supabase.rpc("current_app_roles");

  if (error) {
    console.log("Push role error:", error);
    return null;
  }

  const roles = Array.isArray(data) ? data : [];

  if (roles.includes("admin")) return "admin";
  if (roles.includes("booking_agent")) return "booking_agent";
  if (roles.includes("driver")) return "driver";

  return null;
}

export async function registerPushTokenForCurrentUser(): Promise<PushRegisterResult> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return {
        ok: false,
        message: "Ingen inloggad användare hittades.",
      };
    }

    if (!Device.isDevice) {
      return {
        ok: false,
        message: "Pushnotiser måste testas på en fysisk telefon.",
      };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Helsingbuss Admin",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#003C3A",
      });
    }

    const currentPermission = await Notifications.getPermissionsAsync();
    let finalStatus = currentPermission.status;

    if (currentPermission.status !== "granted") {
      const requestedPermission = await Notifications.requestPermissionsAsync();
      finalStatus = requestedPermission.status;
    }

    if (finalStatus !== "granted") {
      return {
        ok: false,
        message: "Pushnotiser är inte tillåtna på telefonen.",
      };
    }

    const projectId = getProjectId();

    if (!projectId) {
      return {
        ok: false,
        message: "EAS projectId saknas.",
      };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const expoPushToken = tokenData.data;
    const role = await getCurrentMainRole();

    const payload = {
      user_id: userData.user.id,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_name: Device.deviceName || Device.modelName || "Okänd enhet",
      role,
      is_active: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("app_push_tokens")
      .upsert(payload, {
        onConflict: "user_id,expo_push_token",
      });

    if (saveError) {
      console.log("Push token save error:", saveError);

      return {
        ok: false,
        message: `Push-token skapades men kunde inte sparas i Supabase: ${saveError.message}`,
      };
    }

    return {
      ok: true,
      token: expoPushToken,
      message: "Pushnotiser är aktiverade för denna telefon.",
    };
  } catch (error) {
    console.log("Push register error:", error);

    return {
      ok: false,
      message: "Kunde inte aktivera pushnotiser just nu.",
    };
  }
}

export async function sendTestPushToThisUser() {
  const result = await registerPushTokenForCurrentUser();

  if (!result.ok || !result.token) {
    return result;
  }

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: result.token,
      sound: "default",
      title: "Helsingbuss Admin",
      body: "Testnotis fungerar. Du är redo att ta emot händelser.",
      data: {
        route: "/admin/notifications",
        type: "test",
      },
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      message: "Testnotisen kunde inte skickas.",
    };
  }

  return {
    ok: true,
    token: result.token,
    message: "Testnotis skickad till telefonen.",
  };
}
