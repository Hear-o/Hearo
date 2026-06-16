// Trusted contacts — the crisis sheet's secondary action.
//
// The user nominates up to MAX_CONTACTS from their device address book.
// We store only their stable contact IDs (not names/numbers), and re-read
// the contact data from the OS at render time so updates in the user's
// phone book are reflected without sync logic.
//
// No backend. No telemetry on which contact gets called or when.
//
// Uses the v56 Contact class API (Contact.presentPicker, new Contact(id),
// contact.getDetails). The previous code used the legacy getContactsAsync
// path, which in expo-contacts >= v56 is exported as a deprecated stub
// that throws at runtime. The migration also lets us use the native iOS
// picker (Contact.presentPicker) instead of a custom in-sheet list —
// better UX, less code to maintain.

import {
  Contact,
  ContactField,
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-contacts";

import { getTrustedContactIds, setTrustedContactIds } from "@/lib/storage/storage";

export const MAX_CONTACTS = 5;

export type ResolvedContact = {
  id: string;
  name: string;
  phone: string;
};

export type PermissionState = "granted" | "denied" | "undetermined";

export async function getPermissionState(): Promise<PermissionState> {
  const { status } = await getPermissionsAsync();
  return status as PermissionState;
}

export async function requestPermission(): Promise<PermissionState> {
  const { status } = await requestPermissionsAsync();
  return status as PermissionState;
}

export { getTrustedContactIds };

export async function addTrustedContact(id: string): Promise<{ ok: boolean; reason?: "full" | "duplicate" }> {
  const ids = await getTrustedContactIds();
  if (ids.includes(id)) return { ok: false, reason: "duplicate" };
  if (ids.length >= MAX_CONTACTS) return { ok: false, reason: "full" };
  // Most-recently-added first.
  await setTrustedContactIds([id, ...ids]);
  return { ok: true };
}

export async function removeTrustedContact(id: string): Promise<void> {
  const ids = await getTrustedContactIds();
  await setTrustedContactIds(ids.filter((x) => x !== id));
}

type PhoneEntry = { label?: string | null; number?: string | null };

function pickPhone(phones: PhoneEntry[] | undefined): string | null {
  if (!phones || phones.length === 0) return null;
  // Prefer mobile, fall back to first.
  const mobile = phones.find((p) => /mobile/i.test(p.label ?? ""));
  const picked = (mobile ?? phones[0]).number ?? null;
  return picked ? picked.replace(/\s+/g, "") : null;
}

/** Look up the OS contact record for a stored ID. Returns null if the OS
 *  can't find it (deleted contact, revoked permission, etc.). */
export async function resolveContact(id: string): Promise<ResolvedContact | null> {
  try {
    const details = await new Contact(id).getDetails([
      ContactField.FULL_NAME,
      ContactField.PHONES,
    ]);
    if (!details) return null;
    const phone = pickPhone(details.phones as PhoneEntry[] | undefined);
    if (!phone) return null;
    return {
      id,
      name: details.fullName ?? phone,
      phone,
    };
  } catch {
    return null;
  }
}

/** Resolve all configured contacts at once, skipping any that don't resolve. */
export async function resolveTrustedContacts(): Promise<ResolvedContact[]> {
  const ids = await getTrustedContactIds();
  const resolved = await Promise.all(ids.map(resolveContact));
  return resolved.filter((c): c is ResolvedContact => c !== null);
}

/** Open the native iOS contact picker and resolve to the chosen contact's
 *  record (ID + name + first phone). Returns null if the user cancels or
 *  the chosen contact has no phone number. The native picker handles
 *  permission state internally, so callers don't need to gate on
 *  getPermissionState first — though we still surface permission UI for
 *  clarity in the crisis sheet. Failures (permission revoked between
 *  checks, OS errors, user cancel) all collapse to null. */
export async function presentContactPicker(): Promise<ResolvedContact | null> {
  try {
    const picked = await Contact.presentPicker();
    if (!picked) return null;
    return await resolveContact(picked.id);
  } catch {
    return null;
  }
}
