jest.mock("expo-file-system/legacy", () =>
  require("../../../../test/mocks/expo-file-system-legacy"),
);

import * as fsMock from "../../../../test/mocks/expo-file-system-legacy";
import {
  ensureAssets,
  clearAudioCache,
  AssetManifestEntry,
} from "@/lib/audio/asset-cache";

// Mirrors the private CACHE_DIR in asset-cache.ts: cacheDirectory + "hearo-audio/".
const CACHE_DIR = "file:///cache/hearo-audio/";
const destFor = (key: string) => `${CACHE_DIR}${key.replace(/\//g, "_")}`;

const entry = (key: string, sha256: string): AssetManifestEntry => ({
  key,
  url: `https://cdn.example.com/${key}`,
  sha256,
});

beforeEach(() => {
  fsMock.__reset();
  fsMock.__seedDir(CACHE_DIR); // assume cache dir already exists unless a test clears it
});

describe("asset-cache / ensureAssets", () => {
  it("treats a present file with a matching sidecar hash as a cache hit", async () => {
    const e = entry("ambient/beach", "abc123");
    const dest = destFor(e.key);
    fsMock.__seedFile(dest, "audio");
    fsMock.__seedFile(`${dest}.sha256`, "abc123");

    const { localUris } = await ensureAssets([e]);

    expect(localUris).toEqual({ "ambient/beach": dest });
    expect(fsMock.downloadAsync).not.toHaveBeenCalled();
  });

  it("downloads + writes a sidecar when the file is missing", async () => {
    const e = entry("trigger/motorcycle/1", "deadbeef");
    const dest = destFor(e.key);
    const onProgress = jest.fn();

    const { localUris } = await ensureAssets([e], onProgress);

    expect(localUris).toEqual({ "trigger/motorcycle/1": dest });
    expect(fsMock.downloadAsync).toHaveBeenCalledWith(e.url, dest);
    expect(fsMock.writeAsStringAsync).toHaveBeenCalledWith(`${dest}.sha256`, "deadbeef");
    expect(onProgress).toHaveBeenCalledWith(1, 1);
  });

  it("re-downloads when the cached file's sidecar hash is stale", async () => {
    const e = entry("voice/disclaimer", "newhash");
    const dest = destFor(e.key);
    fsMock.__seedFile(dest, "old-audio");
    fsMock.__seedFile(`${dest}.sha256`, "oldhash"); // mismatch → stale

    await ensureAssets([e]); // no onProgress → exercises the optional-call branch

    expect(fsMock.downloadAsync).toHaveBeenCalledTimes(1);
    expect(fsMock.writeAsStringAsync).toHaveBeenCalledWith(`${dest}.sha256`, "newhash");
  });

  it("re-downloads when the sidecar exists but is unreadable", async () => {
    const e = entry("ambient/rain", "h");
    const dest = destFor(e.key);
    fsMock.__seedFile(dest, "audio");
    fsMock.__seedFile(`${dest}.sha256`, "present");
    // Read of the sidecar throws → sha256OfFile swallows it and returns null.
    fsMock.readAsStringAsync.mockRejectedValueOnce(new Error("io error"));

    await ensureAssets([e]);

    expect(fsMock.downloadAsync).toHaveBeenCalledTimes(1);
  });

  it("deletes the partial file and throws on a non-200 download", async () => {
    const e = entry("ambient/beach", "h");
    const dest = destFor(e.key);
    fsMock.downloadAsync.mockResolvedValueOnce({ status: 404, uri: dest });

    await expect(ensureAssets([e])).rejects.toThrow(/HTTP 404/);
    expect(fsMock.deleteAsync).toHaveBeenCalledWith(dest, { idempotent: true });
  });

  it("deletes the asset and rethrows when the sidecar write fails", async () => {
    const e = entry("ambient/beach", "h");
    const dest = destFor(e.key);
    fsMock.writeAsStringAsync.mockRejectedValueOnce(new Error("disk full"));

    await expect(ensureAssets([e])).rejects.toThrow("disk full");
    expect(fsMock.deleteAsync).toHaveBeenCalledWith(dest, { idempotent: true });
  });

  it("creates the cache directory when it does not yet exist", async () => {
    fsMock.__reset(); // no seeded CACHE_DIR this time
    const e = entry("ambient/beach", "h");

    await ensureAssets([e]);

    expect(fsMock.makeDirectoryAsync).toHaveBeenCalledWith(CACHE_DIR, {
      intermediates: true,
    });
  });

  it("does not recreate the cache directory when it already exists", async () => {
    const e = entry("ambient/beach", "h");
    await ensureAssets([e]);
    expect(fsMock.makeDirectoryAsync).not.toHaveBeenCalled();
  });
});

describe("asset-cache / clearAudioCache", () => {
  it("deletes the cache directory when it exists", async () => {
    await clearAudioCache();
    expect(fsMock.deleteAsync).toHaveBeenCalledWith(CACHE_DIR, { idempotent: true });
  });

  it("is a no-op when the cache directory does not exist", async () => {
    fsMock.__reset(); // remove seeded CACHE_DIR
    await clearAudioCache();
    expect(fsMock.deleteAsync).not.toHaveBeenCalled();
  });
});
