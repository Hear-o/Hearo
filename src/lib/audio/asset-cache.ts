// Audio asset cache for HearO sessions.
//
// Rule: no streaming during an active session. All audio files must be
// present on-device before the session starts. This module handles:
//   - Fetching the CDN manifest (JSON list of assets with URL + SHA-256)
//   - Checking existing local files against their expected hash
//   - Downloading missing or stale files to the device's cache directory
//   - Returning local file URIs ready for AudioEngine.loadBuffers()
//
// Design: uses expo-file-system (already a transitive dependency).
// CDN manifest format: AssetManifest[]  (see types below)
//
// TODO(supabase): manifest URL will come from the content provisioning seam
// (content.ts → Supabase). Hard-coded placeholder below for the demo.

// expo-file-system v56 ships a new OOP API as the default export;
// the legacy procedural API (cacheDirectory, downloadAsync, etc.) lives here.
import * as FileSystem from 'expo-file-system/legacy';

// ── Types ────────────────────────────────────────────────────────────────

export interface AssetManifestEntry {
  /** Logical key (e.g. "ambient/beach", "trigger/motorcycle/1", "voice/disclaimer"). */
  key: string;
  /** Full HTTPS URL to the CDN file. */
  url: string;
  /** SHA-256 hex digest of the file content. Used for freshness check. */
  sha256: string;
}

export type AssetManifest = AssetManifestEntry[];

export interface CacheResult {
  /** Map from asset key → local file URI (file:// path). */
  localUris: Record<string, string>;
}

export type ProgressCallback = (downloaded: number, total: number) => void;

// ── Internals ────────────────────────────────────────────────────────────

const CACHE_DIR = `${FileSystem.cacheDirectory}hearo-audio/`;

function localPath(entry: AssetManifestEntry): string {
  // Flatten the key into a safe filename: "trigger/motorcycle/1" → "trigger_motorcycle_1"
  const safeName = entry.key.replace(/\//g, '_');
  return `${CACHE_DIR}${safeName}`;
}

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function sha256OfFile(uri: string): Promise<string | null> {
  try {
    // expo-file-system does not expose a native SHA-256 API directly.
    // We store the expected hash in a sidecar file (.sha256) alongside
    // each cached asset and treat it as the integrity record.
    const sidecarUri = `${uri}.sha256`;
    const info = await FileSystem.getInfoAsync(sidecarUri);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(sidecarUri);
    return content.trim();
  } catch {
    return null;
  }
}

async function writeSidecar(uri: string, sha256: string): Promise<void> {
  await FileSystem.writeAsStringAsync(`${uri}.sha256`, sha256);
}

async function downloadAsset(
  entry: AssetManifestEntry,
  dest: string
): Promise<void> {
  const result = await FileSystem.downloadAsync(entry.url, dest);
  if (result.status !== 200) {
    // Remove partial file so the next attempt retries from scratch.
    await FileSystem.deleteAsync(dest, { idempotent: true });
    throw new Error(
      `Failed to download ${entry.key}: HTTP ${result.status}`
    );
  }
  try {
    await writeSidecar(dest, entry.sha256);
  } catch (e) {
    // Sidecar write failed (e.g. storage full). Delete the asset file so the
    // next session run does not see a "file exists, no sidecar" state and
    // attempt a perpetual re-download of a perfectly good cached file.
    await FileSystem.deleteAsync(dest, { idempotent: true });
    throw e;
  }
}

// Note on integrity: the sidecar stores the hash from the CDN manifest, not
// a hash computed from the downloaded bytes. This detects stale cached files
// and interrupted downloads (no sidecar = stale), but does NOT verify that
// the CDN served byte-perfect content. expo-file-system has no native SHA-256
// API; a future improvement would be to hash the downloaded file in a Worklet.

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Given a manifest of required assets, ensure every file is cached locally.
 * Missing or stale files are downloaded. Returns a map of key → local URI.
 *
 * @param manifest   List of assets required for this session.
 * @param onProgress Optional callback: (downloaded, total) counts.
 */
export async function ensureAssets(
  manifest: AssetManifest,
  onProgress?: ProgressCallback
): Promise<CacheResult> {
  await ensureCacheDir();

  const localUris: Record<string, string> = {};
  let downloaded = 0;

  // All downloads run in parallel. This is fine for demo-sized manifests
  // (≤10 files). When the full asset set grows, add a concurrency limiter
  // (e.g. p-limit with 3-4) to avoid CDN per-IP rate limits and to
  // prevent a single failure from short-circuiting all in-flight downloads.
  await Promise.all(
    manifest.map(async (entry) => {
      const dest = localPath(entry);
      const cachedHash = await sha256OfFile(dest);
      const fileInfo = await FileSystem.getInfoAsync(dest);

      if (fileInfo.exists && cachedHash === entry.sha256) {
        // Cache hit — file is present and hash matches.
        localUris[entry.key] = dest;
      } else {
        // Cache miss or stale — download.
        await downloadAsset(entry, dest);
        localUris[entry.key] = dest;
        downloaded += 1;
        onProgress?.(downloaded, manifest.length);
      }
    })
  );

  return { localUris };
}

/**
 * Clear all cached audio assets. Call when the user logs out or on
 * storage-pressure events.
 */
export async function clearAudioCache(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  }
}
