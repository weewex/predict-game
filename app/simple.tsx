import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Animated, Easing, Pressable, Alert } from "react-native";
import { getNickname } from "../src/storage";
import { postScore } from "../src/api";
import type { ScorePayload } from "../src/types";

const { width: SCREEN_W } = Dimensions.get("window");

function computeScore(distancePx: number, reactionMs: number): number {
  const max = 1000;
  const distPenalty = Math.min(distancePx, SCREEN_W) * 0.5;
  const timePenalty = Math.max(0, reactionMs - 100) * 0.5;
  return Math.max(0, Math.round(max - distPenalty - timePenalty));
}

export default function SimpleModeScreen() {
  const [phase, setPhase] = useState<"move" | "countdown" | "guess" | "done">("move");
  const [count, setCount] = useState(3);
  const [targetX, setTargetX] = useState(0);
  const [guessX, setGuessX] = useState<number | null>(null);
  const startRef = useRef<number>(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== "move") return;
    anim.setValue(0);
    const move = Animated.timing(anim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    });
    move.start(({ finished }) => {
      if (finished) {
        const x = (anim as any).__getValue() * (SCREEN_W - 60) + 30;
        setTargetX(x);
        setPhase("countdown");
      }
    });
    return () => move.stop();
  }, [phase]);

  useEffect(() => {
    if (phase !== "countdown") return;
    setCount(3);
    const t = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(t);
          setPhase("guess");
          startRef.current = Date.now();
          return 0;
        }
        return c - 1;
      });
    }, 800);
    return () => clearInterval(t);
  }, [phase]);

  const xPx = useMemo(() => anim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, SCREEN_W - 30],
  }), [anim]);

  async function onGuess(evt: any) {
    if (phase !== "guess") return;
    const x = evt.nativeEvent.locationX;
    setGuessX(x);
    const reactionMs = Date.now() - startRef.current;
    const distancePx = Math.abs(x - targetX);
    const score = computeScore(distancePx, reactionMs);
    setPhase("done");
    try {
      const nickname = (await getNickname()) ?? "anon";
      const payload: ScorePayload = {
        nickname,
        mode: "SIMPLE",
        distancePx,
        reactionMs,
        screenWidth: SCREEN_W,
        targetX,
        guessX: x,
        timestamp: new Date().toISOString(),
        score,
      };
      // await postScore(payload);
      Alert.alert("Result", `Score: ${score}\nDistance: ${Math.round(distancePx)}px\nTime: ${reactionMs}ms`);
    } catch (e: any) {
      Alert.alert("Local result", `Score: ${score}\n(Submit failed: ${e.message})`);
    }
  }

  return (
    <View style={styles.safe}>
      <Pressable style={styles.field} disabled={phase !== "guess"} onPress={onGuess}>
        {phase === "move" && (
          <Animated.View style={[styles.target, { left: Animated.subtract(xPx, 15) }]} />
        )}
        {phase !== "move" && phase !== "done" && (
          <View style={styles.overlay} pointerEvents="none">
            {phase === "countdown" && <Text style={styles.count}>{count}</Text>}
            {phase === "guess" && <Text style={styles.count}>Tap to guess!</Text>}
          </View>
        )}
        {phase === "done" && (
          <View style={styles.overlay}>
            <View style={[styles.dot, { left: targetX - 6, backgroundColor: "#22C55E" }]} />
            {guessX != null && <View style={[styles.dot, { left: guessX - 6, backgroundColor: "#EF4444" }]} />}
            <Text style={[styles.count, { fontSize: 18 }]}>Green = target, Red = your tap</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B10" },
  field: { flex: 1, justifyContent: "center" },
  target: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#A5B4FC",
    top: "50%",
    marginTop: -15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,16,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  count: { color: "#ECEFF4", fontSize: 36, fontWeight: "800" },
  dot: { position: "absolute", top: "50%", width: 12, height: 12, borderRadius: 6 },
});
