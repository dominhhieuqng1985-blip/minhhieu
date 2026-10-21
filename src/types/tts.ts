export type EverAIModel =
  | "everai-v1.6"
  | "everai-v1.5"
  | "everai-v1.5-turbo"
  | "everai-v1";

export type AudioType = "mp3" | "wav";

export type BitrateOption = 8 | 16 | 32 | 64 | 128 | 160;

export interface VoiceItem {
  code: string;
  name: string;
  gender: "Nam" | "Nữ";
  region: string;
  language: string;
  langCode: string;
  description: string;
  creditCost: number; // Credits per 1000 characters
  sampleAudio?: string;
  sampleText: string;
  tags?: string[];
}

export interface TTSRequest {
  response_type?: "indirect";
  callback_url?: string;
  input_text: string;
  voice_code: string;
  model_id?: EverAIModel;
  audio_type?: AudioType;
  bitrate?: BitrateOption;
  speed_rate?: number;
  pitch_rate?: number;
  volume?: number;
  generate_srt?: boolean;
  custom_api_key?: string;
}

export interface EverAIResult {
  request_id: string;
  characters: number;
  voice_code: string;
  audio_type: AudioType;
  speed_rate: number;
  pitch_rate: number;
  bitrate?: number;
  create_at?: string;
  created_at?: string;
  status: string;
  progress?: number;
  audio_link?: string;
  srt_link?: string;
  audio_expired?: boolean;
  srt_content?: string;
}

export interface EverAIResponse {
  status: number;
  error_code?: string;
  error_message?: string;
  result?: EverAIResult;
}

export interface TTSJob {
  id: string;
  requestId: string;
  inputText: string;
  voiceCode: string;
  voiceName: string;
  modelId: EverAIModel;
  audioType: AudioType;
  bitrate: BitrateOption;
  speedRate: number;
  pitchRate: number;
  volume: number;
  generateSrt: boolean;
  status: "new" | "processing" | "SUCCESS" | "FAILURE";
  audioUrl?: string;
  srtContent?: string;
  characters: number;
  wordCount: number;
  estimatedDurationSeconds?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  isSimulated?: boolean;
}

export interface TextChunk {
  id: string;
  index: number;
  text: string;
  charCount: number;
  status: "idle" | "creating" | "processing" | "success" | "failure";
  requestId?: string;
  audioUrl?: string;
  srtContent?: string;
  error?: string;
}
