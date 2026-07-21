import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SettingsSheet } from "../SettingsSheet";
import { useSettingsSheetStore } from "@/lib/storage/settings-sheet-store";
import { setDisplayName } from "@/lib/storage/storage";
import {
  clearSchedule,
  getSchedule,
  setSchedule,
} from "@/lib/integrations/reminders";

jest.mock("@/lib/integrations/reminders", () => ({
  getSchedule: jest.fn().mockResolvedValue(null),
  setSchedule: jest.fn().mockResolvedValue(undefined),
  clearSchedule: jest.fn().mockResolvedValue(undefined),
  configureNotificationHandler: jest.fn(),
  requestPermission: jest.fn(),
  reassertSchedule: jest.fn(),
}));

// The Settings watch row reuses the Permissions HealthKit flow; mock the module
// so tests don't touch the native pulse adapter.
jest.mock("@/lib/integrations/healthKit", () => ({
  getAuthorizationStatus: jest.fn().mockResolvedValue("undetermined"),
  requestAuthorization: jest.fn().mockResolvedValue("requested"),
}));

import * as healthKit from "@/lib/integrations/healthKit";

const mockGetSchedule = getSchedule as jest.Mock;
const mockSetSchedule = setSchedule as jest.Mock;
const mockClearSchedule = clearSchedule as jest.Mock;
const mockGetAuthStatus = healthKit.getAuthorizationStatus as jest.Mock;
const mockRequestAuth = healthKit.requestAuthorization as jest.Mock;

describe("SettingsSheet", () => {
  beforeEach(() => {
    useSettingsSheetStore.setState({ isOpen: false });
    mockGetSchedule.mockResolvedValue(null);
    mockSetSchedule.mockResolvedValue(undefined);
    mockClearSchedule.mockResolvedValue(undefined);
    mockGetAuthStatus.mockResolvedValue("undetermined");
    mockRequestAuth.mockResolvedValue("requested");
  });

  it("renders the settings sections when open", () => {
    useSettingsSheetStore.setState({ isOpen: true });
    render(<SettingsSheet />);
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Your name")).toBeTruthy();
    expect(screen.getByText("Daily reminder")).toBeTruthy();
  });

  it("re-syncs the name field from storage each time the sheet re-opens", async () => {
    // The sheet is an always-mounted overlay, not a routed screen, so
    // useNameDraft's own focus-based refresh never fires just from opening
    // it — this covers the explicit re-fetch-on-open added for that gap.
    await act(async () => {
      await setDisplayName("Dana");
    });
    useSettingsSheetStore.setState({ isOpen: true });
    render(<SettingsSheet />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("Dana")).toBeTruthy(),
    );

    act(() => {
      useSettingsSheetStore.setState({ isOpen: false });
    });
    await act(async () => {
      await setDisplayName("Omer");
    });
    act(() => {
      useSettingsSheetStore.setState({ isOpen: true });
    });

    await waitFor(() =>
      expect(screen.getByDisplayValue("Omer")).toBeTruthy(),
    );
  });

  it("renders (closed) without crashing when isOpen is false", () => {
    render(<SettingsSheet />);
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  // v1.1.6: reminder UI redesigned as a Switch + inline time picker. The
  // Switch is the headline on/off control; the previous Change/Turn-off pair
  // is gone (Android still has a Change link inside the picker block).
  it("shows 'Off' when no reminder is set, and the toggle is off", async () => {
    mockGetSchedule.mockResolvedValue(null);
    act(() => {
      useSettingsSheetStore.setState({ isOpen: true });
    });
    render(<SettingsSheet />);
    await waitFor(() => expect(screen.getByText(/Off/)).toBeTruthy());

    const toggle = screen.getByLabelText("Toggle daily reminder");
    expect(toggle.props.value).toBe(false);
  });

  it("turning the switch on schedules a default time and shows it", async () => {
    mockGetSchedule.mockResolvedValue(null);
    act(() => {
      useSettingsSheetStore.setState({ isOpen: true });
    });
    render(<SettingsSheet />);
    await waitFor(() => expect(screen.getByLabelText("Toggle daily reminder")).toBeTruthy());

    fireEvent(screen.getByLabelText("Toggle daily reminder"), "valueChange", true);
    await waitFor(() => {
      expect(mockSetSchedule).toHaveBeenCalledWith({ hour: 9, minute: 0 });
    });
    await waitFor(() => expect(screen.getByText(/09:00/)).toBeTruthy());
  });

  it("turning the switch off clears the schedule", async () => {
    mockGetSchedule.mockResolvedValue({ hour: 9, minute: 30 });
    act(() => {
      useSettingsSheetStore.setState({ isOpen: true });
    });
    render(<SettingsSheet />);
    await waitFor(() => expect(screen.getByText(/09:30/)).toBeTruthy());

    fireEvent(screen.getByLabelText("Toggle daily reminder"), "valueChange", false);
    await waitFor(() => expect(mockClearSchedule).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Off/)).toBeTruthy());
  });

  it("shows the watch connect row and connects via the HealthKit flow", async () => {
    act(() => {
      useSettingsSheetStore.setState({ isOpen: true });
    });
    render(<SettingsSheet />);
    const connect = await screen.findByText("Connect heart rate");

    fireEvent.press(connect);
    await waitFor(() => expect(mockRequestAuth).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText("✓  Connect heart rate")).toBeTruthy(),
    );
  });

  it("opens the iOS picker on toggle-on and dismisses it via Done", async () => {
    mockGetSchedule.mockResolvedValue(null);
    act(() => {
      useSettingsSheetStore.setState({ isOpen: true });
    });
    render(<SettingsSheet />);
    await waitFor(() => expect(screen.getByLabelText("Toggle daily reminder")).toBeTruthy());

    fireEvent(screen.getByLabelText("Toggle daily reminder"), "valueChange", true);
    // Picker opens → Done button visible.
    const done = await screen.findByText("Done");

    fireEvent.press(done);
    // Dismissed → Done gone, "change time" link back.
    await waitFor(() => expect(screen.queryByText("Done")).toBeNull());
    expect(screen.getByText("Change time")).toBeTruthy();
  });
});
