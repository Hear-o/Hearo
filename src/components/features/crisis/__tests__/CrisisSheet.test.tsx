import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

// expo-contacts is an ES-class native module that doesn't transpile under
// jest-expo. Use the shared manual mock so the Tier-1 tests get a stub and the
// picker-flow tests can drive granted permission + candidate lists per-test.
// Mock the new v56 Contact-class API. See trustedContacts.ts comment for the
// migration rationale (legacy stubs throw at runtime, so we use the new
// surface: Contact.presentPicker + new Contact(id).getDetails).
jest.mock("expo-contacts", () =>
  require("../../../../../test/mocks/expo-contacts"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as contactsMock from "../../../../../test/mocks/expo-contacts";
import { CrisisSheet } from "../CrisisSheet";
import { CRISIS_NUMBER, useCrisisStore } from "@/lib/storage/crisis-store";

async function renderOpenSheet() {
  render(<CrisisSheet />);
  await waitFor(() => {
    expect(screen.getByText("Add someone  +")).toBeTruthy();
  });
}

// Tier 1 — safety-critical. This is the path a veteran in crisis walks: open the
// sheet, tap the hotline, reach ERAN. A wrong number, a dead button, or a state
// leak here is a real-world harm, so every branch gets a focused assert. The
// tel: target is built from CRISIS_NUMBER on purpose — it stays a tripwire that
// fails loudly if the hard-coded region number ever drifts.
describe("CrisisSheet", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    contactsMock.__reset(); // defaults: permission granted, empty contact list
    useCrisisStore.setState({ isOpen: true });
  });

  it("dials EXACTLY tel:1201 when the call line is pressed", async () => {
    const openURL = jest
      .spyOn(require("react-native").Linking, "openURL")
      .mockResolvedValue(undefined);

    await renderOpenSheet();

    // v1.1.7: "Call ERAN" + "1201" is now the ERAN brand logo (image) with
    // the number rendered below. The whole block is one Pressable with an
    // accessibility label of "Call <number>" — match by label so the test
    // doesn't depend on which child Text is tapped.
    fireEvent.press(screen.getByLabelText(`Call ERAN ${CRISIS_NUMBER}`));

    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith(`tel:${CRISIS_NUMBER}`);
    // Belt-and-suspenders tripwire: the literal target, spelled out.
    expect(openURL).toHaveBeenCalledWith("tel:1201");

    openURL.mockRestore();
  });

  it("closes when the Close action is pressed", async () => {
    await renderOpenSheet();

    fireEvent.press(screen.getByText("Close"));

    expect(useCrisisStore.getState().isOpen).toBe(false);
  });

  it("closes when the backdrop 'close crisis support' pressable is pressed", async () => {
    await renderOpenSheet();

    fireEvent.press(screen.getByLabelText("close crisis support"));

    expect(useCrisisStore.getState().isOpen).toBe(false);
  });

  it("renders the title and the ERAN affordance while open", async () => {
    await renderOpenSheet();

    // v1.1.10: "Free, 24/7" subtitle removed with the logo-only redesign.
    // Title + tappable ERAN logo (found by its accessibility label) are
    // the load-bearing surfaces now.
    expect(
      screen.getByText("Need someone\nto talk to\nright now?"),
    ).toBeTruthy();
    expect(screen.getByLabelText(`Call ERAN ${CRISIS_NUMBER}`)).toBeTruthy();
  });

  // ── Trusted-contact picker flow ──────────────────────────────────────────
  // The picker is now the native iOS contact picker (Contact.presentPicker),
  // so there's no in-sheet candidate list to assert on. Tests drive the mock's
  // presentPicker return value + getDetails to simulate the user choosing a
  // contact in the native sheet.

  it("adds a contact to the trusted list when the native picker returns one", async () => {
    contactsMock.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    contactsMock.presentPicker.mockResolvedValue({ id: "c1" });
    contactsMock.getDetails.mockResolvedValue({
      fullName: "Dana",
      phones: [{ label: "mobile", number: "0501112222" }],
    });

    await renderOpenSheet();
    fireEvent.press(screen.getByText("Add someone  +"));

    // Native picker returned, contact resolved via getDetails, name appears
    // in the trusted-contacts section back on the main view.
    await waitFor(() => expect(screen.getByText("Dana")).toBeTruthy());
  });

  it("requests permission before opening the picker when undetermined", async () => {
    contactsMock.getPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    contactsMock.requestPermissionsAsync.mockResolvedValue({ status: "granted" });
    contactsMock.presentPicker.mockResolvedValue({ id: "c2" });
    contactsMock.getDetails.mockResolvedValue({
      fullName: "Eli",
      phones: [{ number: "0539998888" }],
    });

    await renderOpenSheet();
    fireEvent.press(screen.getByText("Add someone  +"));

    expect(contactsMock.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText("Eli")).toBeTruthy());
  });

  it("does nothing when the user cancels the native picker", async () => {
    contactsMock.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    contactsMock.presentPicker.mockResolvedValue(null);

    await renderOpenSheet();
    fireEvent.press(screen.getByText("Add someone  +"));

    // Wait for the picker promise to resolve, then confirm no Dana / Eli /
    // any new name appeared, and the add affordance is still there.
    await waitFor(() => expect(contactsMock.presentPicker).toHaveBeenCalled());
    expect(screen.getByText("Add someone  +")).toBeTruthy();
  });

  it("shows no trusted section or add button when permission is denied", async () => {
    contactsMock.getPermissionsAsync.mockResolvedValue({ status: "denied" });

    render(<CrisisSheet />);
    // The hotline is always reachable...
    await waitFor(() =>
      expect(screen.getByLabelText(`Call ERAN ${CRISIS_NUMBER}`)).toBeTruthy(),
    );
    // ...but with contacts denied, the picker affordance is hidden.
    expect(screen.queryByText("Add someone  +")).toBeNull();
  });
});
