import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { getActivePlayer } from "../src/storage";
import type { PlayerProfile } from "../src/types";

export default function Index() {
  const [activePlayer, setActivePlayer] = useState<PlayerProfile | null | undefined>(undefined);
  useEffect(() => {
    getActivePlayer().then(setActivePlayer);
  }, []);
  if (activePlayer === undefined) return null;
  return <Redirect href={activePlayer ? "/main" : "/players"} />;
}
