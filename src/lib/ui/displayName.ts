// Resolve a user's first name from the device, with graceful fallback.
//
// On modern iOS (16+) without the user-assigned-device-name entitlement,
// `Device.deviceName` returns the generic model ("iPhone") and we can't get
// the user-set name. On Android and older iOS, we typically get something
// like "Omer's iPhone" that we can parse.
//
// Strategy: try once on first launch, parse, cache the result (or null) in
// AsyncStorage so we don't retry every render. The cached value survives
// even if the OS later restricts access to the device name.

import { useCallback, useEffect, useState } from "react";
import * as Device from "expo-device";
import { useFocusEffect } from "expo-router";

import { useDisplayNameStore } from "../storage/display-name-store";
import { getDisplayName, setDisplayName } from "../storage/storage";

const GENERIC_PATTERNS: RegExp[] = [
  /^iphone(\s*\(\d+\))?$/i,
  /^ipad(\s*\(\d+\))?$/i,
  /^ipod(\s*\(\d+\))?$/i,
  /^android$/i,
  /^phone$/i,
  /^my\s+(iphone|ipad|ipod|android|phone)$/i,
];

/** Pull a likely first name out of the device name. Returns null when the
 *  device name is generic or unparseable. */
export function parseDisplayNameFromDevice(deviceName: string | null): string | null {
  if (!deviceName) return null;
  const trimmed = deviceName.trim();
  if (!trimmed) return null;

  if (GENERIC_PATTERNS.some((p) => p.test(trimmed))) return null;

  // English possessive: "Omer's iPhone" → "Omer"
  // Match curly and straight apostrophes.
  const englishMatch = trimmed.match(/^(.+?)['’]s\s/i);
  if (englishMatch) return englishMatch[1].trim();

  // Hebrew "X של Y": which side is the name varies by user habit.
  // "אייפון של עומר" → "עומר" (name is after של)
  // "עומר של אייפון" → "עומר" (name is before של)
  // Heuristic: pick whichever side doesn't match a known device-model word.
  const hebrewMatch = trimmed.match(/^(.+?)\s+של\s+(.+)$/);
  if (hebrewMatch) {
    const [, left, right] = hebrewMatch;
    const isDeviceWord = (s: string) =>
      /iphone|ipad|ipod|android|אייפון|אייפד|אנדרואיד|טלפון/i.test(s);
    if (isDeviceWord(left) && !isDeviceWord(right)) return right.trim();
    if (isDeviceWord(right) && !isDeviceWord(left)) return left.trim();
    // Ambiguous — default to the side after של (most common phrasing)
    return right.trim();
  }

  // No parseable pattern. Don't return the whole device name (likely not a
  // person's name) — better to fall back to the no-name greeting.
  return null;
}

/** Async resolver: read cache, or pull-and-cache from device on first call. */
export async function resolveDisplayName(): Promise<string | null> {
  const cached = await getDisplayName();
  if (cached !== undefined) return cached;

  const parsed = parseDisplayNameFromDevice(Device.deviceName ?? null);
  await setDisplayName(parsed);
  return parsed;
}

/** React hook. Returns null while loading; then string-or-null once resolved.
 *  Backed by a shared store (not local component state) so a name saved
 *  from any screen — Permissions, Settings — is reflected on every other
 *  mounted consumer (notably Home's greeting) instantly, with no route
 *  focus event or app restart required: Settings is an always-mounted
 *  overlay, not a routed screen, so a focus-only refresh never fires just
 *  from closing it. Still re-reads on screen focus too, so a name typed in
 *  Setup shows up immediately on Home when the user navigates back. */
export function useDisplayName(): { name: string | null; loading: boolean } {
  const name = useDisplayNameStore((s) => s.name);
  const loading = useDisplayNameStore((s) => s.loading);

  // Initial load on mount.
  useEffect(() => {
    let active = true;
    resolveDisplayName()
      .then((resolved) => {
        if (!active) return;
        useDisplayNameStore.getState().setName(resolved);
      })
      .catch(() => {
        // Storage/device read failed — fall back to the no-name greeting
        // rather than leaving `loading` stuck true forever.
        if (active) useDisplayNameStore.getState().setName(null);
      })
      .finally(() => {
        if (active) useDisplayNameStore.getState().setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Re-read on focus. After the user types a name in Setup and navigates
  // back to Home, this callback fires and we pick up the new stored value.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Bypass the device-name parse on refresh — only the stored value can
      // have changed between renders (the OS device name doesn't mutate).
      getDisplayName()
        .then((stored) => {
          if (!active) return;
          if (stored !== undefined) useDisplayNameStore.getState().setName(stored);
        })
        .catch(() => {
          // Refresh-on-focus best effort — keep whatever the store already has.
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return { name, loading };
}

/** Async setter exposed for Setup's name input. Persists the typed value
 *  and overrides any device-name parse result. Pass an empty string or
 *  null to clear the stored name (greeting falls back to the no-name form).
 *  Updates the shared store immediately so every mounted consumer reflects
 *  the change live, without waiting on a focus event or restart. */
export async function persistDisplayName(name: string | null): Promise<void> {
  const trimmed = name?.trim() ?? null;
  const finalValue = trimmed && trimmed.length > 0 ? trimmed : null;
  await setDisplayName(finalValue);
  useDisplayNameStore.getState().setName(finalValue);
}

/** Editable draft backed by the stored display name — pre-fills once resolved,
 *  persists on blur. Shared by every screen with a name field (Permissions,
 *  Settings) so they can't drift out of sync. */
export function useNameDraft(): {
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
} {
  const { name: storedName } = useDisplayName();
  const [value, setValue] = useState<string>(storedName ?? "");
  useEffect(() => {
    if (storedName !== null && storedName !== undefined) {
      setValue((prev) => (prev === "" ? storedName : prev));
    }
  }, [storedName]);

  return {
    value,
    onChangeText: setValue,
    // Best-effort save — the typed value already lives in local `value` state
    // regardless of whether the AsyncStorage write lands, so a failure here
    // only risks not surviving an app restart, not losing what's on screen.
    onBlur: () => void persistDisplayName(value).catch(() => {}),
  };
}
