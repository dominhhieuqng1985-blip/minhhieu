export type AppLanguage = 'vi' | 'en';

export interface DiagnosticTest {
  id: string;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  resultMessage?: string;
  durationMs?: number;
}

export interface HumanLanguageItem {
  code: string;
  nameVi: string;
  nameEn: string;
  nativeName: string;
  flag: string;
  greeting: string;
  romanization?: string;
  speechCode: string;
}

export interface CodeLanguageItem {
  id: string;
  name: string;
  fileExtension: string;
  category: 'Modern Web' | 'Systems' | 'Backend' | 'Mobile' | 'Scripting';
  code: string;
  explanationVi: string;
  explanationEn: string;
}
