// Shared manual mock for `expo-contacts`.
//
// expo-contacts ships an ES-class native module whose superclass is undefined
// under jest-expo ("Super expression must either be null or a function"), so it
// cannot be auto-mocked or imported directly in a test. Suites opt in with:
//
//   jest.mock("expo-contacts", () => require("../../../test/mocks/expo-contacts"));
//   import * as contactsMock from "../../../test/mocks/expo-contacts";
//
// then configure return values per-test and call `contactsMock.__reset()` in a
// beforeEach to restore the baseline + clear call history.
//
// Mocks the v56 Contact-class API surface:
//   - getPermissionsAsync / requestPermissionsAsync (free functions)
//   - new Contact(id).getDetails([...fields]) (instance method)
//   - Contact.presentPicker() (static method, opens native picker)
//   - ContactField enum (string-valued, referenced by callers)

export const getPermissionsAsync = jest.fn();
export const requestPermissionsAsync = jest.fn();

// Static method captured here so tests can drive what the native picker
// "returned" (null = user cancelled, or a {id} record).
export const presentPicker = jest.fn();

// Instance.getDetails(fields) is called by new Contact(id).getDetails(...).
// We expose it as a configurable jest.fn so tests can choreograph what
// each ID resolution returns.
export const getDetails = jest.fn();

export class Contact {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
  async getDetails(fields?: string[]): Promise<unknown> {
    return getDetails(this.id, fields);
  }
  static presentPicker(): Promise<Contact | null> {
    return presentPicker();
  }
}

// Field enum the new code references by string value.
export const ContactField = {
  FULL_NAME: "fullName",
  PHONES: "phones",
} as const;

/** Restore baseline implementations and clear call history. Call in beforeEach. */
export function __reset(): void {
  getPermissionsAsync.mockReset().mockResolvedValue({ status: "granted" });
  requestPermissionsAsync.mockReset().mockResolvedValue({ status: "granted" });
  presentPicker.mockReset().mockResolvedValue(null);
  getDetails.mockReset().mockResolvedValue(null);
}
