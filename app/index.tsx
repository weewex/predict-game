import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { getNickname } from "../src/storage";

export default function Index() {
  const [nick, setNick] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    getNickname().then(setNick);
  }, []);
  if (nick === undefined) return null;
  return <Redirect href={nick ? "/main" : "/nickname"} />;
}
