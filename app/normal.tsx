import React from "react";
import { router } from "expo-router";
import { GameScreen } from "../src/gameplay";

export default function NormalModeScreen() {
  return <GameScreen mode="NORMAL" onExit={() => router.back()} />;
}
