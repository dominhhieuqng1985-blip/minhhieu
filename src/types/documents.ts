export interface PayPalSettings {
  enabled: boolean;
  clientId: string;
  mode: 'sandbox' | 'live';
  currency: string;
  defaultPrice: number;
  buttonText: string;
}

export interface DocumentSettings {
  enablePaywall: boolean;
  allowedExtensions: string[];
  maxFileSizeMb: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: 'pdf' | 'zip' | 'doc' | 'docx' | 'excel' | 'xls' | 'xlsx' | string;
  fileUrl: string;
  fileData?: string; // base64 payload when uploaded directly
  isUploaded?: boolean;
  requirePayment: boolean;
  price: number;
  currency: string;
  description: string;
  downloadCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_PAYPAL_SETTINGS: PayPalSettings = {
  enabled: false,
  clientId: 'sb', // PayPal default sandbox client ID
  mode: 'sandbox',
  currency: 'USD',
  defaultPrice: 1.99,
  buttonText: 'Thanh toán qua PayPal để tải file',
};

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  enablePaywall: false, // Mặc định tắt, người dùng tải bình thường không cần trả tiền
  allowedExtensions: ['zip', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'rar', '7z', 'txt', 'csv'],
  maxFileSizeMb: 50,
};

export const INITIAL_DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-pdf-01',
    title: 'Kịch Bản Phim & Tuyển Tập Lời Thoại Xuyên Không (Bản Chuẩn PDF)',
    fileName: 'kich_ban_xuyen_khong_dai_duong.pdf',
    fileSize: '2.4 MB',
    fileType: 'pdf',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    requirePayment: false,
    price: 0,
    currency: 'USD',
    description: 'Kịch bản trích đoạn tập 1 đến tập 64 kênh Minh Hiếu Official VN định dạng PDF chuẩn Unicode có phân cảnh chi tiết.',
    downloadCount: 342,
    createdAt: '2026-10-25T10:00:00.000Z',
  },
  {
    id: 'doc-zip-02',
    title: 'Gói Audio Hiệu Ứng Âm Thanh & Nhạc Nền Podcast (Full Trọn Bộ ZIP)',
    fileName: 'am_thanh_hieu_ung_podcast.zip',
    fileSize: '18.6 MB',
    fileType: 'zip',
    fileUrl: 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.tar.bz2',
    requirePayment: true,
    price: 1.99,
    currency: 'USD',
    description: 'Tuyển tập 120 âm thanh hiệu ứng kịch tính, tiếng chuông chùa, nhạc dân ca miền Tây chất lượng cao 320kbps.',
    downloadCount: 189,
    createdAt: '2026-10-26T14:30:00.000Z',
  },
  {
    id: 'doc-word-03',
    title: 'Mẫu Kịch Bản Podcast Chuẩn Đài Phát Thanh (.docx)',
    fileName: 'mau_kich_ban_podcast_chuyen_nghiep.docx',
    fileSize: '640 KB',
    fileType: 'doc',
    fileUrl: 'https://calibre-ebook.com/dist/src',
    requirePayment: false,
    price: 0,
    currency: 'USD',
    description: 'Tài liệu Word soạn thảo kịch bản podcast có bảng phân vai, timeline giây và ghi chú âm lượng.',
    downloadCount: 254,
    createdAt: '2026-10-27T08:15:00.000Z',
  },
  {
    id: 'doc-excel-04',
    title: 'Bảng Kế Hoạch & Thống Kê Chỉ Số Lượt Xem Video Kênh (.xlsx)',
    fileName: 'bang_ke_hoach_phat_song.xlsx',
    fileSize: '480 KB',
    fileType: 'excel',
    fileUrl: 'https://calibre-ebook.com/dist/src',
    requirePayment: false,
    price: 0,
    currency: 'USD',
    description: 'Bảng tính Excel tự động tính tỷ lệ giữ chân khán giả, doanh thu ước tính và lịch đăng tải video/podcast.',
    downloadCount: 177,
    createdAt: '2026-10-28T16:45:00.000Z',
  },
];

export const STORAGE_KEY_DOCUMENTS = 'minhhieu_documents_library_v1';
export const STORAGE_KEY_PAYPAL_SETTINGS = 'minhhieu_paypal_settings_v1';
export const STORAGE_KEY_DOC_SETTINGS = 'minhhieu_doc_settings_v1';
export const STORAGE_KEY_PAID_DOCS = 'minhhieu_unlocked_paid_docs_v1';

export function getStoredPayPalSettings(): PayPalSettings {
  if (typeof window === 'undefined') return DEFAULT_PAYPAL_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYPAL_SETTINGS);
    if (raw) return { ...DEFAULT_PAYPAL_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PAYPAL_SETTINGS;
}

export function saveStoredPayPalSettings(s: PayPalSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PAYPAL_SETTINGS, JSON.stringify(s));
  } catch {}
}

export function getStoredDocumentSettings(): DocumentSettings {
  if (typeof window === 'undefined') return DEFAULT_DOCUMENT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOC_SETTINGS);
    if (raw) return { ...DEFAULT_DOCUMENT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_DOCUMENT_SETTINGS;
}

export function saveStoredDocumentSettings(s: DocumentSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DOC_SETTINGS, JSON.stringify(s));
  } catch {}
}

export function getStoredDocuments(): DocumentItem[] {
  if (typeof window === 'undefined') return INITIAL_DEFAULT_DOCUMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCUMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_DEFAULT_DOCUMENTS;
}

export function saveStoredDocuments(docs: DocumentItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DOCUMENTS, JSON.stringify(docs));
  } catch {}
}

export function getUnlockedPaidDocIds(): Set<string> {
  const set = new Set<string>();
  if (typeof window === 'undefined') return set;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAID_DOCS);
    if (raw) {
      const arr: string[] = JSON.parse(raw);
      arr.forEach((id) => set.add(id));
    }
  } catch {}
  return set;
}

export function markDocAsUnlocked(docId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getUnlockedPaidDocIds();
    set.add(docId);
    localStorage.setItem(STORAGE_KEY_PAID_DOCS, JSON.stringify(Array.from(set)));
  } catch {}
}

export function detectFileType(fileNameOrExt: string): 'pdf' | 'zip' | 'doc' | 'excel' | 'other' {
  const lower = fileNameOrExt.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z') || lower.endsWith('.tar') || lower.endsWith('.gz')) return 'zip';
  if (lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.txt') || lower.endsWith('.rtf') || lower.endsWith('.odt')) return 'doc';
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv') || lower.endsWith('.ods')) return 'excel';
  return 'other';
}
