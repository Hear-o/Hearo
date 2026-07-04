## Why

The crisis sheet's secondary action — *a person you trust* — currently routes to a "you'll be able to add trusted contacts soon" stub. The `crisis-access` spec already calls out that this is a v1 stub. Now we implement it for real using `expo-contacts` so the path actually goes somewhere when a user in crisis taps it.

## What Changes

- The user can nominate a small set of trusted contacts (target: up to 5) from their phone's address book, behind an Apple Contacts permission ask.
- Nomination happens out of the crisis sheet — first tap of *a person you trust* with no contacts configured opens a small flow to add one. Tapping again with contacts configured shows the list.
- The list itself opens the system phone dialer (`tel:`) on tap. The app never places the call itself.
- Stored locally only (via the existing `lib/storage.ts` seam). No backend. No telemetry on which contact gets called or how often.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `crisis-access` — the existing requirement "Secondary trusted-contact action" mentions both a configured-contacts path and a stub fallback. This change tightens the configured path: the source of contacts is the device address book, not a custom in-app contact CRM. New requirements added for the permission model and the privacy stance (no backend logging of trusted-contact actions, same as the ERAN-call stance).

## Impact

- **New dependency**: `expo-contacts`.
- **New file**: `src/lib/trustedContacts.ts` — wraps `expo-contacts`, exposes `getTrustedContacts()`, `addTrustedContact(contactId)`, `removeTrustedContact(contactId)`. Backed by the existing `lib/storage.ts`.
- **Edited**: `src/components/CrisisSheet.tsx` to render the configured-contacts list when present, the add-contact flow when empty.
- **New UI**: a small contact-picker modal inside the crisis sheet (so the user never leaves the crisis context to set this up — important for someone reaching for the feature during distress).
- **app.json**: adds the `NSContactsUsageDescription` (iOS) explaining why we want contacts access. Copy is privacy-forward: "We use this so you can quickly call someone you trust during a crisis moment. Your contacts stay on your device — we don't upload them."
- **No backend** changes. Stays consistent with `crisis-access`'s no-telemetry stance.
