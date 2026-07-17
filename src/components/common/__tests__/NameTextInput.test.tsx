import { render, screen, fireEvent } from "@testing-library/react-native";

import { NameTextInput } from "../NameTextInput";

// Shared by Permissions and Settings — the contract: it renders the current
// value, reports typed changes, and reports blur so the caller can persist.
describe("NameTextInput", () => {
  it("renders the current value and reports changes", () => {
    const onChangeText = jest.fn();
    render(<NameTextInput value="Omer" onChangeText={onChangeText} onBlur={() => {}} />);
    const input = screen.getByDisplayValue("Omer");
    fireEvent.changeText(input, "Dana");
    expect(onChangeText).toHaveBeenCalledWith("Dana");
  });

  it("calls onBlur when the field loses focus", () => {
    const onBlur = jest.fn();
    render(<NameTextInput value="" onChangeText={() => {}} onBlur={onBlur} />);
    fireEvent(screen.getByDisplayValue(""), "blur");
    expect(onBlur).toHaveBeenCalled();
  });
});
