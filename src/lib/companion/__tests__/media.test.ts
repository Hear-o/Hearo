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

import { captureCompanionMedia } from "@/lib/companion/media";
import { getCompanionTaskMedia } from "@/lib/storage/storage";

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
