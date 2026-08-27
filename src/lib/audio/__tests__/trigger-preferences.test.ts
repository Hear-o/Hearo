import {
  DEFAULT_TRIGGER_SOUND_PREFERENCE,
  deriveTriggerSchedule,
  normalizeTriggerSoundPreference,
  triggerIntervalSeconds,
  triggerVolumeDbToPercent,
} from "@/lib/audio/trigger-preferences";

describe("trigger sound preferences", () => {
  it("falls back to the legacy profile for missing or stale data", () => {
    expect(normalizeTriggerSoundPreference(undefined)).toEqual(
      DEFAULT_TRIGGER_SOUND_PREFERENCE,
    );
    expect(
      normalizeTriggerSoundPreference({
        schemaVersion: 0,
        minimumPeakDb: -30,
        maximumPeakDb: -24,
        triggersPerMinute: 1.5,
      }),
    ).toEqual(DEFAULT_TRIGGER_SOUND_PREFERENCE);
  });

  it("clamps numeric fields and sorts a reversed volume range", () => {
    expect(
      normalizeTriggerSoundPreference({
        schemaVersion: 1,
        minimumPeakDb: -10,
        maximumPeakDb: -50,
        triggersPerMinute: 4,
      }),
    ).toEqual({
      schemaVersion: 1,
      minimumPeakDb: -36,
      maximumPeakDb: -18,
      triggersPerMinute: 2,
    });
  });

  it("maps the approved dB envelope to friendly percentages", () => {
    expect(triggerVolumeDbToPercent(-36)).toBe(0);
    expect(triggerVolumeDbToPercent(-27)).toBe(50);
    expect(triggerVolumeDbToPercent(-18)).toBe(100);
  });

  it("derives readable intervals and duration-aware burst counts", () => {
    expect(triggerIntervalSeconds(0.5)).toBe(120);
    expect(triggerIntervalSeconds(2)).toBe(30);
    expect(deriveTriggerSchedule(4 * 60_000, 1)).toEqual({
      triggerCount: 4,
      triggerIntervalMs: 60_000,
    });
    expect(deriveTriggerSchedule(2 * 60_000, 0.5)).toEqual({
      triggerCount: 1,
      triggerIntervalMs: 120_000,
    });
  });
});
