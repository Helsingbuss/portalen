import React, { useEffect } from "react";
import { Slot, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useAuthStore } from "@/mobile/store/auth";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  useEffect(() => {
    // Vänta tills navigation är redo, annars får du "Attempted to navigate before mounting..."
    if (!navState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isLoggedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    }

    if (isLoggedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoggedIn, segments, navState?.key]);

  return <Slot />;
}