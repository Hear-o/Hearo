## Context

The crisis sheet currently has two actions: a primary `tel:1201` to ERAN, and a secondary *a person you trust* that today shows a stub message. The `crisis-access` capability spec defines both, with the stub explicitly as a v1 fallback. This change implements the configured path.

The persona constraint is heavy here. A combat veteran reaching for the trusted-contact action is, statistically, in distress. The UX needs to assume that: zero unnecessary steps, no permission walls between the tap and the call, no surveillance.

## Goals / Non-Goals

**Goals:**

- Tapping *a person you trust* with no contacts configured opens a calm one-step picker inside the crisis sheet — not a separate screen, not a settings detour.
- Tapping with contacts configured shows the list ordered by most-recently-added first; tap = `tel:`. No swipe gestures, no edit modes.
- Contacts are stored locally only. The `lib/storage.ts` seam holds the contact IDs (not the contact data); we re-read names + numbers from the address book at render time so updates in the user's phone book are reflected without sync logic.
- The add flow doesn't require contacts permission until the user actually wants to add — the empty state offers an "Add someone" tappable that prompts for permission on tap. If the user denies, we show a quiet explanation and stay on ERAN as the only path. No nagging.

**Non-Goals:**

- A full contact management UI in Settings (Settings doesn't exist yet). Add/remove all happens through the crisis sheet for v1.
- Cloud sync. The user's set of trusted contacts is per-device.
- Smart routing ("call this person if pulse > X"). Manual selection only.

## Decisions

### Store contact IDs, not contact data

`expo-contacts` gives us a stable contact ID we can look up later. Storing names/numbers in our own AsyncStorage means our cache drifts from the user's address book (rename in Contacts → stale in our store). Storing IDs and looking up at render keeps us in sync at the cost of one permission-gated read per render. That cost is fine — render happens infrequently and only when the user opens the crisis sheet.

### Cap at 5 contacts for v1

Five is enough for "people who'd answer at 2 a.m." and few enough that scrolling never happens — the whole list fits in the crisis sheet without overflow.

### Permission ask is on demand, not at onboarding

We don't ask for contacts access during Permissions (which currently asks for pulse + notifications). Doing so would require explaining "we need contacts so you can pick someone for crisis use" in onboarding, which premieres the crisis idea too early. Better to ask only when the user reaches for the feature.

### `tel:` not in-app calling

We never place a call ourselves. The `tel:` URI hands off to the system dialer, which respects do-not-disturb, carrier preferences, and the user's existing call screen. Matches how the ERAN action works.

## Risks / Trade-offs

- **Risk:** A user with no contacts permission granted has no secondary action and may feel cornered to ERAN as the only option. → **Mitigation:** The explanation copy on a denied permission frames ERAN as a strong fallback rather than as a remaining option — "ERAN's trained for this. They answer day and night." Doesn't moralize the user's permission choice.
- **Trade-off:** Storing only IDs means we can't show contact details without permission. If permission is revoked after contacts are added, the list shows generic placeholders. Acceptable; calling still works.
- **Risk:** Contacts permission is a sensitive grant. Some users will deny purely on principle, especially veterans. → **Mitigation:** The `NSContactsUsageDescription` text is direct and stays in scope: "for quickly calling someone you trust in a crisis moment". No marketing fluff.
