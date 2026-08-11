import { Directory, File, Paths, type DownloadProgress } from "expo-file-system";

export const EDGE_MODEL_FILENAME = "qwen2.5-0.5b-instruct-q4_k_m.gguf";
export const EDGE_MODEL_SIZE_BYTES = 491_400_032;
export const EDGE_TOKENIZER_FILENAME = "qwen2.5-0.5b-instruct.tokenizer.json";
export const EDGE_TOKENIZER_SIZE_BYTES = 7_031_645;

export type EdgeModelAssets = {
  modelUri: string;
  tokenizerUri: string;
};

// Both immutable source URLs and their expected sizes are pinned. Neither is
// user-controlled, so a chat session cannot fetch an arbitrary local asset.
const EDGE_MODEL_URL =
  "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_k_m.gguf?download=true";
const EDGE_TOKENIZER_URL =
  "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/resolve/7ae557604adf67be50417f59c2c2f167def9a775/tokenizer.json?download=true";

function modelDirectory() {
  return new Directory(Paths.document, "models");
}

function modelFile() {
  return new File(modelDirectory(), EDGE_MODEL_FILENAME);
}

function tokenizerFile() {
  return new File(modelDirectory(), EDGE_TOKENIZER_FILENAME);
}

function hasExpectedSize(file: Pick<File, "exists" | "size">, expectedSize: number): boolean {
  return file.exists && file.size === expectedSize;
}

export async function getInstalledEdgeModelAssets(): Promise<EdgeModelAssets | null> {
  const model = modelFile();
  const tokenizer = tokenizerFile();

  return hasExpectedSize(model, EDGE_MODEL_SIZE_BYTES)
    && hasExpectedSize(tokenizer, EDGE_TOKENIZER_SIZE_BYTES)
    ? { modelUri: model.uri, tokenizerUri: tokenizer.uri }
    : null;
}

async function installAsset(
  target: File,
  url: string,
  expectedSize: number,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> {
  if (hasExpectedSize(target, expectedSize)) return target.uri;
  if (target.exists) target.delete();

  const downloaded = await File.downloadFileAsync(url, target, {
    idempotent: true,
    onProgress,
  });

  if (!hasExpectedSize(downloaded, expectedSize)) {
    if (downloaded.exists) downloaded.delete();
    throw new Error("The downloaded language model is incomplete. Please try again.");
  }

  return downloaded.uri;
}

export async function installEdgeModelAssets(
  onModelProgress?: (progress: DownloadProgress) => void,
): Promise<EdgeModelAssets> {
  const existing = await getInstalledEdgeModelAssets();
  if (existing) return existing;

  const directory = modelDirectory();
  directory.create({ intermediates: true, idempotent: true });

  const modelUri = await installAsset(
    modelFile(),
    EDGE_MODEL_URL,
    EDGE_MODEL_SIZE_BYTES,
    onModelProgress,
  );
  const tokenizerUri = await installAsset(
    tokenizerFile(),
    EDGE_TOKENIZER_URL,
    EDGE_TOKENIZER_SIZE_BYTES,
  );

  return { modelUri, tokenizerUri };
}
