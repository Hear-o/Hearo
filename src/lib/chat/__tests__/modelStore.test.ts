import {
  EDGE_MODEL_SIZE_BYTES,
  EDGE_TOKENIZER_SIZE_BYTES,
  getInstalledEdgeModelAssets,
  installEdgeModelAssets,
} from "@/lib/chat/modelStore";

jest.mock("expo-file-system", () => {
  const mockCreateDirectory = jest.fn();
  const mockDeleteFile = jest.fn();
  const mockDownloadFileAsync = jest.fn();
  const mockFile = jest.fn();
  return {
    Paths: { document: "file:///documents" },
    Directory: jest.fn(() => ({ create: mockCreateDirectory })),
    File: Object.assign(jest.fn(() => mockFile()), {
      downloadFileAsync: mockDownloadFileAsync,
    }),
    __mocks: { mockCreateDirectory, mockDeleteFile, mockDownloadFileAsync, mockFile },
  };
});

const {
  mockCreateDirectory,
  mockDeleteFile,
  mockDownloadFileAsync,
  mockFile,
} = jest.requireMock("expo-file-system").__mocks;

describe("edge model store", () => {
  beforeEach(() => {
    mockCreateDirectory.mockReset();
    mockDeleteFile.mockReset();
    mockDownloadFileAsync.mockReset();
    mockFile.mockReset();
  });

  it("returns both installed assets only when their expected sizes are present", async () => {
    mockFile
      .mockReturnValueOnce({
      exists: true,
      size: EDGE_MODEL_SIZE_BYTES,
      uri: "file:///documents/models/qwen.gguf",
      })
      .mockReturnValueOnce({
        exists: true,
        size: EDGE_TOKENIZER_SIZE_BYTES,
        uri: "file:///documents/models/tokenizer.json",
      });

    await expect(getInstalledEdgeModelAssets()).resolves.toEqual({
      modelUri: "file:///documents/models/qwen.gguf",
      tokenizerUri: "file:///documents/models/tokenizer.json",
    });
  });

  it("downloads, validates, and returns both local Qwen assets", async () => {
    const modelTarget = { exists: false, size: null, uri: "file:///documents/models/qwen.gguf" };
    const tokenizerTarget = { exists: false, size: null, uri: "file:///documents/models/tokenizer.json" };
    mockFile.mockReturnValueOnce(modelTarget).mockReturnValueOnce(tokenizerTarget)
      .mockReturnValueOnce(modelTarget).mockReturnValueOnce(tokenizerTarget);
    mockDownloadFileAsync
      .mockResolvedValueOnce({ exists: true, size: EDGE_MODEL_SIZE_BYTES, uri: modelTarget.uri })
      .mockResolvedValueOnce({ exists: true, size: EDGE_TOKENIZER_SIZE_BYTES, uri: tokenizerTarget.uri });
    const onProgress = jest.fn();

    await expect(installEdgeModelAssets(onProgress)).resolves.toEqual({
      modelUri: modelTarget.uri,
      tokenizerUri: tokenizerTarget.uri,
    });

    expect(mockCreateDirectory).toHaveBeenCalledWith({ intermediates: true, idempotent: true });
    expect(mockDownloadFileAsync).toHaveBeenCalledTimes(2);
    expect(mockDownloadFileAsync).toHaveBeenNthCalledWith(1, expect.stringContaining("Qwen2.5-0.5B-Instruct-GGUF"), expect.anything(), expect.objectContaining({ onProgress }));
    expect(mockDownloadFileAsync).toHaveBeenNthCalledWith(2, expect.stringContaining("Qwen2.5-0.5B-Instruct"), expect.anything(), expect.anything());
  });

  it("removes a truncated download instead of making it available to the SDK", async () => {
    const modelTarget = { exists: false, size: null, uri: "file:///documents/models/qwen.gguf" };
    const tokenizerTarget = { exists: false, size: null, uri: "file:///documents/models/tokenizer.json" };
    mockFile.mockReturnValueOnce(modelTarget).mockReturnValueOnce(tokenizerTarget)
      .mockReturnValueOnce(modelTarget).mockReturnValueOnce(tokenizerTarget);
    mockDownloadFileAsync.mockResolvedValue({ exists: true, size: 12, delete: mockDeleteFile });

    await expect(installEdgeModelAssets()).rejects.toThrow("incomplete");
    expect(mockDeleteFile).toHaveBeenCalled();
  });
});
