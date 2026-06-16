// expo-contacts can't be imported under jest-expo (ES-class native module).
// Use the shared manual mock and drive its return values per-test.
jest.mock("expo-contacts", () =>
  require("../../../../test/mocks/expo-contacts"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as contactsMock from "../../../../test/mocks/expo-contacts";
import { getTrustedContactIds, setTrustedContactIds } from "@/lib/storage/storage";
import {
  MAX_CONTACTS,
  addTrustedContact,
  getPermissionState,
  presentContactPicker,
  removeTrustedContact,
  requestPermission,
  resolveContact,
  resolveTrustedContacts,
} from "@/lib/integrations/trustedContacts";

beforeEach(async () => {
  await AsyncStorage.clear();
  contactsMock.__reset();
});

describe("trustedContacts / permissions", () => {
  it("reads the current permission state from the OS", async () => {
    contactsMock.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    expect(await getPermissionState()).toBe("granted");
  });

  it("requests permission and returns the resulting state", async () => {
    contactsMock.requestPermissionsAsync.mockResolvedValue({ status: "denied" });
    expect(await requestPermission()).toBe("denied");
  });
});

describe("trustedContacts / addTrustedContact", () => {
  it("adds a new id, most-recently-added first", async () => {
    await setTrustedContactIds(["a"]);
    expect(await addTrustedContact("b")).toEqual({ ok: true });
    expect(await getTrustedContactIds()).toEqual(["b", "a"]);
  });

  it("rejects a duplicate without touching the list", async () => {
    await setTrustedContactIds(["a"]);
    expect(await addTrustedContact("a")).toEqual({ ok: false, reason: "duplicate" });
    expect(await getTrustedContactIds()).toEqual(["a"]);
  });

  it(`rejects once the list is full (${MAX_CONTACTS})`, async () => {
    await setTrustedContactIds(["1", "2", "3", "4", "5"]);
    expect(await addTrustedContact("6")).toEqual({ ok: false, reason: "full" });
    expect(await getTrustedContactIds()).toHaveLength(MAX_CONTACTS);
  });
});

describe("trustedContacts / removeTrustedContact", () => {
  it("removes the given id and preserves order", async () => {
    await setTrustedContactIds(["a", "b", "c"]);
    await removeTrustedContact("b");
    expect(await getTrustedContactIds()).toEqual(["a", "c"]);
  });
});

describe("trustedContacts / resolveContact", () => {
  it("returns null when the OS has no record for the id", async () => {
    contactsMock.getDetails.mockResolvedValue(null);
    expect(await resolveContact("x")).toBeNull();
  });

  it("returns null when the contact has no phone numbers", async () => {
    contactsMock.getDetails.mockResolvedValue({ fullName: "A", phones: [] });
    expect(await resolveContact("x")).toBeNull();
  });

  it("prefers a mobile number and strips whitespace", async () => {
    contactsMock.getDetails.mockResolvedValue({
      fullName: "Omer",
      phones: [
        { label: "home", number: "02 111 1111" },
        { label: "mobile", number: "050 222 3333" },
      ],
    });
    expect(await resolveContact("c1")).toEqual({
      id: "c1",
      name: "Omer",
      phone: "0502223333",
    });
  });

  it("falls back to the first number when none is labelled mobile", async () => {
    contactsMock.getDetails.mockResolvedValue({
      fullName: "Noa",
      phones: [{ number: "03 1234567" }], // label undefined → label ?? "" branch
    });
    expect(await resolveContact("c2")).toEqual({
      id: "c2",
      name: "Noa",
      phone: "031234567",
    });
  });

  it("uses the phone as the display name when the contact has no name", async () => {
    contactsMock.getDetails.mockResolvedValue({
      phones: [{ label: "mobile", number: "0501112222" }],
    });
    expect(await resolveContact("c3")).toEqual({
      id: "c3",
      name: "0501112222",
      phone: "0501112222",
    });
  });

  it("returns null when the chosen phone entry has no number", async () => {
    contactsMock.getDetails.mockResolvedValue({
      fullName: "X",
      phones: [{ label: "mobile" }], // number undefined → null
    });
    expect(await resolveContact("c4")).toBeNull();
  });

  it("returns null and swallows OS errors", async () => {
    contactsMock.getDetails.mockRejectedValue(new Error("permission revoked"));
    expect(await resolveContact("c5")).toBeNull();
  });
});

describe("trustedContacts / resolveTrustedContacts", () => {
  it("resolves all stored ids and skips ones that don't resolve", async () => {
    await setTrustedContactIds(["good", "bad"]);
    contactsMock.getDetails.mockImplementation(async (id: string) =>
      id === "good"
        ? { fullName: "G", phones: [{ label: "mobile", number: "0500000000" }] }
        : null,
    );
    expect(await resolveTrustedContacts()).toEqual([
      { id: "good", name: "G", phone: "0500000000" },
    ]);
  });
});

describe("trustedContacts / presentContactPicker", () => {
  it("returns null when the user cancels the native picker", async () => {
    contactsMock.presentPicker.mockResolvedValue(null);
    expect(await presentContactPicker()).toBeNull();
  });

  it("resolves the picked contact through getDetails", async () => {
    contactsMock.presentPicker.mockResolvedValue({ id: "c9" });
    contactsMock.getDetails.mockResolvedValue({
      fullName: "Maya",
      phones: [{ label: "mobile", number: "0509999999" }],
    });
    expect(await presentContactPicker()).toEqual({
      id: "c9",
      name: "Maya",
      phone: "0509999999",
    });
  });

  it("returns null when the picked contact has no phone", async () => {
    contactsMock.presentPicker.mockResolvedValue({ id: "c9" });
    contactsMock.getDetails.mockResolvedValue({ fullName: "Maya", phones: [] });
    expect(await presentContactPicker()).toBeNull();
  });

  it("swallows native errors and returns null", async () => {
    contactsMock.presentPicker.mockRejectedValue(new Error("picker error"));
    expect(await presentContactPicker()).toBeNull();
  });
});
