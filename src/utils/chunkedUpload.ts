import { safeParseJson } from "./apiHelper";

/**
 * Chunked file uploader to bypass Cloud Run / Reverse Proxy 32MB request body limits (HTTP 413).
 * Slices large files (up to 5GB) into 8MB chunks and uploads them sequentially with live progress and auto-retry.
 */
export interface ChunkUploadProgress {
  percent: number;
  currentChunk: number;
  totalChunks: number;
  loadedBytes: number;
  totalBytes: number;
  loadedFormatted: string;
  totalFormatted: string;
  speedFormatted?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

export async function uploadFileInChunks(
  file: File,
  onProgress?: (progress: ChunkUploadProgress) => void,
  chunkSize: number = 8 * 1024 * 1024 // 8MB chunks (safely under Cloud Run 32MB limit)
): Promise<{ tempId: string; size: number; filename: string }> {
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const totalSize = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalSize / chunkSize));

  console.log(`[Chunked Upload] Starting upload of ${file.name} (${formatFileSize(totalSize)} in ${totalChunks} chunks of ${formatFileSize(chunkSize)})`);

  let loadedBytes = 0;
  const startTime = Date.now();

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(totalSize, start + chunkSize);
    const chunkBlob = file.slice(start, end);

    let attempts = 0;
    let success = false;
    let lastError: any = null;
    let resultData: any = null;

    // Retry each chunk up to 3 times on network failure
    while (attempts < 3 && !success) {
      attempts++;
      try {
        const res = await fetch("/api/video/upload-chunk", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "x-upload-id": uploadId,
            "x-chunk-index": chunkIndex.toString(),
            "x-total-chunks": totalChunks.toString(),
            "x-filename": encodeURIComponent(file.name),
            "x-total-size": totalSize.toString()
          },
          body: chunkBlob
        });

        if (res.status === 413) {
          throw new Error("Mảnh tệp quá lớn (HTTP 413). Đang tự động thử lại...");
        }

        const data = await safeParseJson(res);
        if (!res.ok || data.status !== 1) {
          throw new Error(data.error_message || `Lỗi tải mảnh ${chunkIndex + 1}/${totalChunks} (HTTP ${res.status})`);
        }

        success = true;
        resultData = data;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Chunked Upload] Chunk ${chunkIndex + 1} attempt ${attempts} failed:`, err.message);
        if (attempts < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    if (!success) {
      throw lastError || new Error(`Không thể truyền tải mảnh tệp ${chunkIndex + 1}/${totalChunks}. Vui lòng thử lại.`);
    }

    loadedBytes = end;
    const percent = Math.min(100, Math.round((loadedBytes / totalSize) * 100));
    const elapsedSec = (Date.now() - startTime) / 1000;
    const speed = elapsedSec > 0 ? loadedBytes / elapsedSec : 0;
    const speedFormatted = `${formatFileSize(speed)}/s`;

    if (onProgress) {
      onProgress({
        percent,
        currentChunk: chunkIndex + 1,
        totalChunks,
        loadedBytes,
        totalBytes: totalSize,
        loadedFormatted: formatFileSize(loadedBytes),
        totalFormatted: formatFileSize(totalSize),
        speedFormatted
      });
    }

    // Final chunk returns the assembled tempId
    if (chunkIndex === totalChunks - 1 && resultData && resultData.tempId) {
      return {
        tempId: resultData.tempId,
        size: resultData.size || totalSize,
        filename: resultData.filename || file.name
      };
    }
  }

  throw new Error("Không thể xác nhận hoàn tất quá trình tải tệp.");
}
