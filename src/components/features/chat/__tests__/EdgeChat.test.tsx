import { fireEvent, render } from "@testing-library/react-native";

import { EdgeChat } from "@/components/features/chat/EdgeChat";

const session = {
  ask: jest.fn(),
  askStreamCb: jest.fn(),
  reset: jest.fn(),
};

describe("EdgeChat", () => {
  beforeEach(() => {
    session.askStreamCb.mockReset();
    session.reset.mockReset();
  });

  it("streams a reply into the conversation", () => {
    session.askStreamCb.mockImplementation((_prompt, handler) => {
      handler.onToken("A calm reply.");
    });
    const screen = render(<EdgeChat session={session} />);

    fireEvent.changeText(screen.getByLabelText("Message"), "I need a moment");
    fireEvent.press(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("I need a moment")).toBeTruthy();
    expect(screen.getByText("A calm reply.")).toBeTruthy();
  });
});
