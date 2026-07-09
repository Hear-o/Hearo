import { computeStepStates, companionDoneCount } from "@/lib/companion/steps";
import { CompanionTask } from "@/lib/content/content";
import { CompanionTaskMedia } from "@/lib/storage/storage";

const tasks: CompanionTask[] = [
  { key: "beach-1", label: { en: "one", he: "אחד" } },
  { key: "beach-2", label: { en: "two", he: "שתיים" } },
  { key: "beach-3", label: { en: "three", he: "שלוש" } },
];

const img = (uri: string): CompanionTaskMedia => ({ uri, type: "image", capturedAt: 1 });

// The unlock rule is the whole point of the feature — only the next step opens,
// and only once the current one has real media. These pin that contract.
describe("computeStepStates", () => {
  it("locks everything but the first step when there is no media", () => {
    const states = computeStepStates(tasks, {});
    expect(states.map((s) => s.unlocked)).toEqual([true, false, false]);
    expect(states.every((s) => !s.done)).toBe(true);
    expect(companionDoneCount(tasks, {})).toBe(0);
  });

  it("unlocks the next step once the current step has media", () => {
    const media = { "beach-1": img("a") };
    const states = computeStepStates(tasks, media);
    expect(states[0]).toMatchObject({ done: true, unlocked: true });
    expect(states[1]).toMatchObject({ done: false, unlocked: true });
    expect(states[2]).toMatchObject({ done: false, unlocked: false });
    expect(companionDoneCount(tasks, media)).toBe(1);
  });

  it("unlocks progressively as each step is completed", () => {
    const media = { "beach-1": img("a"), "beach-2": img("b") };
    const states = computeStepStates(tasks, media);
    expect(states.map((s) => s.unlocked)).toEqual([true, true, true]);
    expect(states.map((s) => s.done)).toEqual([true, true, false]);
    expect(companionDoneCount(tasks, media)).toBe(2);
  });

  it("keeps a later step done even if an earlier step's media is removed", () => {
    // beach-2 has media but beach-1 does not (earlier media removed): step 2
    // stays done, while step 2's *unlock* gate (which only governs empty steps)
    // reads false. The UI prioritizes the done state when rendering.
    const media = { "beach-2": img("b") };
    const states = computeStepStates(tasks, media);
    expect(states[1]).toMatchObject({ done: true, unlocked: false });
    expect(states[2].unlocked).toBe(true); // its predecessor (beach-2) has media
  });
});
