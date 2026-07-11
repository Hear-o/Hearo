import {
  localize,
  getScenes,
  getScene,
  getSounds,
  getSound,
  getVoiceScript,
  getDefaultPreferences,
  getAmbientTrack,
  getVoiceClips,
  getDailyAffirmation,
  getPsychoEducation,
  getCalmingProtocol,
  getClinicalScreening,
  computeClinicalScreeningOutcome,
  isPlaceholderSource,
  getCompanionTasks,
  SCENE_ORDER,
  VOICED_SCENES,
  SOUND_ORDER,
} from "@/lib/content/content";
import type { Phase } from "@/lib/content/content";

describe("content / localize", () => {
  const text = { en: "Hello", he: "שלום" };

  it("returns Hebrew for 'he'", () => {
    expect(localize(text, "he")).toBe("שלום");
  });
  it("returns English for 'en'", () => {
    expect(localize(text, "en")).toBe("Hello");
  });
  it("falls back to English for any non-'he' lang", () => {
    expect(localize(text, "fr")).toBe("Hello");
    expect(localize(text, "")).toBe("Hello");
  });
});

describe("content / scenes", () => {
  it("getScenes returns scenes in SCENE_ORDER", () => {
    expect(getScenes().map((s) => s.key)).toEqual(SCENE_ORDER);
  });

  it("getScene resolves every scene key", () => {
    for (const key of SCENE_ORDER) {
      expect(getScene(key).key).toBe(key);
    }
  });

  it("getVoiceScript returns non-empty, locale-distinct text for every voiced scene", () => {
    const phases: Phase[] = ["opening", "during", "calming"];
    for (const scene of VOICED_SCENES) {
      for (const phase of phases) {
        const en = getVoiceScript(scene, phase, "en");
        const he = getVoiceScript(scene, phase, "he");
        expect(en.length).toBeGreaterThan(0);
        expect(he.length).toBeGreaterThan(0);
        expect(he).not.toBe(en);
      }
    }
  });

  it("getVoiceScript returns empty text for not-yet-voiced Practice scenes", () => {
    // v1.2.0 scenes are offered in Practice but have no narration yet; the
    // session hides the caption when the script is empty.
    const voiceless = SCENE_ORDER.filter((s) => !VOICED_SCENES.includes(s));
    expect(voiceless.length).toBeGreaterThan(0);
    for (const scene of voiceless) {
      expect(getVoiceScript(scene, "opening", "en")).toBe("");
      expect(getVoiceScript(scene, "during", "he")).toBe("");
    }
  });
});

describe("content / sounds", () => {
  it("getSounds returns sounds in SOUND_ORDER", () => {
    expect(getSounds().map((s) => s.key)).toEqual(SOUND_ORDER);
  });

  it("getSound resolves every sound key", () => {
    for (const key of SOUND_ORDER) {
      expect(getSound(key).key).toBe(key);
    }
  });

  it("every sound has at least one audio variation", () => {
    for (const key of SOUND_ORDER) {
      expect(getSound(key).audioVariations.length).toBeGreaterThan(0);
    }
  });
});

describe("content / default preferences", () => {
  it("returns a valid scene and a sound subset", () => {
    const prefs = getDefaultPreferences();
    expect(SCENE_ORDER).toContain(prefs.scene);
    for (const sound of prefs.sounds) {
      expect(SOUND_ORDER).toContain(sound);
    }
  });
});

describe("content / session audio sources", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("identifies unresolved TODO source placeholders only", () => {
    expect(isPlaceholderSource("TODO_REPLACE_WITH_AUDIO")).toBe(true);
    expect(isPlaceholderSource("https://cdn.example.com/audio.mp3")).toBe(false);
    expect(isPlaceholderSource(1)).toBe(false);
  });

  it("returns a bundled ambient track for every scene", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    for (const scene of SCENE_ORDER) {
      const track = getAmbientTrack(scene);
      expect(track.key).toBe(`ambient/${scene}`);
      expect(track.label.en.length).toBeGreaterThan(0);
      expect(track.label.he.length).toBeGreaterThan(0);
      expect(track.source).toBe(1);
      expect(isPlaceholderSource(track.source)).toBe(false);
    }
  });

  it("returns bundled clips for every voiced scene + language in disclaimer/mid/wind-down order", () => {
    // Both langs across every voiced scene must resolve to a real bundled mp3.
    // The order matches AudioEngine's playVoiceClip(index) contract.
    for (const scene of VOICED_SCENES) {
      for (const lang of ["en", "he"] as const) {
        const clips = getVoiceClips(scene, lang);
        expect(clips.map((clip) => clip.key)).toEqual([
          "disclaimer",
          "mid-session",
          "wind-down",
        ]);
        for (const clip of clips) {
          expect(clip.label.en.length).toBeGreaterThan(0);
          expect(clip.label.he.length).toBeGreaterThan(0);
          expect(isPlaceholderSource(clip.source)).toBe(false);
          expect(typeof clip.source).toBe("number");
        }
      }
    }
  });

  it("returns skippable placeholder clips for not-yet-voiced Practice scenes", () => {
    // Voice-less scenes still yield three clips (same disclaimer/mid/wind-down
    // shape) but with placeholder sources the session flow skips, so playback
    // never crashes on a scene without recordings.
    const voiceless = SCENE_ORDER.filter((s) => !VOICED_SCENES.includes(s));
    for (const scene of voiceless) {
      const clips = getVoiceClips(scene, "en");
      expect(clips.map((clip) => clip.key)).toEqual([
        "disclaimer",
        "mid-session",
        "wind-down",
      ]);
      for (const clip of clips) {
        expect(isPlaceholderSource(clip.source)).toBe(true);
      }
    }
  });

  it("falls back to Hebrew when the i18n locale is a regional / unknown variant", () => {
    // i18next may hand us "en-US" or some non-en/he tag. We only recorded en
    // and he, so anything else picks he (the i18n.init fallback).
    const enUs = getVoiceClips("beach", "en-US");
    const ru = getVoiceClips("beach", "ru");
    const heIl = getVoiceClips("beach", "he-IL");
    expect(enUs[0].source).toBe(getVoiceClips("beach", "en")[0].source);
    expect(ru[0].source).toBe(getVoiceClips("beach", "he")[0].source);
    expect(heIl[0].source).toBe(getVoiceClips("beach", "he")[0].source);
  });
});

// B-02: the psycho-ed screen reads from this getter. Asserts the content
// shape AND that both languages are populated (the EN translation drift
// against HE source is the regression risk).
describe("content / psycho-education", () => {
  it("exposes eyebrow, heading, body, and continueLabel in both languages", () => {
    const p = getPsychoEducation();
    expect(p.eyebrow.en.length).toBeGreaterThan(0);
    expect(p.eyebrow.he.length).toBeGreaterThan(0);
    expect(p.heading.en.length).toBeGreaterThan(0);
    expect(p.heading.he.length).toBeGreaterThan(0);
    expect(p.continueLabel.en.length).toBeGreaterThan(0);
    expect(p.continueLabel.he.length).toBeGreaterThan(0);
  });

  it("has between two and five body paragraphs, all populated in both languages", () => {
    const p = getPsychoEducation();
    // Range is intentional: the copy was condensed from Hirschman's five
    // paragraphs to three in the UI QA pass for phone-screen density.
    // Tightening further or restoring depth is a copy decision.
    expect(p.body.length).toBeGreaterThanOrEqual(2);
    expect(p.body.length).toBeLessThanOrEqual(5);
    for (const para of p.body) {
      expect(para.en.length).toBeGreaterThan(0);
      expect(para.he.length).toBeGreaterThan(0);
    }
  });
});

// B-03 v1: the calming protocol is a 5-step user-initiated regulation flow.
// Order and shape are load-bearing — wrong step order or missing prompts
// would break the orchestrator that drives the screen.
describe("content / calming protocol", () => {
  it("returns exactly five steps in the documented order", () => {
    const steps = getCalmingProtocol();
    expect(steps.map((s) => s.kind)).toEqual([
      "validation",
      "body-grounding",
      "box-breathing",
      "sensory-grounding",
      "close",
    ]);
  });

  it("box-breathing has 2 cycles × 4 phases at 4s each — matches Hirschman doc", () => {
    const steps = getCalmingProtocol();
    const boxBreathing = steps.find((s) => s.kind === "box-breathing");
    if (boxBreathing?.kind !== "box-breathing") {
      throw new Error("box-breathing step missing");
    }
    expect(boxBreathing.cycles).toBe(2);
    expect(boxBreathing.phaseMs).toBe(4_000);
    expect(boxBreathing.prompts.inhale.en.length).toBeGreaterThan(0);
    expect(boxBreathing.prompts.inhale.he.length).toBeGreaterThan(0);
    expect(boxBreathing.prompts.hold.en.length).toBeGreaterThan(0);
    expect(boxBreathing.prompts.exhale.en.length).toBeGreaterThan(0);
  });

  it("sensory-grounding has three sub-steps in 3 → 2 → 1 order", () => {
    const steps = getCalmingProtocol();
    const sensory = steps.find((s) => s.kind === "sensory-grounding");
    if (sensory?.kind !== "sensory-grounding") {
      throw new Error("sensory-grounding step missing");
    }
    expect(sensory.steps.map((s) => s.count)).toEqual([3, 2, 1]);
    for (const sub of sensory.steps) {
      expect(sub.prompt.en.length).toBeGreaterThan(0);
      expect(sub.prompt.he.length).toBeGreaterThan(0);
      expect(sub.durationMs).toBeGreaterThan(0);
    }
  });

  it("prose steps (validation/body/close) have content in both languages", () => {
    const steps = getCalmingProtocol();
    for (const s of steps) {
      if (s.kind === "validation" || s.kind === "body-grounding" || s.kind === "close") {
        expect(s.text.en.length).toBeGreaterThan(0);
        expect(s.text.he.length).toBeGreaterThan(0);
        expect(s.durationMs).toBeGreaterThan(0);
      }
    }
  });
});

// B-01: PC-PTSD-5. Item text in EN is verbatim from VA's official PDF, so
// these tests assert shape + length + presence, not specific wording.
describe("content / clinical screening (short-PCL, 4-item Likert)", () => {
  it("exposes intro, trauma-exposure prompt, 4 items with 5 Likert labels, and three outcome screens in both languages", () => {
    const c = getClinicalScreening();
    expect(c.version.length).toBeGreaterThan(0);
    expect(c.cutoff).toBe(8);

    expect(c.intro.eyebrow.en.length).toBeGreaterThan(0);
    expect(c.intro.eyebrow.he.length).toBeGreaterThan(0);
    expect(c.intro.heading.en.length).toBeGreaterThan(0);
    expect(c.intro.heading.he.length).toBeGreaterThan(0);
    expect(c.intro.body.en.length).toBeGreaterThan(0);
    expect(c.intro.body.he.length).toBeGreaterThan(0);

    expect(c.traumaExposure.prompt.en.length).toBeGreaterThan(0);
    expect(c.traumaExposure.prompt.he.length).toBeGreaterThan(0);

    expect(c.items.questions).toHaveLength(4);
    for (const q of c.items.questions) {
      expect(q.en.length).toBeGreaterThan(0);
      expect(q.he.length).toBeGreaterThan(0);
    }

    expect(c.items.likertLabels).toHaveLength(5);
    for (const l of c.items.likertLabels) {
      expect(l.en.length).toBeGreaterThan(0);
      expect(l.he.length).toBeGreaterThan(0);
    }

    expect(c.outcomes.noTrauma.heading.en.length).toBeGreaterThan(0);
    expect(c.outcomes.belowThreshold.heading.en.length).toBeGreaterThan(0);
    expect(c.outcomes.aboveThreshold.heading.en.length).toBeGreaterThan(0);
    expect(c.outcomes.aboveThreshold.continueLabel.en.length).toBeGreaterThan(0);
  });
});

describe("content / computeClinicalScreeningOutcome", () => {
  it("returns no-trauma + score 0 when traumaExposure is false (items irrelevant)", () => {
    expect(computeClinicalScreeningOutcome(false, [], 8)).toEqual({
      score: 0,
      outcome: "no-trauma",
    });
    // Even if answers were provided (they shouldn't be), no-trauma wins.
    expect(computeClinicalScreeningOutcome(false, [4, 4, 4, 4], 8)).toEqual({
      score: 0,
      outcome: "no-trauma",
    });
  });

  it("returns below-threshold for score < cutoff", () => {
    expect(
      computeClinicalScreeningOutcome(true, [0, 0, 0, 0], 8),
    ).toEqual({ score: 0, outcome: "below-threshold" });
    expect(
      computeClinicalScreeningOutcome(true, [2, 2, 1, 2], 8),
    ).toEqual({ score: 7, outcome: "below-threshold" });
  });

  it("returns above-threshold at exactly the cutoff (boundary case for the gate)", () => {
    expect(
      computeClinicalScreeningOutcome(true, [2, 2, 2, 2], 8),
    ).toEqual({ score: 8, outcome: "above-threshold" });
  });

  it("returns above-threshold for score > cutoff", () => {
    expect(
      computeClinicalScreeningOutcome(true, [3, 3, 3, 3], 8),
    ).toEqual({ score: 12, outcome: "above-threshold" });
    expect(
      computeClinicalScreeningOutcome(true, [4, 4, 4, 4], 8),
    ).toEqual({ score: 16, outcome: "above-threshold" });
  });
});

// v1.1.x — daily affirmation on Home. Same quote whole day, rotates per
// local-date. Content itself is pre-clinical-review (see content.ts comment).
describe("content / daily affirmation", () => {
  it("returns a non-empty string for he and en", () => {
    expect(getDailyAffirmation("he").length).toBeGreaterThan(0);
    expect(getDailyAffirmation("en").length).toBeGreaterThan(0);
  });

  it("is stable within the same render pass (same calendar day)", () => {
    // Two reads on the same day must return the same quote — otherwise it
    // would flicker between re-renders, defeating the point.
    expect(getDailyAffirmation("he")).toBe(getDailyAffirmation("he"));
    expect(getDailyAffirmation("en")).toBe(getDailyAffirmation("en"));
  });

  it("returns the localized form for the requested language", () => {
    // The HE and EN strings for the same day's quote shouldn't be identical
    // (one is Hebrew, one is English). This catches a wiring bug where the
    // localize() helper might collapse to one language regardless of input.
    expect(getDailyAffirmation("he")).not.toBe(getDailyAffirmation("en"));
  });
});

// v1.2.0 companion roadmap — per-scene task ladders. All labels are
// TODO(clinical-review); the tests here just verify the data structure
// is well-formed and that every SceneKey has at least one task.
describe("content / companion tasks", () => {
  it("returns a non-empty task list for every scene", () => {
    for (const sceneKey of SCENE_ORDER) {
      const tasks = getCompanionTasks(sceneKey);
      expect(tasks.length).toBeGreaterThan(0);
    }
  });

  it("every task has a unique key and localized label", () => {
    const allKeys: string[] = [];
    for (const sceneKey of SCENE_ORDER) {
      for (const task of getCompanionTasks(sceneKey)) {
        expect(task.key).toMatch(/^[a-z]+(?:-[a-z]+)*-\d+$/);
        expect(task.label.en.length).toBeGreaterThan(0);
        expect(task.label.he.length).toBeGreaterThan(0);
        allKeys.push(task.key);
      }
    }
    expect(new Set(allKeys).size).toBe(allKeys.length);
  });
});
