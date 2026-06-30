export const tokens = {
  // App surface — warm sand/paper light theme (used on every screen
  // except the immersive Session screen).
  bg: "#F2EBDD",
  bgElev: "#E8DECB",
  text: "#2E2823",
  // v1.1.8: darkened from #7A7060 to #5A5044 per Hili's UX review.
  // Original textMute against the #F2EBDD bg gave ~5:1 contrast, which
  // passes WCAG AA for normal text but is too thin for the 13pt eyebrows
  // and caption text it's most often used on. ~7:1 now.
  textMute: "#5A5044",
  accent: "#C17A45",
  accentSoft: "#9A6238",
  sage: "#7E9468",
  critical: "#BC6A4F",

  // Scene — the Session screen stays an immersive dark moment: light text
  // over scene imagery, with a warm-dark gradient overlay for legibility.
  sceneText: "#F4EEE3",
  // v1.1.8: lightened from #CDBBA6 to #DCCAB4 for parity with the textMute
  // contrast bump — same readability principle, opposite direction since
  // the scene background is dark.
  sceneTextMute: "#DCCAB4",
  sceneAccent: "#E0A56B",
  sceneOverlayBottom: "#140F0C",
} as const;

export const fonts = {
  display: "FrankRuhlLibre_400Regular",
  displayMedium: "FrankRuhlLibre_500Medium",
  body: "Heebo_400Regular",
  bodyMedium: "Heebo_500Medium",
} as const;

// v1.1.8: a deliberately small typography scale. Hili's UX review counted
// 17 distinct fontSize values across the app and called the visual fatigue
// out as exhausting for PTSD users. Four sizes total: a hero used once or
// twice per screen for the headline moment, a display for secondary heads
// and section titles, a body that's the default reading size, and a caption
// for eyebrows / helpers / muted labels. lineHeight is paired with each
// size and tuned for the Hebrew Frank Ruhl + Heebo metrics.
export const type = {
  hero:    { fontSize: 32, lineHeight: 44 },
  display: { fontSize: 24, lineHeight: 32 },
  body:    { fontSize: 17, lineHeight: 24 },
  caption: { fontSize: 14, lineHeight: 20 },
} as const;
