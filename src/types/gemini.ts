export type GeminiModelChoice = "gemini-3.1-pro-preview" | "gemini-3.8-flash" | "gemini-flash-latest";

export type ScriptGenre = 
  | "tiktok_reels" 
  | "short_film" 
  | "documentary" 
  | "podcast" 
  | "tvc_commercial" 
  | "storytelling" 
  | "educational" 
  | "news";

export type SongGenre = 
  | "pop" 
  | "ballad" 
  | "rap" 
  | "rnb" 
  | "rock" 
  | "edm" 
  | "acoustic" 
  | "bolero" 
  | "folk" 
  | "children";

export type ImageStyle = 
  | "cinematic" 
  | "anime" 
  | "photorealistic" 
  | "3d_render" 
  | "oil_painting" 
  | "cyberpunk" 
  | "watercolor" 
  | "vintage";

export type ImageAspectRatio = "16:9" | "9:16" | "1:1" | "4:3";

export interface ScriptScene {
  sceneNumber: number;
  timeCode: string; // e.g. "00:00 - 00:05"
  visualPrompt: string;
  voiceoverText: string;
  soundEffect?: string;
}

export interface GeneratedScript {
  id: string;
  title: string;
  genre: ScriptGenre;
  targetDuration: string;
  hook: string;
  summary: string;
  scenes: ScriptScene[];
  fullVoiceoverText: string;
  recommendedVoice: string;
  imagePrompts: string[];
  tags: string[];
  createdAt: string;
}

export interface SongSection {
  name: string; // "Intro", "Verse 1", "Chorus", "Bridge", "Outro"
  chords: string;
  lines: string[];
}

export interface GeneratedSong {
  id: string;
  songTitle: string;
  genre: SongGenre;
  mood: string;
  bpm: number;
  musicalKey: string;
  vocalStyle: string;
  sections: SongSection[];
  fullLyrics: string;
  audioPreviewUrl?: string;
  vocalVoiceCode: string;
  compositionNotes?: string;
  createdAt: string;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  style: ImageStyle;
  aspectRatio: ImageAspectRatio;
  imageUrl: string;
  downloadUrl: string;
  createdAt: string;
}

export interface GeneratedVideo {
  id: string;
  title: string;
  prompt: string;
  videoUrl: string;
  downloadUrl: string;
  duration: number;
  durationFormatted: string;
  aspectRatio: string;
  audioUrl?: string;
  createdAt: string;
}

export type MusicGenre =
  | "lofi"
  | "piano_ballad"
  | "acoustic"
  | "edm"
  | "cinematic"
  | "meditation"
  | "bolero"
  | "rnb";

export interface GeneratedMusicTrack {
  id: string;
  title: string;
  genre: string;
  mood: string;
  bpm: number;
  duration: number;
  durationFormatted: string;
  audioUrl: string;
  downloadUrl: string;
  description: string;
  musicalKey: string;
  instrumentsUsed: string[];
  createdAt: string;
}

