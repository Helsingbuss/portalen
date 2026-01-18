import React from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/mobile/store/auth";

export default function Index() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return <Redirect href={isLoggedIn ? "/(tabs)/overview" : "/(auth)/login"} />;
}