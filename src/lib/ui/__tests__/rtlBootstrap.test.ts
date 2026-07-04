import { Text as RNText } from "react-native";

import { bootstrapTextDirection } from "@/lib/ui/rtlBootstrap";

// bootstrapTextDirection installs a Text.defaultProps default so every Text
// in the app gets textAlign:"left" — under Fabric's RTL that mirrors to the
// visual reading start (right in Hebrew, left in English). Fabric's actual
// propagation is unreliable in production (which is why tokens + inline
// styles also carry textAlign explicitly), but the boot call itself must
// still run cleanly and set the expected default.
describe("rtlBootstrap", () => {
  const anyText = RNText as unknown as { defaultProps?: unknown };
  const originalDefaults = anyText.defaultProps;

  afterEach(() => {
    anyText.defaultProps = originalDefaults;
  });

  it("sets Text.defaultProps.style to include textAlign:'left'", () => {
    anyText.defaultProps = undefined;
    bootstrapTextDirection();
    const defaults = anyText.defaultProps as { style?: unknown } | undefined;
    expect(defaults).toBeDefined();
    // style is a tuple: [{ textAlign: "left" }, priorStyle]
    expect(Array.isArray(defaults?.style)).toBe(true);
    const styles = defaults!.style as Array<Record<string, unknown>>;
    const merged = Object.assign({}, ...styles.filter(Boolean));
    expect(merged.textAlign).toBe("left");
  });

  it("is idempotent — a second call preserves earlier defaults", () => {
    anyText.defaultProps = undefined;
    bootstrapTextDirection();
    const firstStyle = (anyText.defaultProps as { style?: unknown }).style;
    bootstrapTextDirection();
    const secondStyle = (anyText.defaultProps as { style?: unknown }).style;
    // Second call re-wraps; textAlign:"left" is still resolvable in the tuple
    expect(Array.isArray(secondStyle)).toBe(true);
    const merged = Object.assign(
      {},
      ...(secondStyle as Array<Record<string, unknown>>).flat(Infinity).filter(Boolean),
    );
    expect(merged.textAlign).toBe("left");
    // First tuple survives inside the second (nested)
    expect(JSON.stringify(secondStyle)).toContain(JSON.stringify(firstStyle));
  });
});
