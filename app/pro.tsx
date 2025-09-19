import React from "react";
import { router } from "expo-router";
import { GameScreen } from "../src/gameplay";

export default function ProModeScreen() {
  return <GameScreen mode="PRO" onExit={() => router.back()} />;
}
