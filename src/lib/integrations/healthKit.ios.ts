// HealthKit adapter — iOS implementation.
//
// Wraps @kingstinct/react-native-healthkit behind a small app-owned API so the
// pulse hook in `lib/pulse.ts` doesn't depend on vendor-specific types.
//
// Real-time heart-rate via HKObserverQuery requires background entitlements
// and a more involved setup. For a foregrounded session this poll-based
// approach (every POLL_MS) is enough to drive the auto-soften decision —
// Apple Watch writes new samples every few seconds during active use.
//
// Privacy: nothing in this file reaches the network. Samples stay in memory
// and are consumed by the hook. See `wire-healthkit-pulse` spec.

import {
  isHealthDataAvailable,
  queryQuantitySamples,
  requestAuthorization as requestHealthKitAuthorization,
  type QuantitySampleTyped,
} from "@kingstinct/react-native-healthkit";

import {
  getHealthKitGranted,
  setHealthKitGranted,
} from "../storage/storage";
import type {
  AuthorizationStatus,
  HeartRateSample,
  HeartRateUnsubscribe,
} from "./healthKit";

const HEART_RATE_IDENTIFIER = "HKQuantityTypeIdentifierHeartRate";
const HEART_RATE_UNIT = "count/min";
const READ_PERMISSIONS = {
  toRead: [HEART_RATE_IDENTIFIER],
} as const;

const POLL_MS = 2000;

let initialized = false;
// In-flight authorization promise — concurrent callers (e.g. a double-tapped Allow
// button) share this single promise instead of racing two HealthKit authorization
// calls. Cleared after settle so a later request can re-try.
let initPromise: Promise<boolean> | null = null;

async function ensureInit(): Promise<boolean> {
  if (initialized) return true;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      // dialogCompleted is true when the authorization sheet was presented and
      // dismissed — NOT a confirmation that the user granted access. Apple
      // intentionally hides that choice from the app.
      const dialogCompleted = await requestHealthKitAuthorization(READ_PERMISSIONS);
      if (!dialogCompleted) return false;
      initialized = true;
      // Persist so cold-start skips the prompt (we can't query the OS for the
      // outcome; samples simply won't flow if the user denied, and the pulse
      // hook falls through to mock in that case).
      await setHealthKitGranted(true);
      return true;
    } catch {
      return false;
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
}

export async function isAvailable(): Promise<boolean> {
  try {
    const available = isHealthDataAvailable();
    if (!available) return false;
    return await ensureInit();
  } catch {
    return false;
  }
}

export async function requestAuthorization(): Promise<AuthorizationStatus> {
  const ok = await ensureInit();
  // "requested" rather than "granted": the dialog completed but Apple does not
  // reveal the user's choice. Callers should allow the user to proceed and rely
  // on the pulse hook's mock-fallback if samples never arrive.
  return ok ? "requested" : "denied";
}

export async function getAuthorizationStatus(): Promise<AuthorizationStatus> {
  if (initialized) return "requested";
  // Read the sticky flag rather than requesting authorization, because that
  // triggers the iOS prompt on first run and we don't want the permissions
  // screen to ambush the user before they tap "Allow".
  const requested = await getHealthKitGranted();
  return requested ? "requested" : "undetermined";
}

type HeartRateSampleValue = Pick<
  QuantitySampleTyped<typeof HEART_RATE_IDENTIFIER>,
  "endDate" | "quantity"
>;

function getEndDateMs(sample: HeartRateSampleValue): number | null {
  const rawEndDate = sample.endDate;
  const endMs = rawEndDate instanceof Date
    ? rawEndDate.getTime()
    : new Date(rawEndDate).getTime();

  return Number.isFinite(endMs) ? endMs : null;
}

export function subscribeHeartRate(
  callback: (sample: HeartRateSample) => void,
): HeartRateUnsubscribe {
  // Track the most recent sample's endDate so each poll only forwards new ones.
  let lastEndDateMs = Date.now() - 60_000; // start by looking 1 min back
  let cancelled = false;

  const tick = () => {
    // istanbul ignore next: defensive re-entry guard. unsubscribe() clears the
    // interval, so a tick never fires after cancellation in practice; the inner
    // post-callback guard below is the one that can actually race.
    if (cancelled) return;
    void queryQuantitySamples(HEART_RATE_IDENTIFIER, {
      ascending: true,
      filter: {
        date: {
          startDate: new Date(lastEndDateMs),
        },
      },
      limit: 20,
      unit: HEART_RATE_UNIT,
    }).then((samples) => {
      if (cancelled) return;
      for (const sample of samples) {
        const endMs = getEndDateMs(sample);
        if (endMs === null || endMs <= lastEndDateMs) continue;
        lastEndDateMs = endMs;
        callback({ bpm: Math.round(sample.quantity), timestamp: endMs });
      }
    }).catch(() => {});
  };

  // First poll fires immediately so we don't wait POLL_MS for the first reading.
  tick();
  const id = setInterval(tick, POLL_MS);

  return () => {
    cancelled = true;
    clearInterval(id);
  };
}
