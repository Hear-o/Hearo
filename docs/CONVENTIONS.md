---
title: Frontend code conventions
tags: [code, conventions, stack, frontend-dev]
audience: frontend-dev
status: stable
---

# HearO frontend conventions

Conventions for the React Native (Expo) UI. Sister doc: [`FRONTEND.md`](./FRONTEND.md) for visual design and screen specs.

The app is a **monolithic frontend** talking directly to **Supabase**. There is no backend service layer. Anything that needs to persist beyond the device goes through the Supabase client; everything else stays local.

## 1. Tech stack

| Concern | Library | Status |
|---|---|---|
| Runtime | Expo SDK 54 (managed) | in use |
| Language | TypeScript strict | in use |
| Routing | Expo Router (file-based) | in use |
| Styling | NativeWind (Tailwind) + scoped `StyleSheet` | in use |
| Animations | `react-native-reanimated` | in use |
| Database + auth + storage | `@supabase/supabase-js` | planned (no schema yet) |
| Remote-data caching / mutations | `@tanstack/react-query` v5 wrapping the Supabase client | planned |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` | planned |
| Validation schemas | `zod` | planned |
| i18n | `i18next` + `react-i18next` | in use |
| Date | `date-fns` | planned |
| Errors | `@sentry/react-native` | planned |
| Analytics | `posthog-react-native` | planned |
| Icons | hand-bundled SVGs via `react-native-svg-transformer` | in use (Streamline + custom) |
| Charts | `victory-native` or `react-native-svg-charts` | only if we need them |
| Linting | `eslint` + `@react-native/eslint-config` | planned |
| Formatting | Prettier | planned |
| Audio | `react-native-audio-api` (Software Mansion) | in use — requires a native dev build (no sandboxed runner) |
| Video | `expo-video` | planned (scene loops, asset-blocked) |

## 2. Folder structure

Under `src/`:

```
src/
├── app/             Expo Router screens (file-based)
├── components/
│   ├── features/    feature-scoped components (one folder per feature)
│   │   └── <feature>/
│   │       ├── Screen.tsx       top-level screen
│   │       ├── Card.tsx         presentational
│   │       ├── Constants.ts     feature-local constants
│   │       └── index.ts         public exports
│   └── common/      shared low-level components (Icon.tsx wrapper + SVGs)
├── contexts/        React contexts (when used — see §6)
├── hooks/           custom hooks, one per feature/concern (see §4)
├── lib/             framework-agnostic code, grouped by domain:
│   ├── audio/       audio engine + asset cache
│   ├── content/     content provisioning seam (scenes, sounds, voice scripts)
│   ├── storage/     AsyncStorage wrapper + Zustand stores (crisis, session)
│   ├── integrations/native-module wrappers (HealthKit, pulse, reminders, contacts)
│   └── ui/          design tokens, i18n, display-name resolver, time-of-day helpers
├── generated/       auto-generated Supabase types (database.types.ts), planned
├── types/           shared TypeScript types
├── config/          config constants (URLs, feature-flag defaults)
├── styles/          design tokens + theme (today: lib/ui/tokens.ts)
├── locales/<lang>/  i18n string files (today: inlined in lib/ui/i18n.ts; split when features grow)
└── utils/           pure utility functions
```

Rules:

- **Feature folders are the unit of organization.** New feature → new folder under `features/`. Don't scatter feature code across `components/`, `hooks/`, etc. Cross-cutting hooks (`useAuth`, `useOrganization`) go in top-level `hooks/`.
- **No barrel files at the root** — only inside each feature folder via its `index.ts`.
- **Imports use absolute paths** (`@/components/features/sat/SatUserCard`), not deep relative paths. Aliases are configured in `tsconfig.json` and Metro.

## 3. Design tokens

Centralize tokens in `src/lib/ui/tokens.ts` — migrating to `src/styles/theme.ts` is fine when the surface grows.

Token scales to define:

- **Colors** — semantic names: `bg`, `text`, `accent`, `critical`, `sage`. See [`FRONTEND.md#palette`](./FRONTEND.md#palette) for the canonical palette and rationale.
- **Spacing** — 4px-based scale: 1=4, 2=8, 3=12, 4=16, 6=24, 8=32, 12=48, 16=64.
- **Typography** — token names, not raw sizes: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`. Define font family, weight, line-height per token.
- **Radii** — `sm`, `md`, `lg`, `full`.
- **Shadows** — `xs`, `sm`, `md`, `lg`. On RN this means explicit `elevation` (Android) + `shadowColor/Offset/Opacity` (iOS).

Rules:

- **Never hardcode hex or px in components.** Always reference tokens.
- **Light mode default**, dark mode optional. Plan dark from day one.

## 4. Hooks conventions

Top-level `hooks/` holds one hook per feature or concern, naming pattern `useXxx`:

- Server state via TanStack Query, wrapping the auto-generated API client (`useOrganization`, `useUsers`, etc.).
- Auth + session: `useAuth`, `useAppStatus`.
- Analytics: `useAnalytics`.
- Feature-specific data hooks: `useSatApi`, `useLeaks`, etc.
- Feature flags: `useAsatFeatureFlag`.

Rules:

- **One hook per file**, named after the file (`useSatApi.ts` exports `useSatApi`).
- **Wrap the generated API client in a hook** — don't call it directly from components. The hook owns query-key shape, error handling, cache invalidation.
- **No business logic in components** that belongs in a hook.

## 5. Data layer — Supabase

The schema in Supabase is the source of truth for types. There is no REST API and no OpenAPI codegen.

Pattern:

1. Schema lives in Supabase (Postgres tables + RLS policies, plus the auth and storage schemas Supabase manages itself).
2. Generate typed clients with `supabase gen types typescript --project-id <id> > src/generated/database.types.ts`. Run via `npm run generate:types` whenever the schema changes.
3. The Supabase client is initialized once in `src/lib/supabase.ts` (with `AsyncStorage` for session persistence and `react-native-url-polyfill/auto`).
4. Feature hooks wrap query/mutation calls — e.g. `useScenes()` wraps `supabase.from('scenes').select('*')` in a TanStack Query hook with the right query key.
5. Components consume the feature hooks, never the Supabase client directly.

Rules:

- **Don't hand-write database row types.** If a type isn't in `database.types.ts`, the schema doesn't define it — add it in Supabase first.
- **`generated/database.types.ts` is read-only.** Regenerate after every schema change; commit the regen alongside the consumer change.
- **All queries through feature hooks.** No `supabase.from(...)` in component bodies — the hook owns query keys, error handling, optimistic updates.
- **Row-Level Security is the auth boundary.** Don't filter by user ID in client code as the security check; rely on RLS policies. Client-side `eq('user_id', auth.uid())` is a UX hint, not a security guarantee.

## 6. State management

- **Remote state → TanStack Query wrapping the Supabase client** (every read/write goes through a hook).
- **URL / route state → Expo Router navigation params**.
- **Cross-cutting client state → React Context** (auth session, theme). One context per concern, providers composed at app root.
- **Zustand is allowed where Context creates re-render storms or feels overkill.** We currently use it in `lib/storage/session-store.ts`, `lib/storage/crisis-store.ts` — small slices that several disconnected components subscribe to. Default to Context unless there's a concrete reason; reach for Zustand only when measured.
- **No Redux, no MobX.**

## 7. Forms

Pattern: `react-hook-form` + `zod` schema via `@hookform/resolvers`.

```ts
const schema = z.object({
  email: z.string().email(),
  clientAmount: z.number().int().positive(),
});

const { register, handleSubmit, formState: { errors } } =
  useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
```

Rules:

- All forms use this stack. No ad-hoc `useState` juggling for form state.
- Schema defines required-ness, not the UI — required asterisk in the label is derived from `schema.shape[field]._def.typeName !== 'ZodOptional'`.
- Server-side validation mirrors the schema. Don't trust the client.
- Submit blocked until valid — disable the submit button until `formState.isValid`.

## 8. i18n

`react-i18next` with locale files in `src/locales/<lang>/`. One JSON file per feature (`sat.json`, `leaks.json`, `auth.json`). Keys nested by feature subcomponent.

Rules:

- **No hardcoded user-facing strings.** Every visible string lives in a locale file. Catalog content (scene labels, voice scripts) lives in `lib/content/content.ts`, not i18n — the adapter owns its own bilingual fields.
- **No string interpolation in JSX with `${}`** — use i18next interpolation: `t('sat.welcome', { name: user.name })`.
- **Hebrew is a first-class language**, not an afterthought. RTL is handled via `I18nManager.forceRTL` at app start.

## 9. Analytics + errors

- PostHog for product analytics. Every user-meaningful action gets an event. Wrap PostHog in `useAnalytics()` so swap-out is one place.
- Sentry for errors. Wrap the app in an `ErrorBoundary` + global error handler. Distinct DSN per environment.

Rules:

- Identify the user post-login: `posthog.identify(userId, props)` + `group('organization', orgId, { name })` so sessions tag correctly.
- **No PII in event properties beyond user ID + org ID.**
- **Crisis-access taps MUST NOT be logged.** Spec requirement from [`../openspec/specs/crisis-access/spec.md`](../openspec/specs/crisis-access/spec.md): "the backend MUST never be informed when the crisis sheet is opened." Analytics wrappers must explicitly skip these events.

## 10. Naming & style

- **Files:** PascalCase for components (`SatUserCard.tsx`), camelCase for hooks/utils (`useSatApi.ts`, `formatDate.ts`), kebab-case for configs/scripts (`.eslintrc.js`).
- **Components:** PascalCase, descriptive (`SatUserDrawer` not `Drawer`).
- **Hooks:** `useXxx`, named after what they return.
- **Constants:** SCREAMING_SNAKE for true constants, camelCase for config-y things.
- **Imports:** absolute via `@/`, sorted (external → internal → relative).
- **No default exports for components in shared libs** — makes refactors easier. Page entry points (Expo Router screens) can use default exports if the router demands it.

## 11. TypeScript

- `strict = true`. No `any` without a comment explaining why.
- Generated types are the source of truth for API shapes.
- Discriminated unions over `if (typeof === ...)` for state machines.
- `noUncheckedIndexedAccess: true` — catches a class of bugs around array/object lookups.

## 12. Testing

- **Unit:** Jest + React Testing Library (native) for pure logic + hooks.
- **E2E:** Maestro or Detox.
- **No tests for trivial getters or pure UI.** Test logic, hooks, and critical user flows.

## 13. Day-one checklist for a new feature

- [ ] Feature folder under `src/components/features/<name>/`
- [ ] Locale file at `src/locales/<lang>/<name>.json`
- [ ] Supabase tables + RLS policies in place for the feature's data, types regenerated, hook wrapper in `src/hooks/use<Name>.ts`
- [ ] Tokens used for every color/space/radius
- [ ] Forms (if any) use `react-hook-form` + `zod`
- [ ] User-meaningful actions wired through `useAnalytics()`
- [ ] Hebrew strings present for every English string

## 13a. Cutting a dev build

All on-device work runs against a native build — no sandboxed runner. The relevant native modules are:

- **`react-native-audio-api`** (audio engine) — Software Mansion native module; the entire session screen depends on it.
- **`@kingstinct/react-native-healthkit`** (HealthKit) — needs the HealthKit entitlement + a paired Apple Watch to read real samples.
- Anything else that adds a config-plugin which mutates `Info.plist`, the entitlements file, or the Podfile.

Cut a dev build with:

```bash
# local
npx expo run:ios            # or run:android

# cloud (EAS)
eas build --profile development --platform ios
```

Install the resulting `.ipa` via TestFlight or the Expo orbit "install on device" flow. Re-cut whenever native config (plist keys, entitlements, native deps) changes — JS-only changes don't need a rebuild.

## 14. Current state vs. aspiration

The conventions above are the target. As of the last commit, HearO is partly there:

- **In place:** Expo Router, TypeScript strict, NativeWind, tokens in `lib/ui/tokens.ts`, i18n with EN+HE in `lib/ui/i18n.ts`, Reanimated, Zustand stores under `lib/storage/`, content adapter in `lib/content/content.ts` (local data today, Supabase queries tomorrow), `react-native-audio-api` engine in `lib/audio/`, native-module wrappers in `lib/integrations/`, Streamline icons via SVG transformer, feature folders under `components/features/<name>/` with `common/` for shared primitives like `Icon`.
- **Not yet:** Supabase client + schema + generated types, TanStack Query wrapping the client, forms (no form screens exist), Sentry, PostHog, formal `src/styles/` and `src/locales/` splits (still inlined while the surface is small).

Adopt the structure as new features land; don't refactor purely for the sake of it.
