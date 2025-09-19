import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { calculateScore } from "./score";
import { getNickname, saveScoreEntry } from "./storage";
import type { GameMode, ScorePayload } from "./types";
import { palette } from "./theme";
import { MenuButton } from "./ui";

const TARGET_SIZE = 72;
const TARGET_RADIUS = TARGET_SIZE / 2;
const EDGE_PADDING = TARGET_RADIUS + 28;
const MARKER_SIZE = 14;
const OBSERVE_DURATION = 2000;
const COUNTDOWN_STEPS = 3;
const COUNTDOWN_INTERVAL = 800;
const HORIZONTAL_SPEED = 190; // pixels per second
const DIAGONAL_SPEED = 240;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Phase = "observe" | "countdown" | "guess" | "result";

interface ResultState {
  reactionMs: number;
  distancePx: number;
  score: number;
  target: { x: number; y: number };
  guess: { x: number; y: number };
  saveState: { status: "pending" | "saved" | "error"; message?: string };
}

const modeDetails: Record<GameMode, { label: string; description: string }> = {
  SIMPLE: {
    label: "Simple",
    description: "Static archery target. Memorize its coordinates before the blackout.",
  },
  NORMAL: {
    label: "Normal",
    description: "The target glides horizontally. Predict its slide when the lights go out.",
  },
  PRO: {
    label: "Pro",
    description: "Free-flight motion in two dimensions. Track both axes to land the shot.",
  },
};

const phaseCopy: Record<Exclude<Phase, "result">, { title: string; subtitle: string }> = {
  observe: {
    title: "Track the target",
    subtitle: "Study its motion before the screen fades",
  },
  countdown: {
    title: "Blackout",
    subtitle: "The target keeps moving. Count it out in your head",
  },
  guess: {
    title: "Take the shot",
    subtitle: "Tap where you believe the target is right now",
  },
};

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function clamp(value: number, min: number, max: number) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.min(Math.max(value, lower), upper);
}

interface MotionController {
  x: Animated.Value;
  y: Animated.Value;
  start: () => void;
  stop: () => { x: number; y: number };
}

function useTargetMotion(mode: GameMode, width: number, height: number): MotionController {
  const x = useRef(new Animated.Value(width / 2)).current;
  const y = useRef(new Animated.Value(height / 2)).current;
  const running = useRef(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const positionRef = useRef({ x: width / 2, y: height / 2 });
  const velocityRef = useRef({ vx: 0, vy: 0 });

  useEffect(() => {
    const xListener = x.addListener(({ value }) => {
      positionRef.current.x = value;
    });
    const yListener = y.addListener(({ value }) => {
      positionRef.current.y = value;
    });
    return () => {
      x.removeListener(xListener);
      y.removeListener(yListener);
    };
  }, [x, y]);

  const bounds = useMemo(
    () => {
      const safeWidth = Math.max(0, width);
      const safeHeight = Math.max(0, height);
      const centerX = safeWidth / 2;
      const centerY = safeHeight / 2;
      const canMoveX = safeWidth > EDGE_PADDING * 2;
      const canMoveY = safeHeight > EDGE_PADDING * 2;
      return {
        minX: canMoveX ? EDGE_PADDING : centerX,
        maxX: canMoveX ? safeWidth - EDGE_PADDING : centerX,
        minY: canMoveY ? EDGE_PADDING : centerY,
        maxY: canMoveY ? safeHeight - EDGE_PADDING : centerY,
        centerX,
        centerY,
        canMoveX,
        canMoveY,
      };
    },
    [width, height]
  );

  const stop = useCallback(() => {
    running.current = false;
    animationRef.current?.stop();
    animationRef.current = null;
    x.stopAnimation((value) => {
      positionRef.current.x = value;
    });
    y.stopAnimation((value) => {
      positionRef.current.y = value;
    });
    velocityRef.current = { vx: 0, vy: 0 };

    const safeX = clamp(
      Number.isFinite(positionRef.current.x) ? positionRef.current.x : bounds.centerX,
      bounds.minX,
      bounds.maxX
    );
    const safeY = clamp(
      Number.isFinite(positionRef.current.y) ? positionRef.current.y : bounds.centerY,
      bounds.minY,
      bounds.maxY
    );

    positionRef.current = { x: safeX, y: safeY };

    return { ...positionRef.current };
  }, [x, y, bounds]);

  useEffect(() => {
    const safeX = clamp(
      Number.isFinite(positionRef.current.x) ? positionRef.current.x : bounds.centerX,
      bounds.minX,
      bounds.maxX
    );
    const safeY = clamp(
      Number.isFinite(positionRef.current.y) ? positionRef.current.y : bounds.centerY,
      bounds.minY,
      bounds.maxY
    );

    positionRef.current = { x: safeX, y: safeY };
    x.setValue(safeX);
    y.setValue(safeY);
  }, [bounds, x, y]);

  const start = useCallback(() => {
    stop();
    const startX = randomBetween(bounds.minX, bounds.maxX);
    const startY = mode === "NORMAL" ? bounds.centerY : randomBetween(bounds.minY, bounds.maxY);
    x.setValue(startX);
    y.setValue(startY);
    positionRef.current = { x: startX, y: startY };

    if (mode === "SIMPLE") {
      return;
    }

    if (mode === "NORMAL" && !bounds.canMoveX) {
      return;
    }

    if (mode === "PRO" && !bounds.canMoveX && !bounds.canMoveY) {
      return;
    }

    running.current = true;

    if (mode === "NORMAL") {
      const midpoint = (bounds.minX + bounds.maxX) / 2;
      const travel = (nextX: number) => {
        if (!running.current) return;
        const distance = Math.abs(nextX - positionRef.current.x);
        const duration = Math.max(220, (distance / HORIZONTAL_SPEED) * 1000);
        const anim = Animated.timing(x, {
          toValue: nextX,
          duration,
          easing: Easing.linear,
          useNativeDriver: false,
        });
        animationRef.current = anim;
        anim.start(({ finished }) => {
          if (finished && running.current) {
            travel(nextX === bounds.maxX ? bounds.minX : bounds.maxX);
          }
        });
      };
      const firstTarget = positionRef.current.x > midpoint ? bounds.minX : bounds.maxX;
      travel(firstTarget);
      return;
    }

    if (mode === "PRO") {
      const baseSpeed = DIAGONAL_SPEED;
      let vx = 0;
      let vy = 0;

      if (bounds.canMoveX && bounds.canMoveY) {
        const minimumComponent = 0.28;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const angle = randomBetween(0, Math.PI * 2);
          const dirX = Math.cos(angle);
          const dirY = Math.sin(angle);
          if (Math.abs(dirX) < 1e-3 && Math.abs(dirY) < 1e-3) {
            continue;
          }
          const adjustedX =
            Math.abs(dirX) < minimumComponent
              ? minimumComponent * Math.sign(dirX || (Math.random() < 0.5 ? 1 : -1))
              : dirX;
          const adjustedY =
            Math.abs(dirY) < minimumComponent
              ? minimumComponent * Math.sign(dirY || (Math.random() < 0.5 ? 1 : -1))
              : dirY;
          const magnitude = Math.hypot(adjustedX, adjustedY);
          if (magnitude > 0) {
            vx = (adjustedX / magnitude) * baseSpeed;
            vy = (adjustedY / magnitude) * baseSpeed;
            break;
          }
        }
      } else if (bounds.canMoveX) {
        vx = (Math.random() < 0.5 ? -1 : 1) * baseSpeed;
      } else if (bounds.canMoveY) {
        vy = (Math.random() < 0.5 ? -1 : 1) * baseSpeed;
      }

      if (bounds.canMoveX && bounds.canMoveY && Math.abs(vx) < 1e-3 && Math.abs(vy) < 1e-3) {
        const fallbackMag = baseSpeed / Math.SQRT2;
        vx = fallbackMag * (Math.random() < 0.5 ? -1 : 1);
        vy = fallbackMag * (Math.random() < 0.5 ? -1 : 1);
      }

      if (bounds.canMoveX) {
        if (startX <= bounds.minX && vx < 0) {
          vx = Math.abs(vx);
        } else if (startX >= bounds.maxX && vx > 0) {
          vx = -Math.abs(vx);
        }
      }
      if (bounds.canMoveY) {
        if (startY <= bounds.minY && vy < 0) {
          vy = Math.abs(vy);
        } else if (startY >= bounds.maxY && vy > 0) {
          vy = -Math.abs(vy);
        }
      }

      velocityRef.current = { vx, vy };

      const travelWithBounces = () => {
        if (!running.current) return;

        let { vx: currentVx, vy: currentVy } = velocityRef.current;
        if (!Number.isFinite(currentVx)) currentVx = 0;
        if (!Number.isFinite(currentVy)) currentVy = 0;

        if (Math.abs(currentVx) < 1e-3 && Math.abs(currentVy) < 1e-3) {
          return;
        }

        const { x: originX, y: originY } = positionRef.current;

        const computeTime = (
          position: number,
          velocity: number,
          min: number,
          max: number
        ) => {
          if (velocity > 0) {
            return (max - position) / velocity;
          }
          if (velocity < 0) {
            return (min - position) / velocity;
          }
          return Infinity;
        };

        const timeToX = computeTime(originX, currentVx, bounds.minX, bounds.maxX);
        const timeToY = computeTime(originY, currentVy, bounds.minY, bounds.maxY);
        const candidates = [timeToX, timeToY].filter((t) => Number.isFinite(t) && t > 0);
        const nextTime = candidates.length > 0 ? Math.min(...candidates) : Infinity;

        if (!Number.isFinite(nextTime) || nextTime <= 0) {
          let corrected = false;
          if (bounds.canMoveX && Math.abs(currentVx) >= 1e-3) {
            if (originX <= bounds.minX + 1e-3 && currentVx < 0) {
              currentVx = Math.abs(currentVx);
              corrected = true;
            } else if (originX >= bounds.maxX - 1e-3 && currentVx > 0) {
              currentVx = -Math.abs(currentVx);
              corrected = true;
            }
          }
          if (bounds.canMoveY && Math.abs(currentVy) >= 1e-3) {
            if (originY <= bounds.minY + 1e-3 && currentVy < 0) {
              currentVy = Math.abs(currentVy);
              corrected = true;
            } else if (originY >= bounds.maxY - 1e-3 && currentVy > 0) {
              currentVy = -Math.abs(currentVy);
              corrected = true;
            }
          }
          if (corrected) {
            velocityRef.current = { vx: currentVx, vy: currentVy };
            travelWithBounces();
          }
          return;
        }

        const destX = clamp(originX + currentVx * nextTime, bounds.minX, bounds.maxX);
        const destY = clamp(originY + currentVy * nextTime, bounds.minY, bounds.maxY);
        const duration = Math.max(160, nextTime * 1000);
        const anim = Animated.parallel([
          Animated.timing(x, {
            toValue: destX,
            duration,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(y, {
            toValue: destY,
            duration,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ]);
        animationRef.current = anim;
        anim.start(({ finished }) => {
          if (!finished || !running.current) {
            return;
          }

          const epsilon = 1e-3;
          const hitX = Number.isFinite(timeToX) && Math.abs(nextTime - timeToX) < epsilon;
          const hitY = Number.isFinite(timeToY) && Math.abs(nextTime - timeToY) < epsilon;

          positionRef.current = { x: destX, y: destY };
          x.setValue(destX);
          y.setValue(destY);

          let nextVx = currentVx;
          let nextVy = currentVy;

          if (hitX && bounds.canMoveX) {
            nextVx = -nextVx;
          }
          if (hitY && bounds.canMoveY) {
            nextVy = -nextVy;
          }

          velocityRef.current = { vx: nextVx, vy: nextVy };
          travelWithBounces();
        });
      };

      travelWithBounces();
      return;
    }
  }, [stop, bounds, mode, x, y]);

  useEffect(() => stop, [stop]);

  return { x, y, start, stop };
}

function ArcheryTarget() {
  const rings = useMemo(
    () => [
      { scale: 1, color: "#F4F5F7" },
      { scale: 0.78, color: "#1F2521" },
      { scale: 0.58, color: "#1E6FAE" },
      { scale: 0.38, color: "#B91C1C" },
      { scale: 0.2, color: "#FACC15" },
    ],
    []
  );

  return (
    <View style={styles.targetFace} pointerEvents="none">
      {rings.map((ring, index) => (
        <View
          key={ring.scale}
          style={{
            width: TARGET_SIZE * ring.scale,
            height: TARGET_SIZE * ring.scale,
            borderRadius: (TARGET_SIZE * ring.scale) / 2,
            backgroundColor: ring.color,
            position: "absolute",
            borderWidth: index === 0 ? 0 : 2,
            borderColor: "rgba(12,12,12,0.18)",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 2,
          }}
        />
      ))}
    </View>
  );
}

export interface GameScreenProps {
  mode: GameMode;
  onExit?: () => void;
}

export function GameScreen({ mode, onExit }: GameScreenProps) {
  const [phase, setPhase] = useState<Phase>("observe");
  const [countdown, setCountdown] = useState(COUNTDOWN_STEPS);
  const [result, setResult] = useState<ResultState | null>(null);
  const [fieldSize, setFieldSize] = useState<{ width: number; height: number } | null>(null);
  const [fieldOffset, setFieldOffset] = useState<{ x: number; y: number } | null>(null);
  const fieldWidth = fieldSize?.width ?? SCREEN_W;
  const fieldHeight = fieldSize?.height ?? SCREEN_H;
  const isFieldReady = fieldSize !== null;
  const { x, y, start, stop } = useTargetMotion(mode, fieldWidth, fieldHeight);
  const startRef = useRef(0);
  const fieldRef = useRef<View>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const resultAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const shake = useRef(new Animated.Value(0)).current;

  const targetStyle = useMemo(
    () => ({
      transform: [
        { translateX: Animated.subtract(x, TARGET_RADIUS) },
        { translateY: Animated.subtract(y, TARGET_RADIUS) },
      ],
      opacity: isFieldReady ? 1 : 0,
    }),
    [x, y, isFieldReady]
  );

  const handleFieldLayout = useCallback((evt: LayoutChangeEvent) => {
    const { width, height } = evt.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    setFieldSize((prev) => {
      if (prev && prev.width === width && prev.height === height) {
        return prev;
      }
      return { width, height };
    });
    fieldRef.current?.measureInWindow((pageX, pageY) => {
      setFieldOffset((prev) => {
        if (prev && prev.x === pageX && prev.y === pageY) {
          return prev;
        }
        return { x: pageX, y: pageY };
      });
    });
  }, []);

  const handlePressIn = useCallback(
    (evt: GestureResponderEvent) => {
      if (phase !== "guess" || !isFieldReady) return;

      const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
      let touchX: number | null = Number.isFinite(locationX) ? locationX : null;
      let touchY: number | null = Number.isFinite(locationY) ? locationY : null;

      if ((touchX === null || touchY === null) && fieldOffset) {
        const normalizedX = pageX - fieldOffset.x;
        const normalizedY = pageY - fieldOffset.y;
        if (Number.isFinite(normalizedX)) {
          touchX = normalizedX;
        }
        if (Number.isFinite(normalizedY)) {
          touchY = normalizedY;
        }
      }

      if (touchX !== null && touchY !== null) {
        lastTouchRef.current = {
          x: clamp(touchX, 0, fieldWidth),
          y: clamp(touchY, 0, fieldHeight),
        };
      } else {
        lastTouchRef.current = null;
      }
    },
    [phase, isFieldReady, fieldOffset, fieldWidth, fieldHeight]
  );

  const shakeStyle = useMemo(
    () => ({
      transform: [
        {
          translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] }),
        },
        {
          translateY: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }),
        },
      ],
    }),
    [shake]
  );

  useEffect(() => {
    if (phase !== "observe" || !isFieldReady) return;
    start();
    const timer = setTimeout(() => {
      setPhase("countdown");
    }, OBSERVE_DURATION);
    return () => clearTimeout(timer);
  }, [phase, start, isFieldReady]);

  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(COUNTDOWN_STEPS);
    let current = COUNTDOWN_STEPS;
    const interval = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(interval);
        startRef.current = Date.now();
        setPhase("guess");
      } else {
        setCountdown(current);
      }
    }, COUNTDOWN_INTERVAL);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "result" || !result) return;
    resultAnims.forEach((anim) => anim.setValue(0));
    shake.setValue(0);

    const shakeSequence = () =>
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]);

    Animated.sequence(
      resultAnims.map((anim) =>
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(40),
          shakeSequence(),
        ])
      )
    ).start();
  }, [phase, result, resultAnims, shake]);

  useEffect(() => {
    if (phase !== "result" || !result || result.saveState.status !== "pending") return;
    if (fieldWidth <= 0 || fieldHeight <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const nickname = (await getNickname()) ?? "anon";
        const payload: ScorePayload = {
          nickname,
          mode,
          distancePx: result.distancePx,
          reactionMs: result.reactionMs,
          screenWidth: fieldWidth,
          screenHeight: fieldHeight,
          targetX: result.target.x,
          targetY: result.target.y,
          guessX: result.guess.x,
          guessY: result.guess.y,
          timestamp: new Date().toISOString(),
          score: result.score,
        };
        await saveScoreEntry(payload);
        if (!cancelled) {
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  saveState: { status: "saved", message: "Saved to leaderboard" },
                }
              : prev
          );
        }
      } catch (error: any) {
        if (!cancelled) {
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  saveState: {
                    status: "error",
                    message: error?.message ?? "Unable to save score",
                  },
                }
              : prev
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, result, mode, fieldWidth, fieldHeight]);

  const handleGuess = useCallback(
    (evt: GestureResponderEvent) => {
      if (phase !== "guess" || !isFieldReady) return;

      const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
      const hasLocationX = Number.isFinite(locationX);
      const hasLocationY = Number.isFinite(locationY);
      let guessX = hasLocationX ? locationX : 0;
      let guessY = hasLocationY ? locationY : 0;

      if (fieldOffset) {
        if (!hasLocationX) {
          const normalizedX = pageX - fieldOffset.x;
          if (Number.isFinite(normalizedX)) {
            guessX = normalizedX;
          }
        }
        if (!hasLocationY) {
          const normalizedY = pageY - fieldOffset.y;
          if (Number.isFinite(normalizedY)) {
            guessY = normalizedY;
          }
        }
      }

      const fallbackTouch = lastTouchRef.current;
      const shouldUseFallback =
        !!fallbackTouch &&
        (!Number.isFinite(guessX) ||
          !Number.isFinite(guessY) ||
          (guessX === 0 &&
            guessY === 0 &&
            (fallbackTouch.x !== 0 || fallbackTouch.y !== 0)));

      if (shouldUseFallback) {
        guessX = fallbackTouch.x;
        guessY = fallbackTouch.y;
      }

      const guess = {
        x: clamp(guessX, 0, fieldWidth),
        y: clamp(guessY, 0, fieldHeight),
      };
      lastTouchRef.current = null;
      const target = stop();
      const reactionMs = Date.now() - startRef.current;
      const distancePx = Math.hypot(guess.x - target.x, guess.y - target.y);
      const maxDistance = Math.max(1, Math.hypot(fieldWidth, fieldHeight));
      const score = calculateScore(distancePx, reactionMs, maxDistance);
      setResult({
        reactionMs,
        distancePx,
        score,
        target,
        guess,
        saveState: { status: "pending" },
      });
      setPhase("result");
    },
    [phase, stop, isFieldReady, fieldWidth, fieldHeight, fieldOffset]
  );

  const resetGame = useCallback(() => {
    setResult(null);
    setCountdown(COUNTDOWN_STEPS);
    setPhase("observe");
  }, []);

  const detail = modeDetails[mode];

  const resultItems = result
    ? [
        {
          key: "time",
          label: "Time",
          value: `${result.reactionMs} ms`,
          style: styles.resultSmall,
        },
        {
          key: "distance",
          label: "Distance",
          value: `${Math.round(result.distancePx)} px`,
          style: styles.resultSmall,
        },
        {
          key: "score",
          label: "Score",
          value: `${result.score}`,
          style: styles.resultLarge,
        },
      ]
    : [];

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.modeTitle}>{detail.label} Mode</Text>
        <Text style={styles.modeSubtitle}>{detail.description}</Text>
      </View>
      <Animated.View style={[styles.fieldWrapper, shakeStyle]}>
        <Pressable
          ref={fieldRef}
          style={styles.field}
          onLayout={handleFieldLayout}
          onPressIn={handlePressIn}
          disabled={phase !== "guess" || !isFieldReady}
          onPress={handleGuess}
        >
          <Animated.View style={[styles.target, targetStyle]}>
            <ArcheryTarget />
          </Animated.View>
          {phase === "result" && result && (
            <>
              <View
                style={[
                  styles.marker,
                  styles.markerTarget,
                  {
                    left: result.target.x - MARKER_SIZE / 2,
                    top: result.target.y - MARKER_SIZE / 2,
                  },
                ]}
              />
              <View
                style={[
                  styles.marker,
                  styles.markerGuess,
                  {
                    left: result.guess.x - MARKER_SIZE / 2,
                    top: result.guess.y - MARKER_SIZE / 2,
                  },
                ]}
              />
            </>
          )}
          {(phase === "countdown" || phase === "guess") && (
            <View
              style={[styles.overlay, phase === "guess" ? styles.overlayGuess : styles.overlayCountdown]}
              pointerEvents="none"
            >
              <Text style={styles.overlayTitle}>{phaseCopy[phase].title}</Text>
              {phase === "countdown" ? (
                <Text style={styles.countdown}>{countdown}</Text>
              ) : (
                <Text style={styles.guessText}>Tap now</Text>
              )}
              <Text style={styles.overlaySubtitle}>{phaseCopy[phase].subtitle}</Text>
            </View>
          )}
          {phase === "result" && result && (
            <View style={styles.resultOverlay}>
              <View style={styles.resultsCard}>
                <Text style={styles.resultsTitle}>How close were you?</Text>
                <View style={styles.resultsList}>
                  {resultItems.map((item, index) => (
                    <Animated.View
                      key={item.key}
                      style={[
                        styles.resultItem,
                        item.style,
                        {
                          opacity: resultAnims[index],
                          transform: [
                            {
                              scale: resultAnims[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.6, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.resultLabel}>{item.label}</Text>
                      <Text style={styles.resultValue}>{item.value}</Text>
                    </Animated.View>
                  ))}
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: palette.positive }]} />
                  <Text style={styles.legendText}>Actual target</Text>
                  <View style={[styles.legendDot, { backgroundColor: palette.negative, marginLeft: 16 }]} />
                  <Text style={styles.legendText}>Your guess</Text>
                </View>
                {result.saveState.status !== "pending" && (
                  <Text
                    style={[
                      styles.saveMessage,
                      result.saveState.status === "saved" ? styles.saveMessageOk : styles.saveMessageError,
                    ]}
                  >
                    {result.saveState.message}
                  </Text>
                )}
                <View style={styles.resultButtons}>
                  <MenuButton title="Play again" onPress={resetGame} style={styles.inlineButton} />
                  {onExit && (
                    <MenuButton title="Back to modes" onPress={onExit} style={styles.inlineButton} />
                  )}
                </View>
              </View>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
    padding: 20,
  },
  header: {
    paddingVertical: 8,
  },
  modeTitle: {
    color: palette.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  modeSubtitle: {
    color: palette.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  fieldWrapper: {
    flex: 1,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
    backgroundColor: palette.surface,
    shadowColor: "#020806",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 10,
  },
  field: {
    flex: 1,
  },
  target: {
    position: "absolute",
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    borderRadius: TARGET_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  targetFace: {
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    borderRadius: TARGET_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    position: "absolute",
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
  },
  markerTarget: {
    backgroundColor: palette.positive,
    borderWidth: 2,
    borderColor: "rgba(14,33,23,0.6)",
  },
  markerGuess: {
    backgroundColor: palette.negative,
    borderWidth: 2,
    borderColor: "rgba(48,14,18,0.6)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  overlayCountdown: {
    backgroundColor: palette.overlayHeavy,
  },
  overlayGuess: {
    backgroundColor: palette.overlay,
  },
  overlayTitle: {
    color: palette.textPrimary,
    fontSize: 26,
    fontWeight: "700",
  },
  overlaySubtitle: {
    color: palette.textSecondary,
    marginTop: 12,
    textAlign: "center",
  },
  countdown: {
    color: palette.textPrimary,
    fontSize: 74,
    fontWeight: "800",
    marginVertical: 18,
  },
  guessText: {
    color: palette.textPrimary,
    fontSize: 40,
    fontWeight: "800",
    marginVertical: 18,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.surfaceOpacity,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  resultsCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: palette.surfaceAltOpacity,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
  resultsTitle: {
    color: palette.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  resultsList: {
    marginTop: 12,
  },
  resultItem: {
    marginBottom: 12,
    alignItems: "center",
  },
  resultSmall: {
    paddingVertical: 8,
  },
  resultLarge: {
    paddingVertical: 10,
  },
  resultLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  resultValue: {
    color: palette.textPrimary,
    fontWeight: "800",
    fontSize: 18,
    marginTop: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: palette.textSecondary,
    marginLeft: 6,
    fontSize: 12,
  },
  saveMessage: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
  },
  saveMessageOk: {
    color: palette.positive,
  },
  saveMessageError: {
    color: palette.negative,
  },
  resultButtons: {
    marginTop: 16,
  },
  inlineButton: {
    width: "100%",
  },
});
