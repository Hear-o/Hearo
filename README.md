# HearO

A quiet place to be again.

HearO is a mobile app for veterans living with combat-related PTSD. It uses gradual, consent-based sound exposure — ambient soundscapes layered with user-chosen trigger sounds — guided by a pre-recorded voice and watched over by the user's Apple Watch pulse. The user has two control layers: a manual intensity dial that's always reachable, and an automatic pulse-driven response that softens things when their body starts to spike. Both can only make things softer, never louder. No popups. No alarms. The app does the work the user shouldn't have to.

> Companion docs (see [`docs/README.md`](./docs/README.md) for the tagged index):
>
> - [`docs/RATIONALE.md`](./docs/RATIONALE.md) — clinical and design reasoning, with citations.
> - [`docs/FRONTEND.md`](./docs/FRONTEND.md) — visual design system + screen specs.
> - [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) — frontend code conventions (stack, folder structure, hooks, naming).
> - [`openspec/README.md`](./openspec/README.md) — capability requirements in [openspec.dev](https://openspec.dev) form.
> - [`docs/voice-scripts/`](./docs/voice-scripts/) — source text for the in-session voice narration, per scene, EN + HE.
> - [`web/README.md`](./web/README.md) — marketing site (Astro + Tailwind), landing + privacy policy.

## The user we're designing for

A combat veteran. Possibly currently serving, possibly discharged. Knows their triggers. Wants tools, not therapy-marketing. Cares about privacy. Skeptical of "wellness apps" and allergic to the word _hero_.

**Hard constraints driven by this persona:**

- **No military iconography anywhere.** No camo, dog tags, ranks, flags, silhouettes. Those _are_ the triggers we are treating.
- **No "thank you for your service" framing.** No hero copy. No badge-of-honor visual language.
- **Privacy is foreground, not buried in settings.** Mental-health stigma in military culture is real and load-bearing on adoption.
- **Crisis access is one tap from every screen.** Quiet, not alarming.
- **Treats the user as capable.** Never fragile, never patronizing.

## The core loop (a session)

1. User opens app. App shows today's prepared moment (scene + selected sounds).
2. User taps **begin**. Ambient soundscape plays through headphones (river, city, etc.).
3. A pre-recorded voice narrates the scene in soft, second-person prose.
4. After ~60–90 seconds, a user-consented trigger sound enters the soundscape (motorcycle, helicopter, etc.).
5. **Two control layers run in parallel:**
   - **Manual** — the user can drag an always-visible _softer / louder_ slider on the session screen at any time. Slider sets a ceiling on trigger volume.
   - **Automatic** — Apple Watch streams pulse to the app. If pulse crosses threshold, voice softens to a calming script, breathing circle slows, trigger sound auto-attenuates below the user's ceiling. No popup, no alert.
6. Session ends after ~6 minutes. User sees pulse curve and a three-option check-in.

## The demo

**The hero moment of the pitch is the absence of drama on screen** while the soundscape and pulse loop work underneath. Judges see a quiet phone. They hear an intense soundscape. The pulse number rises. The voice changes. The visual stays calm. That contrast is the story.

**Demo flow** (target: ~3 minutes on stage):

1. Welcome → Permissions → Setup (scene + sounds) → Home — about 45 seconds, sells the consent moment.
2. Begin session. Ambient plays. Voice narrates. ~30 seconds of calm.
3. Trigger sound enters. The presenter drags the intensity slider down a notch — _the user is always in control_. ~15 seconds.
4. Trigger comes again, pulse climbs anyway. Voice script shifts. Breathing slows. App auto-responds without the user touching the phone. ~45 seconds. **This is the moment.**
5. After-session screen: pulse sparkline, three-option reflection.

The two beats — _manual softening_ then _automatic softening_ — narrate the two-layer design without anyone having to explain it. The pitch deck can stay quiet while the app speaks.

## Brand

Wordmark is **English-only** in both EN and HE interfaces. It is a logo, not a translated string.

```
     h e a r ◯           the O is the breathing circle from the
                         session screen. logo and central interaction
                         share the same shape.
```

The wordmark reads as **hear + O**, not Hero. The O is graphically the breathing circle. We deliberately avoid any reading that lands on "hero" because of the persona's relationship to that word (see persona constraints).

## Words we use / don't

Applies to every surface — screen copy, notifications, marketing, pitch deck.

```
                       use                    do not use
session             →  "today's moment"    ✗  "treatment"
trigger sound       →  (do not name it)    ✗  "trigger"
exposure            →  "practice"          ✗  "therapy"
heart rate          →  "your pulse"        ✗  "biometrics"
condition           →  (never mention)     ✗  "PTSD", "disorder"
the user            →  "you"               ✗  "the patient", "user"
```

## Crisis access

A _need someone to talk to right now?_ sheet is reachable from every screen via a small **i** glyph. The `i` reads as info/accessibility, not alarm — alarming UI in a crisis moment is itself activating. The sheet headline does not use the words _crisis_, _panic_, _emergency_, or _help_ — the user knows why they tapped.

Primary action: **call ERAN 1201** (ער"ן — Israel's free, 24/7, anonymous emotional first-aid hotline). Secondary action: a _person you trust_ shortcut into the user's nominated contacts.

Visual layout in [`docs/FRONTEND.md`](./docs/FRONTEND.md#crisis-sheet).

## Languages

- Locale detected at launch. Hebrew device → Hebrew UI + RTL layout. Otherwise English.
- Fallback for non-EN/non-HE devices: **Hebrew** (the demo audience is Israeli).
- Wordmark stays English in both — it is a logo, not text.

Technical implementation (i18n, RTL, fonts) lives in [`docs/FRONTEND.md`](./docs/FRONTEND.md#bilingual--rtl).

## Architecture

The app is a **monolithic frontend** (React Native + Expo) talking directly to **Supabase** for persistence and auth. No Node/Express service layer in between. Anything the app needs to store or read remotely — user profile, scene selection, session history, intensity-ceiling memory — goes through the Supabase client. Anything purely local (UI state, the pulse curve while a session is running, the audio playback engine, the breathing animation) stays on device.

This shifts a few things:

- There's no REST API to document; the data contract lives in the Supabase schema.
- The content-provisioning adapter ([`src/lib/content/content.ts`](./src/lib/content/content.ts)) is the seam where local fallback data gets replaced by Supabase reads when the schema lands. Every site we'll need to migrate is marked `TODO(supabase)` in code.
- The Apple Watch HealthKit stream stays on-device and is not posted to Supabase — pulse stays private unless the user explicitly shares a session.

## Android release CI

The GitHub Actions workflow at [`.github/workflows/android-play-publish.yml`](./.github/workflows/android-play-publish.yml) builds a production Android App Bundle with EAS and auto-submits it to Google Play using the `production` profile in [`eas.json`](./eas.json). It runs manually from GitHub Actions or when a tag matching `android-v*` is pushed.

Required GitHub configuration:

- Secret `EXPO_TOKEN`: an Expo access token for the account or organization that owns the EAS project.

The Android package (`com.techheal.hearo`) and linked EAS project ID are committed in [`app.json`](./app.json) so the workflow can run non-interactively.

One-time release setup:

- Initialize EAS and run a successful Android production build locally once so signing credentials exist for the package.
- Upload the Google Play service account key in EAS credentials for the Android production package.
- Upload the first release manually in Google Play Console before relying on API submissions.

The committed submit profile publishes to the Google Play `production` track with `releaseStatus: completed`. Change `eas.json` to `internal`, `alpha`, or `beta` if the pipeline should publish to a testing track instead.

## Assets needed

To go from scaffold to demo-ready, these need to be produced (out of frontend scope to create, in scope to integrate):

```
sounds/
  ambient/
    river-path.mp3        ~6 min loop
    city-evening.mp3      ~6 min loop
    cafe-morning.mp3      ~6 min loop
    quiet-road.mp3        ~6 min loop
  triggers/
    motorcycle.mp3        ~3-5 sec
    helicopter.mp3        ~3-5 sec
    fireworks.mp3         ~3-5 sec
    siren.mp3             ~3-5 sec
    car-backfire.mp3      ~3-5 sec
    shouting.mp3          ~3-5 sec
voice/
  en/                     pre-recorded English narration lines,
                          ~12-15 lines per scene, two scripts
                          per scene (calm + post-trigger calming)
  he/                     same, in Hebrew
```

Until real assets land, screens use silence stubs so the app runs end-to-end.

## Open questions

- **Wordmark final form.** Direction is _hear + O_ with O = breathing circle. Final graphic file needs to be locked before any pixel-level brand work.
- **Watch companion app.** Out of frontend scope for this hackathon. Watch acts as a sensor only, no UI on the wrist.
- **AI voice generation pipeline.** If we want voice lines generated rather than human-recorded, that's a backend decision (ElevenLabs, Hume, etc.) — current spec assumes pre-recorded human or pre-generated clips.

## Credits

Icons by [Streamline](https://www.streamlinehq.com/) — `arrow-right` and `navigation-menu` from the [Ultimate free set](https://icon-sets.iconify.design/streamline-ultimate/), used under the [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/). The `arrow-left` icon is the right-arrow flipped horizontally; the `close` (X) icon is a small custom SVG drawn in Streamline's stroke style (1.5px, rounded caps) because the free set has no thin X.

## What's intentionally out of scope for the hackathon

- Onboarding longer than 3 screens
- Streaks, achievements, gamification
- Social/sharing features
- Multi-device sync
- A clinician-facing dashboard
- Push notifications beyond the daily reminder
- A real account system (single local profile for the demo)
