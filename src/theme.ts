export const palette = {
  background: "#0D1510",
  surface: "#16201B",
  surfaceOpacity: "#16201BCC",
  surfaceAlt: "#1E2A24",
  surfaceAltOpacity: "#1E2A24CC",
  overlay: "rgba(10, 24, 17, 1)",
  overlayHeavy: "rgba(6, 18, 12, 1)",
  border: "#243830",
  accent: "#2F9B6F",
  accentMuted: "#1F6E4E",
  textPrimary: "#E7F3EA",
  textSecondary: "#9CBFA9",
  positive: "#4ADE80",
  negative: "#F87171",
};

export const typography = {
  heading: { color: palette.textPrimary, fontSize: 22, fontWeight: "700" as const },
  body: { color: palette.textSecondary, fontSize: 14 },
};
