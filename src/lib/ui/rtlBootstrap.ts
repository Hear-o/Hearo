// One place to set the app-wide reading-start alignment.
//
// Facts established on-device 2026-07-02:
//   1. Native forceRTL + Info.plist CFBundleDevelopmentRegion="he" flip
//      Yoga's flex layout correctly (icons swap, flex-row row-reverses).
//   2. RN Fabric auto-mirrors textAlign values in RTL: writing
//      `textAlign: "left"` renders visual right (Hebrew reading start).
//   3. Text.defaultProps under Fabric doesn't propagate to Text nodes with
//      their own inline style — so we sweep tokens + high-touch inline
//      styles to add explicit textAlign:"left" instead.
//
// This function keeps Text.defaultProps as a "best effort" default; the
// real fix is per-Text (via tokens or explicit style). Kept as a no-op
// safety net rather than the primary mechanism.

import { Text as RNText } from "react-native";

export function bootstrapTextDirection(): void {
  const base = { textAlign: "left" as const };
  const anyText = RNText as unknown as { defaultProps?: { style?: unknown } };
  anyText.defaultProps = {
    ...(anyText.defaultProps ?? {}),
    style: [base, (anyText.defaultProps?.style as object | undefined) ?? {}],
  };
}
