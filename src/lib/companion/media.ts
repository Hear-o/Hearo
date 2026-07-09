// Companion step media — capture a photo/video (camera or library) and persist
// it locally as evidence a step was completed. Nothing here leaves the device:
// the picked asset is copied into the app's document directory and only a local
// file URI is stored (see lib/storage/storage.ts companionTaskMedia).
//
// Split into two entry points:
//  - captureCompanionMedia(taskKey, source) — permission + launch + persist.
//    Pure of any UI chrome, so it's unit-testable.
//  - pickCompanionMedia(taskKey) — asks the user camera-vs-library via an
//    Alert, then delegates to captureCompanionMedia. This is what the UI calls.

import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
// expo-file-system v56 ships a new OOP API as the default export; we use the
// stable legacy function API — same choice as lib/audio/asset-cache.ts.
import * as FileSystem from "expo-file-system/legacy";

import {
  CompanionTaskMedia,
  removeCompanionTaskMedia,
  setCompanionTaskMedia,
} from "@/lib/storage/storage";
import i18n from "@/lib/ui/i18n";

export type MediaSource = "camera" | "library";

const MEDIA_DIR = `${FileSystem.documentDirectory}companion-media/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MEDIA_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
  }
}

/** File extension from a uri (drops any query string), falling back by type. */
function extFor(uri: string, type: "image" | "video"): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  if (match) return match[1].toLowerCase();
  return type === "video" ? "mp4" : "jpg";
}

/** Delete any previously-saved file(s) for a task key. The trailing dot in the
 *  prefix keeps "beach-1" from also matching "beach-10". */
async function deleteFilesForKey(taskKey: string): Promise<void> {
  try {
    const entries = await FileSystem.readDirectoryAsync(MEDIA_DIR);
    await Promise.all(
      entries
        .filter((name) => name === taskKey || name.startsWith(`${taskKey}.`))
        .map((name) =>
          FileSystem.deleteAsync(`${MEDIA_DIR}${name}`, { idempotent: true }),
        ),
    );
  } catch {
    // Directory may not exist yet — nothing to delete.
  }
}

async function persistAsset(
  taskKey: string,
  srcUri: string,
  type: "image" | "video",
): Promise<string> {
  await ensureDir();
  await deleteFilesForKey(taskKey);
  const dest = `${MEDIA_DIR}${taskKey}.${extFor(srcUri, type)}`;
  await FileSystem.copyAsync({ from: srcUri, to: dest });
  return dest;
}

/** Capture from a specific source, persist locally, and record it. Returns the
 *  saved media, or null if the user cancels or denies permission. */
export async function captureCompanionMedia(
  taskKey: string,
  source: MediaSource,
): Promise<CompanionTaskMedia | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      i18n.t("companion.permissionDeniedTitle"),
      i18n.t(
        source === "camera"
          ? "companion.cameraPermissionDenied"
          : "companion.libraryPermissionDenied",
      ),
    );
    return null;
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images", "videos"],
    quality: 0.8,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const type: "image" | "video" = asset.type === "video" ? "video" : "image";
  const uri = await persistAsset(taskKey, asset.uri, type);
  const media: CompanionTaskMedia = { uri, type, capturedAt: Date.now() };
  await setCompanionTaskMedia(taskKey, media);
  return media;
}

/** Ask the user camera-vs-library, then capture. UI entry point. */
export async function pickCompanionMedia(
  taskKey: string,
): Promise<CompanionTaskMedia | null> {
  const source = await new Promise<MediaSource | null>((resolve) => {
    Alert.alert(
      i18n.t("companion.mediaSourceTitle"),
      undefined,
      [
        {
          text: i18n.t("companion.sourceCamera"),
          onPress: () => resolve("camera"),
        },
        {
          text: i18n.t("companion.sourceLibrary"),
          onPress: () => resolve("library"),
        },
        {
          text: i18n.t("companion.cancel"),
          style: "cancel",
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });

  if (!source) return null;
  return captureCompanionMedia(taskKey, source);
}

/** Remove a step's media (file + record). Re-locks the steps after it. */
export async function deleteCompanionMedia(taskKey: string): Promise<void> {
  await deleteFilesForKey(taskKey);
  await removeCompanionTaskMedia(taskKey);
}
