import React from "react";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="account" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="offer" />
    </Stack>
  );
}