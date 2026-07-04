const appConfig = require("../app.json");

describe("Expo app config", () => {
  it("targets only iOS and Android", () => {
    expect(appConfig.expo.platforms).toEqual(["ios", "android"]);
  });

  it("does not support iPad tablet screen sizes", () => {
    expect(appConfig.expo.ios.supportsTablet).toBe(false);
    expect(appConfig.expo.ios.isTabletOnly).not.toBe(true);
  });
});
