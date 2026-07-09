jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///doc/",
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => []),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}));

import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  captureCompanionMedia,
  deleteCompanionMedia,
  pickCompanionMedia,
} from "@/lib/companion/media";
import { getCompanionTaskMedia, setCompanionTaskMedia } from "@/lib/storage/storage";

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const fs = FileSystem as jest.Mocked<typeof FileSystem>;

// captureCompanionMedia is the UI-free core: request permission → launch the
// picker → copy the asset into the app's document dir → persist a record. These
// pin the fail-safe branches (denied / canceled write nothing) and the happy
// path (file copied to a key-named path, record stored).
describe("captureCompanionMedia", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    fs.getInfoAsync.mockResolvedValue({ exists: true } as never);
    fs.readDirectoryAsync.mockResolvedValue([] as never);
  });

  it("returns null and alerts when permission is denied", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);

    const result = await captureCompanionMedia("beach-1", "camera");

    expect(result).toBeNull();
    expect(Alert.alert).toHaveBeenCalled();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    expect(await getCompanionTaskMedia()).toEqual({});
  });

  it("returns null and writes nothing when the user cancels", async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);

    const result = await captureCompanionMedia("beach-1", "library");

    expect(result).toBeNull();
    expect(fs.copyAsync).not.toHaveBeenCalled();
    expect(await getCompanionTaskMedia()).toEqual({});
  });

  it("copies the picked image locally (keyed path) and persists a record", async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/pick.heic", type: "image" }],
    } as never);

    const media = await captureCompanionMedia("beach-1", "library");

    expect(fs.copyAsync).toHaveBeenCalledWith({
      from: "file:///tmp/pick.heic",
      to: "file:///doc/companion-media/beach-1.heic",
    });
    expect(media).toMatchObject({
      uri: "file:///doc/companion-media/beach-1.heic",
      type: "image",
    });
    expect((await getCompanionTaskMedia())["beach-1"]).toMatchObject({ type: "image" });
  });

  it("classifies a video and defaults the extension when the uri has none", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/capture", type: "video" }],
    } as never);

    const media = await captureCompanionMedia("road-2", "camera");

    expect(media?.type).toBe("video");
    expect(fs.copyAsync).toHaveBeenCalledWith({
      from: "file:///tmp/capture",
      to: "file:///doc/companion-media/road-2.mp4",
    });
  });

  it("creates the media directory when it does not exist yet", async () => {
    fs.getInfoAsync.mockResolvedValue({ exists: false } as never);
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/pick.jpg", type: "image" }],
    } as never);

    await captureCompanionMedia("cafe-1", "library");

    expect(fs.makeDirectoryAsync).toHaveBeenCalledWith("file:///doc/companion-media/", {
      intermediates: true,
    });
  });
});

// pickCompanionMedia adds the camera-vs-library Alert on top of the core. The
// Alert is driven synchronously in tests by invoking the button handlers.
describe("pickCompanionMedia", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    fs.getInfoAsync.mockResolvedValue({ exists: true } as never);
    fs.readDirectoryAsync.mockResolvedValue([] as never);
  });

  it("routes to the camera when the user chooses Camera", async () => {
    jest
      .spyOn(Alert, "alert")
      .mockImplementation((_t, _m, buttons) => (buttons as { onPress?: () => void }[])[0].onPress?.());
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///c.jpg", type: "image" }],
    } as never);

    const media = await pickCompanionMedia("beach-1");

    expect(picker.launchCameraAsync).toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(media).toMatchObject({ type: "image" });
  });

  it("routes to the library when the user chooses Library", async () => {
    jest
      .spyOn(Alert, "alert")
      .mockImplementation((_t, _m, buttons) => (buttons as { onPress?: () => void }[])[1].onPress?.());
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///l.mp4", type: "video" }],
    } as never);

    const media = await pickCompanionMedia("beach-1");

    expect(picker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(media).toMatchObject({ type: "video" });
  });

  it("returns null when the user cancels the source prompt", async () => {
    jest
      .spyOn(Alert, "alert")
      .mockImplementation((_t, _m, buttons) => (buttons as { onPress?: () => void }[])[2].onPress?.());

    const media = await pickCompanionMedia("beach-1");

    expect(media).toBeNull();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });
});

describe("deleteCompanionMedia", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("deletes only the matching file(s) and clears the record", async () => {
    await setCompanionTaskMedia("beach-1", {
      uri: "file:///doc/companion-media/beach-1.jpg",
      type: "image",
      capturedAt: 1,
    });
    // "beach-10" must NOT be caught by the "beach-1" prefix (trailing-dot guard).
    fs.readDirectoryAsync.mockResolvedValue([
      "beach-1.jpg",
      "beach-10.jpg",
      "park-1.jpg",
    ] as never);

    await deleteCompanionMedia("beach-1");

    expect(fs.deleteAsync).toHaveBeenCalledWith(
      "file:///doc/companion-media/beach-1.jpg",
      { idempotent: true },
    );
    expect(fs.deleteAsync).not.toHaveBeenCalledWith(
      "file:///doc/companion-media/beach-10.jpg",
      { idempotent: true },
    );
    expect((await getCompanionTaskMedia())["beach-1"]).toBeUndefined();
  });

  it("is resilient when the media directory cannot be read", async () => {
    fs.readDirectoryAsync.mockRejectedValue(new Error("no dir"));
    await expect(deleteCompanionMedia("beach-1")).resolves.toBeUndefined();
  });
});
