// Stable HealthKit mock object (survives the per-test jest.resetModules()).
const mockHealthKit = require("../../../../test/mocks/react-native-healthkit")
  .createReactNativeHealthKitMock();
jest.mock("@kingstinct/react-native-healthkit", () => ({
  __esModule: true,
  isHealthDataAvailable: mockHealthKit.isHealthDataAvailable,
  queryQuantitySamples: mockHealthKit.queryQuantitySamples,
  requestAuthorization: mockHealthKit.requestAuthorization,
}));

// Control the sticky-granted storage flag directly (no AsyncStorage needed).
const mockGetGranted = jest.fn();
const mockSetGranted = jest.fn();
jest.mock("@/lib/storage/storage", () => ({
  getHealthKitGranted: mockGetGranted,
  setHealthKitGranted: mockSetGranted,
}));

type HealthKitIos = typeof import("@/lib/integrations/healthKit.ios");
let hk: HealthKitIos;

beforeEach(() => {
  // Fresh module each test → resets `initialized` / `initPromise`.
  jest.resetModules();
  mockHealthKit.isHealthDataAvailable.mockReset();
  mockHealthKit.queryQuantitySamples.mockReset();
  mockHealthKit.requestAuthorization.mockReset();
  mockGetGranted.mockReset().mockResolvedValue(false);
  mockSetGranted.mockReset().mockResolvedValue(undefined);
  // Importing by the explicit `.ios` filename keeps resolution deterministic.
  hk = require("@/lib/integrations/healthKit.ios") as HealthKitIos;
});

describe("healthKit.ios / isAvailable", () => {
  it("returns false when HealthKit reports unavailable", async () => {
    mockHealthKit.isHealthDataAvailable.mockReturnValue(false);
    expect(await hk.isAvailable()).toBe(false);
    expect(mockHealthKit.requestAuthorization).not.toHaveBeenCalled();
  });

  it("initializes and returns true when available", async () => {
    mockHealthKit.isHealthDataAvailable.mockReturnValue(true);
    mockHealthKit.requestAuthorization.mockResolvedValue(true);

    expect(await hk.isAvailable()).toBe(true);
    expect(mockHealthKit.requestAuthorization).toHaveBeenCalledWith({
      toRead: ["HKQuantityTypeIdentifierHeartRate"],
    });
    expect(mockSetGranted).toHaveBeenCalledWith(true);
  });

  it("returns false when authorization fails even though HealthKit is available", async () => {
    mockHealthKit.isHealthDataAvailable.mockReturnValue(true);
    mockHealthKit.requestAuthorization.mockResolvedValue(false);

    expect(await hk.isAvailable()).toBe(false);
  });

  it("swallows a thrown native error and returns false", async () => {
    mockHealthKit.isHealthDataAvailable.mockImplementation(() => {
      throw new Error("native boom");
    });
    expect(await hk.isAvailable()).toBe(false);
  });

  // Covers the inner ensureInit() catch — distinct from the outer isAvailable
  // catch above. Reaches the catch by letting isHealthDataAvailable succeed
  // and rejecting from requestAuthorization itself.
  it("returns false when authorization itself rejects", async () => {
    mockHealthKit.isHealthDataAvailable.mockReturnValue(true);
    mockHealthKit.requestAuthorization.mockRejectedValue(new Error("auth boom"));
    expect(await hk.isAvailable()).toBe(false);
    expect(mockSetGranted).not.toHaveBeenCalled();
  });

  // Covers the `if (initialized) return true;` early-return on the second call —
  // first call sets `initialized`, second call short-circuits.
  it("short-circuits subsequent calls once initialized", async () => {
    mockHealthKit.isHealthDataAvailable.mockReturnValue(true);
    mockHealthKit.requestAuthorization.mockResolvedValue(true);
    expect(await hk.isAvailable()).toBe(true);
    expect(await hk.isAvailable()).toBe(true);
    expect(mockHealthKit.requestAuthorization).toHaveBeenCalledTimes(1);
  });
});

describe("healthKit.ios / requestAuthorization", () => {
  it("returns requested when the dialog completes (outcome unknown)", async () => {
    mockHealthKit.requestAuthorization.mockResolvedValue(true);
    expect(await hk.requestAuthorization()).toBe("requested");
  });

  it("returns denied when authorization fails", async () => {
    mockHealthKit.requestAuthorization.mockResolvedValue(false);
    expect(await hk.requestAuthorization()).toBe("denied");
  });

  it("deduplicates concurrent authorization attempts", async () => {
    let resolveAuthorization: ((granted: boolean) => void) | undefined;
    mockHealthKit.requestAuthorization.mockImplementation(
      () => new Promise<boolean>((resolve) => {
        resolveAuthorization = resolve;
      }),
    );

    const p1 = hk.requestAuthorization();
    const p2 = hk.requestAuthorization();
    expect(mockHealthKit.requestAuthorization).toHaveBeenCalledTimes(1);

    resolveAuthorization!(true); // resolve both callers
    expect(await p1).toBe("requested");
    expect(await p2).toBe("requested");
  });
});

describe("healthKit.ios / getAuthorizationStatus", () => {
  it("returns requested once initialized in-session", async () => {
    mockHealthKit.requestAuthorization.mockResolvedValue(true);
    await hk.requestAuthorization(); // sets initialized = true

    expect(await hk.getAuthorizationStatus()).toBe("requested");
  });

  it("returns requested from the sticky flag on a cold start", async () => {
    mockGetGranted.mockResolvedValue(true);
    expect(await hk.getAuthorizationStatus()).toBe("requested");
  });

  it("returns undetermined when never granted", async () => {
    mockGetGranted.mockResolvedValue(false);
    expect(await hk.getAuthorizationStatus()).toBe("undetermined");
  });
});

describe("healthKit.ios / subscribeHeartRate", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-08T12:00:00Z").getTime());
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("forwards new samples with rounded bpm on the first poll", async () => {
    const now = Date.now();
    const onSample = jest.fn();
    mockHealthKit.queryQuantitySamples.mockResolvedValue([
      { quantity: 90.4, endDate: new Date(now - 30_000) },
    ]);

    const unsubscribe = hk.subscribeHeartRate(onSample);
    await Promise.resolve();
    expect(onSample).toHaveBeenCalledWith({ bpm: 90, timestamp: expect.any(Number) });
    unsubscribe();
  });

  it("queries recent heart-rate samples with the expected options", async () => {
    const onSample = jest.fn();
    mockHealthKit.queryQuantitySamples.mockResolvedValue([]);

    const unsubscribe = hk.subscribeHeartRate(onSample);
    await Promise.resolve();

    const now = new Date("2026-06-08T12:00:00Z").getTime();
    expect(mockHealthKit.queryQuantitySamples).toHaveBeenCalledWith(
      "HKQuantityTypeIdentifierHeartRate",
      expect.objectContaining({
        ascending: true,
        limit: 20,
        unit: "count/min",
        filter: expect.objectContaining({
          date: expect.objectContaining({
            startDate: new Date(now - 60_000),
          }),
        }),
      }),
    );
    unsubscribe();
  });

  it("does not re-forward an already-seen sample", async () => {
    const now = Date.now();
    const onSample = jest.fn();
    const sample = { quantity: 88, endDate: new Date(now - 10_000) };
    mockHealthKit.queryQuantitySamples.mockResolvedValue([sample]);

    const unsubscribe = hk.subscribeHeartRate(onSample);
    await Promise.resolve();
    expect(onSample).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2000); // next poll, identical sample → skipped
    await Promise.resolve();
    expect(onSample).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("ignores errored poll results", async () => {
    const onSample = jest.fn();
    mockHealthKit.queryQuantitySamples.mockRejectedValue(new Error("read error"));

    const unsubscribe = hk.subscribeHeartRate(onSample);
    await Promise.resolve();
    expect(onSample).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("stops polling after unsubscribe", async () => {
    const now = Date.now();
    const onSample = jest.fn();
    mockHealthKit.queryQuantitySamples.mockResolvedValue([
      { quantity: 80, endDate: new Date(now - 5_000) },
    ]);

    const unsubscribe = hk.subscribeHeartRate(onSample);
    await Promise.resolve();
    onSample.mockClear();
    unsubscribe();

    jest.advanceTimersByTime(10_000);
    expect(onSample).not.toHaveBeenCalled();
  });

  it("drops a poll result that arrives after unsubscribe", async () => {
    let resolveSamples: ((samples: unknown[]) => void) | undefined;
    mockHealthKit.queryQuantitySamples.mockImplementation(
      () => new Promise<unknown[]>((resolve) => {
        resolveSamples = resolve;
      }),
    );
    const onSample = jest.fn();

    const unsubscribe = hk.subscribeHeartRate(onSample);
    unsubscribe(); // cancelled = true before the poll responds
    resolveSamples!([{ quantity: 80, endDate: new Date(Date.now()) }]);
    await Promise.resolve();

    expect(onSample).not.toHaveBeenCalled();
  });

  // Defensive: the Kingstinct types say endDate is a Date, but the native
  // bridge has been observed returning ISO strings on some paths. getEndDateMs
  // handles both. These tests exercise the non-Date branches.
  it("parses a string endDate by passing it through new Date()", async () => {
    const now = Date.now();
    const onSample = jest.fn();
    mockHealthKit.queryQuantitySamples.mockResolvedValue([
      { quantity: 92, endDate: new Date(now - 10_000).toISOString() },
    ]);

    const unsubscribe = hk.subscribeHeartRate(onSample);
    await Promise.resolve();
    expect(onSample).toHaveBeenCalledWith({ bpm: 92, timestamp: expect.any(Number) });
    unsubscribe();
  });

  it("skips a sample whose endDate fails to parse", async () => {
    const onSample = jest.fn();
    mockHealthKit.queryQuantitySamples.mockResolvedValue([
      { quantity: 75, endDate: "not-a-date" },
    ]);

    const unsubscribe = hk.subscribeHeartRate(onSample);
    await Promise.resolve();
    expect(onSample).not.toHaveBeenCalled();
    unsubscribe();
  });
});
