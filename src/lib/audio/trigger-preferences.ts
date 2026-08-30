export const TRIGGER_SOUND_PREFERENCE_VERSION = 1 as const;

export const TRIGGER_VOLUME_MIN_DB = -36;
export const TRIGGER_VOLUME_MAX_DB = -18;
export const TRIGGER_RATE_MIN = 0.5;
export const TRIGGER_RATE_MAX = 2;

export const TRIGGER_VOLUME_DB_STEPS = [
  -36,
  -33,
  -30,
  -27,
  -24,
  -21,
  -18,
] as const;

export const TRIGGER_RATE_STEPS = [0.5, 0.75, 1, 1.5, 2] as const;

export type TriggerSoundPreference = {
  schemaVersion: typeof TRIGGER_SOUND_PREFERENCE_VERSION;
  minimumPeakDb: number;
  maximumPeakDb: number;
  triggersPerMinute: number;
};

export const DEFAULT_TRIGGER_SOUND_PREFERENCE: TriggerSoundPreference = {
  schemaVersion: TRIGGER_SOUND_PREFERENCE_VERSION,
  minimumPeakDb: -18,
  maximumPeakDb: -18,
  triggersPerMinute: 1,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Converts untrusted persisted data into a scheduler-safe preference.
 *
 * A missing, stale, or structurally invalid record uses the legacy default.
 * Numeric values from the current schema are clamped to the approved envelope,
 * and a reversed min/max pair is sorted rather than passed to the audio graph.
 */
export function normalizeTriggerSoundPreference(
  value: unknown,
): TriggerSoundPreference {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_TRIGGER_SOUND_PREFERENCE };
  }

  const candidate = value as Partial<TriggerSoundPreference>;
  if (
    candidate.schemaVersion !== TRIGGER_SOUND_PREFERENCE_VERSION ||
    !isFiniteNumber(candidate.minimumPeakDb) ||
    !isFiniteNumber(candidate.maximumPeakDb) ||
    !isFiniteNumber(candidate.triggersPerMinute)
  ) {
    return { ...DEFAULT_TRIGGER_SOUND_PREFERENCE };
  }

  const first = clamp(
    candidate.minimumPeakDb,
    TRIGGER_VOLUME_MIN_DB,
    TRIGGER_VOLUME_MAX_DB,
  );
  const second = clamp(
    candidate.maximumPeakDb,
    TRIGGER_VOLUME_MIN_DB,
    TRIGGER_VOLUME_MAX_DB,
  );

  return {
    schemaVersion: TRIGGER_SOUND_PREFERENCE_VERSION,
    minimumPeakDb: Math.min(first, second),
    maximumPeakDb: Math.max(first, second),
    triggersPerMinute: clamp(
      candidate.triggersPerMinute,
      TRIGGER_RATE_MIN,
      TRIGGER_RATE_MAX,
    ),
  };
}

export function triggerVolumeDbToPercent(db: number): number {
  const clamped = clamp(db, TRIGGER_VOLUME_MIN_DB, TRIGGER_VOLUME_MAX_DB);
  return Math.round(
    1 +
      ((clamped - TRIGGER_VOLUME_MIN_DB) /
        (TRIGGER_VOLUME_MAX_DB - TRIGGER_VOLUME_MIN_DB)) *
        99,
  );
}

export function triggerIntervalSeconds(triggersPerMinute: number): number {
  const clamped = clamp(
    triggersPerMinute,
    TRIGGER_RATE_MIN,
    TRIGGER_RATE_MAX,
  );
  return Math.round(60 / clamped);
}

export function deriveTriggerSchedule(
  triggerZoneMs: number,
  triggersPerMinute: number,
): { triggerCount: number; triggerIntervalMs: number } {
  const safeZoneMs = Math.max(0, triggerZoneMs);
  const safeRate = clamp(
    triggersPerMinute,
    TRIGGER_RATE_MIN,
    TRIGGER_RATE_MAX,
  );
  const triggerCount = Math.max(
    1,
    Math.round((safeZoneMs / 60_000) * safeRate),
  );

  return {
    triggerCount,
    triggerIntervalMs: safeZoneMs / triggerCount,
  };
}
