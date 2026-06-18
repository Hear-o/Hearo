import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SettingsSheet } from "../SettingsSheet";
import { useSettingsSheetStore } from "@/lib/storage/settings-sheet-store";
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

const mockGetSchedule = getSchedule as jest.Mock;
const mockSetSchedule = setSchedule as jest.Mock;
const mockClearSchedule = clearSchedule as jest.Mock;

describe("SettingsSheet", () => {
  beforeEach(() => {
    useSettingsSheetStore.setState({ isOpen: false });
    mockGetSchedule.mockResolvedValue(null);
    mockSetSchedule.mockResolvedValue(undefined);
    mockClearSchedule.mockResolvedValue(undefined);
  });

  it("renders the settings sections when open", () => {
    useSettingsSheetStore.setState({ isOpen: true });
    render(<SettingsSheet />);
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Your name")).toBeTruthy();
    expect(screen.getByText("Daily reminder")).toBeTruthy();
  });

  it("renders (closed) without crashing when isOpen is false", () => {
    render(<SettingsSheet />);
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows 'Off' when no reminder is set, and opens the picker on Change", async () => {
    mockGetSchedule.mockResolvedValue(null);
    act(() => {
      useSettingsSheetStore.setState({ isOpen: true });
    });
    render(<SettingsSheet />);
    await waitFor(() => expect(screen.getByText(/Off/)).toBeTruthy());

    // No "Turn off" button when reminder is null.
    expect(screen.queryByText("Turn off")).toBeNull();

    fireEvent.press(screen.getByText("Change time"));
    // After Change is tapped, the iOS picker UI shows Done + Cancel buttons.
    await waitFor(() => {
      expect(screen.getByText("Done")).toBeTruthy();
      expect(screen.getByText("Cancel")).toBeTruthy();
    });
  });

  it("shows the existing reminder and turns it off", async () => {
    mockGetSchedule.mockResolvedValue({ hour: 9, minute: 30 });
    act(() => {
      useSettingsSheetStore.setState({ isOpen: true });
    });
    render(<SettingsSheet />);
    await waitFor(() => expect(screen.getByText(/09:30/)).toBeTruthy());

    fireEvent.press(screen.getByText("Turn off"));
    await waitFor(() => expect(mockClearSchedule).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("Turn off")).toBeNull());
  });
});
