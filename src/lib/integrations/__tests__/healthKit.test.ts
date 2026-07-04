// Under jest-expo the default platform is iOS, so a bare `@/lib/integrations/healthKit`
// import resolves to healthKit.ios.ts. We want the platform-agnostic fallback
// (web/Android), so require it by its explicit `.ts` filename to bypass the
// `.ios` platform-extension preference. healthKit.ios.ts is covered separately.
const {
  isAvailable,
  requestAuthorization,
  getAuthorizationStatus,
  subscribeHeartRate,
} = require("@/lib/integrations/healthKit.ts") as typeof import("@/lib/integrations/healthKit");

// The web/Android fallback adapter imports no native module — it hardcodes the
// "no HealthKit here" answers so the pulse hook falls through to its mock
// generator. These assertions lock that contract. The iOS real implementation
// lives in healthKit.ios.ts and is tested separately.
describe("healthKit (fallback adapter)", () => {
  it("reports HealthKit as unavailable", async () => {
    expect(await isAvailable()).toBe(false);
  });

  it("denies authorization requests", async () => {
    expect(await requestAuthorization()).toBe("denied");
  });

  it("reports authorization status as undetermined", async () => {
    expect(await getAuthorizationStatus()).toBe("undetermined");
  });

  it("returns a callable no-op unsubscribe and never emits a sample", () => {
    const onSample = jest.fn();
    const unsubscribe = subscribeHeartRate(onSample);
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
    expect(onSample).not.toHaveBeenCalled();
  });
});
