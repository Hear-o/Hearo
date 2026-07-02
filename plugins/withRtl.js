// Expo config plugin that pins the native RTL configuration into iOS at
// `expo prebuild` time.
//
// The problem this exists to solve: Codemagic runs `expo prebuild --clean`
// on every build, which regenerates ios/ from scratch. Any manual edits to
// ios/Hearo/AppDelegate.swift or ios/Hearo/Info.plist would be wiped. This
// plugin re-applies both changes as part of the prebuild pipeline, so they
// survive every CI build.
//
// What it does:
//   1. Info.plist: sets CFBundleDevelopmentRegion="he" and adds "he" as a
//      supported localization. iOS uses this for NSTextAlignmentNatural
//      resolution and to treat the app's primary locale as Hebrew.
//   2. AppDelegate.swift: injects UserDefaults writes for RCTI18nUtil
//      (allowRTL, forceRTL, makeRTLFlipLeftAndRightStyles) BEFORE RN
//      initializes, so Yoga lays out RTL from the very first render.
//
// Note: RCTI18nUtil_makeRTLFlipLeftAndRightStyles is DISABLED intentionally.
// It auto-mirrors left/right *values* (positioning, textAlign) in RTL, which
// double-mirrors against Yoga's own RTL flip and creates the "textAlign:right
// renders visual left" bug we spent hours debugging on-device.

const {
  withInfoPlist,
  withAppDelegate,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const RTL_MARKER = "[Hearo RTL] forced RTL at native launch";

const withRtlNative = (config) => {
  // 1) Info.plist — primary locale + supported languages.
  config = withInfoPlist(config, (config) => {
    config.modResults.CFBundleDevelopmentRegion = "he";
    config.modResults.CFBundleLocalizations = ["he", "en"];
    return config;
  });

  // 2) AppDelegate.swift — write RCTI18nUtil UserDefaults before startReactNative.
  config = withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;

    // Idempotent: if the marker string is already present, don't inject twice.
    if (contents.includes(RTL_MARKER)) {
      return config;
    }

    const injection = `    // v1.1.10 RTL — see plugins/withRtl.js. Writes RCTI18nUtil UserDefaults
    // BEFORE RN starts so Yoga lays out RTL from first render.
    let rtlDefaults = UserDefaults.standard
    rtlDefaults.set(true, forKey: "RCTI18nUtil_allowRTL")
    rtlDefaults.set(true, forKey: "RCTI18nUtil_forceRTL")
    rtlDefaults.set(false, forKey: "RCTI18nUtil_makeRTLFlipLeftAndRightStyles")
    rtlDefaults.synchronize()
    NSLog("${RTL_MARKER}")

`;

    // Inject at the start of the didFinishLaunchingWithOptions body.
    // We find the "let delegate = ReactNativeDelegate()" line which is the
    // first significant statement inside the method and prepend our block.
    const marker = "let delegate = ReactNativeDelegate()";
    if (!contents.includes(marker)) {
      throw new Error(
        "withRtl: could not find 'let delegate = ReactNativeDelegate()' " +
          "in AppDelegate.swift — the Expo template may have changed. " +
          "Update the marker in plugins/withRtl.js.",
      );
    }

    config.modResults.contents = contents.replace(
      marker,
      injection + "    " + marker,
    );
    return config;
  });

  return config;
};

module.exports = createRunOncePlugin(withRtlNative, "hearo-rtl", "1.0.0");
