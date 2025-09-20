import React from "react";
import { router } from "expo-router";
import { GameScreen } from "../src/gameplay";

export default function ExtremeModeScreen() {
  return <GameScreen mode="EXTREME" onExit={() => router.back()} />;
}
