// In-memory mock for `expo-file-system/legacy` (the procedural API asset-cache
// uses). Opt in per-suite with:
//   jest.mock("expo-file-system/legacy", () =>
//     require("../../../test/mocks/expo-file-system-legacy"));
//   import * as fsMock from "../../../test/mocks/expo-file-system-legacy";
// then seed state with __seedFile/__seedDir and reset with __reset().

// asset-cache.ts reads this at module load to build CACHE_DIR.
export const cacheDirectory = "file:///cache/";
export const documentDirectory = "file:///documents/";

const files = new Map<string, string | undefined>();
const dirs = new Set<string>();

export const getInfoAsync = jest.fn(async (uri: string) => ({
  exists: files.has(uri) || dirs.has(uri),
  uri,
}));

export const makeDirectoryAsync = jest.fn(async (uri: string) => {
  dirs.add(uri);
});

export const readAsStringAsync = jest.fn(async (uri: string) => {
  if (!files.has(uri)) throw new Error(`mock fs: no such file ${uri}`);
  const content = files.get(uri);
  if (content === undefined) throw new Error(`mock fs: unreadable ${uri}`);
  return content;
});

export const writeAsStringAsync = jest.fn(async (uri: string, content: string) => {
  files.set(uri, content);
});

export const downloadAsync = jest.fn(async (_url: string, dest: string) => {
  files.set(dest, "downloaded-bytes");
  return { status: 200, uri: dest };
});

export const deleteAsync = jest.fn(async (uri: string) => {
  files.delete(uri);
  dirs.delete(uri);
});

// ── Test helpers ────────────────────────────────────────────────────────────

/** Seed an existing file. Pass `undefined` content to simulate an unreadable file. */
export function __seedFile(uri: string, content: string | undefined = ""): void {
  files.set(uri, content);
}

export function __seedDir(uri: string): void {
  dirs.add(uri);
}

export function __exists(uri: string): boolean {
  return files.has(uri) || dirs.has(uri);
}

/** Clear the in-memory FS and call history. Keeps the default implementations
 *  (use mockResolvedValueOnce / mockImplementationOnce in a test for one-shot
 *  overrides so they don't leak into the next test). */
export function __reset(): void {
  files.clear();
  dirs.clear();
  [
    getInfoAsync,
    makeDirectoryAsync,
    readAsStringAsync,
    writeAsStringAsync,
    downloadAsync,
    deleteAsync,
  ].forEach((m) => m.mockClear());
}
