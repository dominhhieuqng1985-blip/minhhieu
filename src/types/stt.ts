export interface SubtitleSegment {
  index: number;
  start: number; // in seconds
  end: number;
  startTime: string; // "00:00:01,200"
  endTime: string;
  text: string;
  originalText?: string;
}

export interface TranscribeResult {
  id: string;
  url: string;
  platform: "youtube" | "tiktok" | "direct" | "file";
  title: string;
  author?: string;
  thumbnail?: string;
  duration?: number;
  durationFormatted?: string;
  text: string;
  originalText?: string;
  translatedText?: string;
  segments: SubtitleSegment[];
  originalSegments?: SubtitleSegment[];
  translatedSegments?: SubtitleSegment[];
  srtContent: string;
  originalSrtContent?: string;
  translatedSrtContent?: string;
  summary?: string;
  language?: string;
  detectedLanguage?: string;
  detectedLanguageCode?: string;
  isTranslatedToVietnamese?: boolean;
  createdAt: string;
  characterCount: number;
  wordCount: number;
  videoTempId?: string;
}
