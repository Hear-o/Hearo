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
});
