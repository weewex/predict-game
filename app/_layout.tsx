import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0B0B10" },
          headerTintColor: "#ECEFF4",
          contentStyle: { backgroundColor: "#0B0B10" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="nickname" options={{ title: "Choose Nickname" }} />
        <Stack.Screen name="main" options={{ title: "Main Menu" }} />
        <Stack.Screen name="gamemodes" options={{ title: "Play" }} />
        <Stack.Screen name="simple" options={{ title: "Simple Mode" }} />
        <Stack.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
      </Stack>
    </>
  );
}
