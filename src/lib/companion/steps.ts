// Pure gating logic for the Companion roadmap, kept out of the screen so the
// unlock rule is deterministic and unit-testable without mounting expo-router.
//
// The rule: a step is "done" once it has attached media; a step is "unlocked"
// only when the step before it has media (the first step is always unlocked).
// `done` and `unlocked` are independent — a step that already has media stays
// done even if an earlier step's media is later removed; the UI prioritizes the
// done state when rendering, and the re-lock only affects still-empty steps.

import { CompanionTask } from "@/lib/content/content";
import { CompanionTaskMedia } from "@/lib/storage/storage";

export type StepState = {
  task: CompanionTask;
  media?: CompanionTaskMedia;
  done: boolean;
  unlocked: boolean;
};

export function computeStepStates(
  tasks: CompanionTask[],
  media: Record<string, CompanionTaskMedia>,
): StepState[] {
  return tasks.map((task, i) => ({
    task,
    media: media[task.key],
    done: !!media[task.key],
    unlocked: i === 0 || !!media[tasks[i - 1].key],
  }));
}

export function companionDoneCount(
  tasks: CompanionTask[],
  media: Record<string, CompanionTaskMedia>,
): number {
  return tasks.reduce((n, task) => (media[task.key] ? n + 1 : n), 0);
}
