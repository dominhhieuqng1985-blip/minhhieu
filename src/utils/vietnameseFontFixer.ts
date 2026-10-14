/**
 * Utility to fix Vietnamese font errors, corrupted binary data (e.g. C#CY-,F#pF>...),
 * legacy font encodings (TCVN3/ABC, VNI-Windows), and extract clean text from .docx via JSZip.
 */
import JSZip from 'jszip';

// TCVN3 (ABC) to Unicode mapping
const TCVN3_MAP: Record<string, string> = {
  'µ': 'à', '¸': 'á', '¶': 'ả', '·': 'ã', '¹': 'ạ',
  '¨': 'ă', '»': 'ằ', '¾': 'ắ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
  '©': 'â', 'Ç': 'ầ', 'Ê': 'ấ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ',
  'Ì': 'è', 'Ð': 'é', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ñ': 'ẹ',
  'ª': 'ê', 'Ò': 'ề', 'Õ': 'ế', 'Ó': 'ể', 'Ô': 'ễ', 'Ö': 'ệ',
  '×': 'ì', 'Ý': 'í', 'Ø': 'ỉ', 'Ü': 'ĩ', 'Þ': 'ị',
  'ß': 'ò', 'á': 'ó', 'à': 'ỏ', 'ã': 'õ', 'ä': 'ọ',
  '«': 'ô', 'å': 'ồ', 'è': 'ố', 'æ': 'ổ', 'ç': 'ỗ', 'é': 'ộ',
  '¬': 'ơ', 'ê': 'ờ', 'í': 'ớ', 'ë': 'ở', 'ì': 'ỡ', 'î': 'ợ',
  'ï': 'ù', 'ó': 'ú', 'ñ': 'ủ', 'ò': 'ũ', 'ô': 'ụ',
  '­': 'ư', 'õ': 'ừ', 'ø': 'ứ', 'ö': 'ử', '÷': 'ữ', 'ù': 'ự',
  'ú': 'ỳ', 'ý': 'ý', 'û': 'ỷ', 'ü': 'ỹ', 'þ': 'ỵ',
  '®': 'đ', '§': 'Đ',
};

// VNI to Unicode mapping (2-byte sequences)
const VNI_MAP: Record<string, string> = {
  'aø': 'à', 'aù': 'á', 'aû': 'ả', 'aõ': 'ã', 'aï': 'ạ',
  'aê': 'ă', 'aè': 'ằ', 'aé': 'ắ', 'aú': 'ẳ', 'aü': 'ẵ', 'aë': 'ặ',
  'aâ': 'â', 'aà': 'ầ', 'aá': 'ấ', 'aå': 'ẩ', 'aã': 'ẫ', 'aä': 'ậ',
  'eø': 'è', 'eù': 'é', 'eû': 'ẻ', 'eõ': 'ẽ', 'eï': 'ẹ',
  'eâ': 'ê', 'eà': 'ề', 'eá': 'ế', 'eå': 'ể', 'eã': 'ễ', 'eä': 'ệ',
  'iø': 'ì', 'iù': 'í', 'iû': 'ỉ', 'ó': 'ĩ', 'ò': 'ị',
  'oø': 'ò', 'où': 'ó', 'oû': 'ỏ', 'oõ': 'õ', 'oï': 'ọ',
  'oâ': 'ô', 'oà': 'ồ', 'oá': 'ố', 'oå': 'ổ', 'oã': 'ỗ', 'oä': 'ộ',
  'ôø': 'ờ', 'ôù': 'ớ', 'ôû': 'ở', 'ôõ': 'ỡ', 'ôï': 'ợ',
  'uø': 'ù', 'uù': 'ú', 'uû': 'ủ', 'uõ': 'ũ', 'uï': 'ụ',
  'öø': 'ừ', 'öù': 'ứ', 'öû': 'ử', 'öõ': 'ữ', 'öï': 'ự',
  'yø': 'ỳ', 'yù': 'ý', 'yû': 'ỷ', 'yõ': 'ỹ', 'î': 'ỵ',
  'ñ': 'đ', 'Ñ': 'Đ',
};

/**
 * Detects if a text contains corrupted binary / deflated stream rubbish
 * (such as "C#CY-,F#pF>F#pFE: -,+%E%Ej@`%#D!!!-,...")
 */
export function containsBinaryJunk(text: string): boolean {
  if (!text || text.length === 0) return false;
  // Patterns typical of raw compressed zip/pdf stream decoding:
  if (
    /C#CY|%E%Ej|#D!!!|#da\\X|F#p|G#DGz/.test(text) ||
    /(\ufffd{2,})|([\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]{3,})/.test(text)
  ) {
    return true;
  }
  // Count non-printable or suspicious characters vs printable text
  const cleanMatches = text.match(/[\p{L}\p{N}\s.,?!;:'"()\-–—]/gu);
  const printableCount = cleanMatches ? cleanMatches.length : 0;
  const ratio = printableCount / text.length;
  return ratio < 0.65 && text.length > 30;
}

/**
 * Cleans out binary garbage, control characters, and unprintable artifacts
 */
export function cleanBinaryJunk(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove known deflate/binary fragments like C#CY-,...
  cleaned = cleaned.replace(/C#CY-[^ \n\r]*/g, '');
  cleaned = cleaned.replace(/[A-Za-z0-9#%+\-@`!\\/]{10,}(?=\s|-[-,]|$)/g, (match) => {
    // If it has heavy symbols like % # @ ` ! without normal vowels, it's binary junk
    if (/[#%@`!\\]/.test(match) && !/[aeiouyáàảãạâăéèẻẽẹêíìỉĩịóòỏõọôơúùủũụưýỳỷỹỵ]/i.test(match)) {
      return '';
    }
    return match;
  });

  // Strip replacement char  and control codes
  cleaned = cleaned.replace(/\ufffd+/g, ' ');
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');

  // Collapse consecutive spaces and repeated punctuation marks
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Converts legacy TCVN3 (ABC) characters to standard Unicode
 */
export function convertTcvn3ToUnicode(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    result += TCVN3_MAP[ch] || ch;
  }
  return result;
}

/**
 * Converts legacy VNI-Windows characters to standard Unicode
 */
export function convertVniToUnicode(text: string): string {
  if (!text) return '';
  let result = text;
  for (const [vni, uni] of Object.entries(VNI_MAP)) {
    result = result.split(vni).join(uni);
  }
  return result;
}

/**
 * Comprehensive Vietnamese font & text repair
 * 1. Removes binary rubbish (C#CY-, compressed streams, null bytes)
 * 2. Normalizes Unicode to NFC (Precomposed characters: combining accents into standard 'á', 'ế', 'ơ', etc.)
 * 3. Detects & repairs TCVN3 and VNI encoding
 * 4. Fixes common broken character artifacts
 */
export function repairVietnameseFont(input: string): {
  repairedText: string;
  detectedIssues: string[];
  wasModified: boolean;
} {
  if (!input) return { repairedText: '', detectedIssues: [], wasModified: false };

  const issues: string[] = [];
  let current = input;

  // 1. Check & clean binary junk
  if (containsBinaryJunk(current)) {
    issues.push('Phát hiện chuỗi nhị phân nén / ký tự rác (C#CY-, stream nén)');
    current = cleanBinaryJunk(current);
  }

  // 2. Unicode normalization (NFC) - combines separate diacritic marks into true Vietnamese letters
  const normalized = current.normalize('NFC');
  if (normalized !== current) {
    issues.push('Chuẩn hóa tổ hợp dấu Unicode sang dạng dựng sẵn (NFC)');
    current = normalized;
  }

  // 3. Check for TCVN3 signatures
  const tcvn3CharCount = (current.match(/[µ¸¶·¹¨»¾¼½Æ©ÇÊÈÉËÌÐÎÏÑªÒÕÓÔÖ×ÝØÜÞßáàãä«åèæçé¬êíëìîïóñòô­õøö÷ùúýûüþ®§]/g) || []).length;
  if (tcvn3CharCount > 5) {
    const converted = convertTcvn3ToUnicode(current);
    if (converted !== current) {
      issues.push(`Chuyển đổi ${tcvn3CharCount} ký tự font cũ TCVN3 (ABC) sang Unicode chuẩn`);
      current = converted;
    }
  }

  // 4. Check for VNI signatures
  if (/a[øùûõïèéúüëàáåãä]|e[øùûõïàáåãä]|ñ|Ñ/.test(current)) {
    const vniConverted = convertVniToUnicode(current);
    if (vniConverted !== current) {
      issues.push('Chuyển đổi font VNI-Windows sang Unicode chuẩn');
      current = vniConverted;
    }
  }

  // 5. Final cleaning of dangling symbols
  current = current
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return {
    repairedText: current,
    detectedIssues: issues,
    wasModified: current !== input,
  };
}

/**
 * Extracts clean, full Unicode text and paragraphs from a .docx file using JSZip
 * Completely prevents raw zip stream decompression corruption (C#CY-, ...)
 */
export async function extractTextFromDocxFile(arrayBuffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Read word/document.xml
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('Tệp DOCX không chứa word/document.xml hợp lệ');
  }

  const docXml = await docXmlFile.async('string');

  // Parse paragraphs <w:p>
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXml, 'application/xml');

  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    // Fallback: regex extraction of paragraphs
    const paragraphs: string[] = [];
    const pMatches = docXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) || [];
    for (const p of pMatches) {
      const texts = p.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
      const line = texts
        .map((t) => t.replace(/<[^>]+>/g, ''))
        .join('')
        .trim();
      if (line) paragraphs.push(line);
    }
    return paragraphs.join('\n\n').normalize('NFC');
  }

  const paragraphs: string[] = [];
  const pNodes = xmlDoc.getElementsByTagName('w:p');

  for (let i = 0; i < pNodes.length; i++) {
    const p = pNodes[i];
    const textNodes = p.getElementsByTagName('w:t');
    let pText = '';
    for (let j = 0; j < textNodes.length; j++) {
      pText += textNodes[j].textContent || '';
    }
    if (pText.trim()) {
      paragraphs.push(pText.trim());
    }
  }

  // Also check word/footnotes.xml and word/endnotes.xml if present
  const result = paragraphs.join('\n\n').normalize('NFC');
  return result;
}
