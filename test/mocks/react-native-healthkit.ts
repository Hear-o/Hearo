// Stable @kingstinct/react-native-healthkit mock object.
//
// healthKit.ios.ts has module-level authorization state (`initialized` /
// `initPromise`), so its suite re-requires the module per-test via
// jest.resetModules(). The mock object must stay stable across those
// re-requires, so the test creates one instance up front and points jest.mock at
// it.

export interface ReactNativeHealthKitMock {
  isHealthDataAvailable: jest.Mock;
  queryQuantitySamples: jest.Mock;
  requestAuthorization: jest.Mock;
}

export function createReactNativeHealthKitMock(): ReactNativeHealthKitMock {
  return {
    isHealthDataAvailable: jest.fn(),
    queryQuantitySamples: jest.fn(),
    requestAuthorization: jest.fn(),
  };
}
