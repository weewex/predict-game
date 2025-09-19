import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { palette } from "../src/theme";

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.textPrimary,
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="nickname" options={{ title: "Choose Nickname" }} />
        <Stack.Screen name="main" options={{ title: "Main Menu" }} />
        <Stack.Screen name="gamemodes" options={{ title: "Play" }} />
        <Stack.Screen name="simple" options={{ title: "Simple Mode" }} />
        <Stack.Screen name="normal" options={{ title: "Normal Mode" }} />
        <Stack.Screen name="pro" options={{ title: "Pro Mode" }} />
        <Stack.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
      </Stack>
    </>
  );
}
