export interface DubbedVideoResult {
  id: string;
  filename: string;
  video_url: string;
  download_url: string;
  duration: number;
  durationFormatted: string;
  fileSize: number;
  fileSizeFormatted: string;
  mode: "replace" | "ducking";
  timeSync: "loop_video" | "shortest" | "keep_video";
}

export interface VideoPartItem {
  id: string;
  partIndex: number; // 1, 2, 3...
  title: string; // "Phần 1 (00:00 - 10:00)"
  startSec: number;
  endSec: number;
  duration: number;
  durationFormatted: string;
  videoTempId: string;
  videoUrl: string; // "/api/video/stream/..."
  audioUrl: string; // "/api/video/audio/..."
  downloadUrl: string;
  audioFilename?: string;
  transcribedText?: string;
  translatedText?: string;
  detectedLanguage?: string;
  detectedLanguageCode?: string;
  isTranslatedToVietnamese?: boolean;
  dubbedVideoUrl?: string;
  dubbedAudioUrl?: string;
  voiceCode?: string;
  status: "idle" | "transcribing" | "transcribed" | "dubbing" | "completed" | "error";
  error?: string;
}

export interface SplitPartsResult {
  originalDuration: number;
  originalDurationFormatted: string;
  totalParts: number;
  partDurationSec: number;
  sourceTitle?: string;
  parts: VideoPartItem[];
}

export interface VideoMergeRequest {
  videoBase64?: string;
  videoTempId?: string;
  audioTempId?: string;
  audioUrl?: string;
  audioBase64?: string;
  mode?: "replace" | "ducking";
  timeSync?: "loop_video" | "shortest" | "keep_video";
  voiceVolume?: number;
  bgVolume?: number;
}
