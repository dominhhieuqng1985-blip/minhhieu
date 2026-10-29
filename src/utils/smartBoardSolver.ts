export interface SolvedBoardStep {
  stepNumber: number;
  title: string;
  content: string;
  formula?: string;
}

export interface SolvedBoardResult {
  boardTitle: string;
  subject: string;
  extractedText: string;
  coreConcept: string;
  steps: SolvedBoardStep[];
  finalAnswer: string;
  teacherAdvice: string;
  spokenExplanation: string;
  englishPhrase?: string;
  phoneticIpa?: string;
  englishExamples?: { en: string; ipa?: string; vi: string }[];
  isExactDeterministic: boolean;
}

export interface EntertainmentCommandMatch {
  isEntertainment: boolean;
  query: string;
  autoPlay: boolean;
}

/**
 * Detects if a user's spoken or typed input is a command to search/play music or YouTube entertainment on the Smart Board.
 */
export function parseEntertainmentCommand(rawInput: string): EntertainmentCommandMatch {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { isEntertainment: false, query: '', autoPlay: false };
  }

  // Direct YouTube URL
  if (/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i.test(trimmed)) {
    return { isEntertainment: true, query: trimmed, autoPlay: true };
  }

  const musicCmdMatch = trimmed.match(
    /^(?:thầy ơi\s*)?(?:hãy\s+|cho em\s+|giúp em\s+)?(?:mở|bật|phát|nghe|tìm|chơi)\s+((?:bản\s+)?(?:nhạc|bài hát|ca khúc|mv|video nhạc|giai điệu).*)$/i
  );
  if (musicCmdMatch) {
    const cleanQuery = musicCmdMatch[1]
      .replace(/\s+trên\s+youtube\b/i, '')
      .trim()
      .replace(/[?.!]+$/, '');
    return {
      isEntertainment: true,
      query: cleanQuery || 'nhạc thiếu nhi & lofi học bài',
      autoPlay: true,
    };
  }

  const otherPatterns: RegExp[] = [
    /^(?:thầy ơi\s*)?(?:tiết mục\s+)?giải trí\s*[:\-]?\s*(.*)$/i,
    /^(?:play\s+(?:music|song|video)|search\s+youtube)\s*[:\-]?\s*(.*)$/i,
    /^(?:mở|bật|phát)\s+youtube\s*[:\-]?\s*(.*)$/i,
  ];

  for (const regex of otherPatterns) {
    const match = trimmed.match(regex);
    if (match) {
      const extracted = (match[1] || '').trim().replace(/[?.!]+$/, '');
      return {
        isEntertainment: true,
        query: extracted || 'nhạc lofi học bài thư giãn',
        autoPlay: true,
      };
    }
  }

  return { isEntertainment: false, query: '', autoPlay: false };
}

// ============================================================================
// SAFE RECURSIVE-DESCENT MATHEMATICAL EXPRESSION PARSER
// Supports +, -, *, /, ^, %, parentheses, unary +/-, sqrt(), sin/cos/tan, pi
// ============================================================================

interface Token {
  type: 'num' | 'op' | 'lparen' | 'rparen' | 'ident';
  value: string;
  numValue?: number;
}

function tokenizeMath(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.trim();

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let dotCount = 0;
      while (i < s.length && /[0-9.]/.test(s[i])) {
        if (s[i] === '.') dotCount++;
        if (dotCount > 1) return null;
        numStr += s[i];
        i++;
      }
      const val = Number(numStr);
      if (!Number.isFinite(val)) return null;
      tokens.push({ type: 'num', value: numStr, numValue: val });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
        id += s[i];
        i++;
      }
      // Implicit multiplication like 3x -> 3 * x
      if (tokens.length > 0) {
        const prev = tokens[tokens.length - 1];
        if (prev.type === 'num' || prev.type === 'rparen') {
          tokens.push({ type: 'op', value: '*' });
        }
      }
      tokens.push({ type: 'ident', value: id.toLowerCase() });
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      if (tokens.length > 0) {
        const prev = tokens[tokens.length - 1];
        if (prev.type === 'num' || prev.type === 'rparen' || (prev.type === 'ident' && prev.value === 'x')) {
          tokens.push({ type: 'op', value: '*' });
        }
      }
      tokens.push({ type: 'lparen', value: '(' });
      i++;
      continue;
    }

    if (ch === ')' || ch === ']' || ch === '}') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
      continue;
    }

    if ('+-*/^%'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    return null;
  }

  return tokens;
}

export function evalMathExpression(rawExpr: string, vars: Record<string, number> = {}): number | null {
  const tokens = tokenizeMath(rawExpr);
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;

  function peek(): Token | undefined {
    return tokens![pos];
  }

  function consume(): Token {
    return tokens![pos++];
  }

  function parseAddSub(): number | null {
    let left = parseMulDiv();
    if (left === null) return null;
    while (peek()?.type === 'op' && (peek()!.value === '+' || peek()!.value === '-')) {
      const op = consume().value;
      const right = parseMulDiv();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number | null {
    let left = parsePower();
    if (left === null) return null;
    while (peek()?.type === 'op' && (peek()!.value === '*' || peek()!.value === '/')) {
      const op = consume().value;
      const right = parsePower();
      if (right === null) return null;
      if (op === '/') {
        if (Math.abs(right) < 1e-12) return NaN;
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function parsePower(): number | null {
    let base = parsePostfix();
    if (base === null) return null;
    if (peek()?.type === 'op' && peek()!.value === '^') {
      consume();
      const exp = parsePower();
      if (exp === null) return null;
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parsePostfix(): number | null {
    let val = parseUnary();
    if (val === null) return null;
    while (peek()?.type === 'op' && peek()!.value === '%') {
      consume();
      val = val / 100;
    }
    return val;
  }

  function parseUnary(): number | null {
    if (peek()?.type === 'op' && (peek()!.value === '+' || peek()!.value === '-')) {
      const op = consume().value;
      const inner = parseUnary();
      if (inner === null) return null;
      return op === '-' ? -inner : inner;
    }
    return parsePrimary();
  }

  function parsePrimary(): number | null {
    const tok = peek();
    if (!tok) return null;

    if (tok.type === 'num') {
      consume();
      return tok.numValue!;
    }

    if (tok.type === 'lparen') {
      consume();
      const inside = parseAddSub();
      if (inside === null) return null;
      if (peek()?.type !== 'rparen') return null;
      consume();
      return inside;
    }

    if (tok.type === 'ident') {
      consume();
      const name = tok.value;
      if (peek()?.type === 'lparen') {
        consume();
        const arg = parseAddSub();
        if (arg === null || peek()?.type !== 'rparen') return null;
        consume();
        if (name === 'sqrt' || name === 'can') return arg < 0 ? NaN : Math.sqrt(arg);
        if (name === 'abs') return Math.abs(arg);
        if (name === 'sin') return Math.sin((arg * Math.PI) / 180);
        if (name === 'cos') return Math.cos((arg * Math.PI) / 180);
        if (name === 'tan') return Math.tan((arg * Math.PI) / 180);
        return null;
      }
      if (name === 'pi') return Math.PI;
      if (Object.prototype.hasOwnProperty.call(vars, name)) {
        return vars[name];
      }
      return null;
    }

    return null;
  }

  const result = parseAddSub();
  if (result === null || pos !== tokens.length || !Number.isFinite(result)) {
    return null;
  }
  return result;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Formats a numeric result cleanly (integer if exact, fraction + decimal if rational)
 */
export function formatExactNumber(val: number): { main: string; spoken: string; fraction?: string } {
  if (Math.abs(val - Math.round(val)) < 1e-9) {
    const rounded = Math.round(val);
    return {
      main: String(rounded),
      spoken: rounded < 0 ? `âm ${Math.abs(rounded)}` : String(rounded),
    };
  }

  // Check if val matches a clean fraction p/q with q <= 100
  for (let q = 2; q <= 100; q++) {
    const p = val * q;
    if (Math.abs(p - Math.round(p)) < 1e-7) {
      const pInt = Math.round(p);
      const d = gcd(pInt, q);
      const num = pInt / d;
      const den = q / d;
      const decStr = Number(val.toFixed(4)).toString();
      if (den > 1 && den <= 50) {
        return {
          main: `${decStr} (phân số: ${num}/${den})`,
          spoken: `${decStr.replace('.', ' phẩy ')}, tức phân số ${num} phần ${den}`,
          fraction: `${num}/${den}`,
        };
      }
    }
  }

  const fixed = Number(val.toFixed(4)).toString();
  return {
    main: fixed,
    spoken: fixed.replace('.', ' phẩy '),
  };
}

/**
 * Normalizes Vietnamese/Unicode math text into clean evaluable syntax
 */
function normalizeMathInput(raw: string): string {
  let s = raw
    .trim()
    .replace(/√\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/[×✕⋅]/g, '*')
    .replace(/÷/g, '/')
    // Convert ':' to division ONLY when between math operands (e.g. 120 : 2 or (a+b) : 2)
    .replace(/([\d)xXyY])\s*:\s*([\d(xXyY\-+])/g, '$1 / $2')
    .replace(/[−–—]/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');

  // Convert comma decimal like 2,5 -> 2.5 when between digits
  s = s.replace(/(\d),(\d)/g, '$1.$2');

  // Convert spoken Vietnamese math operators when surrounded by spaces/numbers
  const viNumMap: Record<string, string> = {
    không: '0',
    một: '1',
    hai: '2',
    ba: '3',
    bốn: '4',
    năm: '5',
    sáu: '6',
    bảy: '7',
    tám: '8',
    chín: '9',
    mười: '10',
  };

  if (/\b(cộng|trừ|nhân|chia|mũ)\b/i.test(s)) {
    for (const [word, digit] of Object.entries(viNumMap)) {
      s = s.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
    }
    s = s
      .replace(/\bcộng\s+với\b|\bcộng\b/gi, '+')
      .replace(/\btrừ\s+đi\b|\btrừ\b/gi, '-')
      .replace(/\bnhân\s+với\b|\bnhân\b/gi, '*')
      .replace(/\bchia\s+cho\b|\bchia\b/gi, '/')
      .replace(/\bmũ\b/gi, '^');
  }

  // Handle 'x' used as multiplication between numbers: e.g. "12 x 5" -> "12 * 5"
  s = s.replace(/(\d|\))\s*[xX]\s*(\d|\()/g, '$1 * $2');

  return s;
}

// ============================================================================
// 1. MULTIPLE-CHOICE QUESTION PARSER & DETERMINISTIC SOLVER (A, B, C, D)
// ============================================================================

interface ParsedChoice {
  letter: string;
  rawLetter: string;
  text: string;
}

function parseMultipleChoiceQuestion(raw: string): { stem: string; choices: ParsedChoice[] } | null {
  // Match patterns like:
  // "... A. 10  B. 20  C. 30  D. 40" or multiline "A) ...\nB) ...\nC) ...\nD) ..."
  // Also handles lowercase or slightly messy labels like "a, 1  b, 3  c, 2"
  const optionRegex = /(?:^|[\s,;|\n])([A-Da-d])\s*[.):,-]\s*(?=\S)/g;
  const matches: { index: number; matchLen: number; rawLetter: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = optionRegex.exec(raw)) !== null) {
    const startIdx = m.index + (m[0].length - m[0].trimStart().length);
    const trimmedMatch = m[0].trimStart();
    matches.push({
      index: startIdx,
      matchLen: trimmedMatch.length,
      rawLetter: m[1].toUpperCase(),
    });
  }

  if (matches.length < 2) return null;

  // Use the last group of 2..5 options at the end of the question
  const tailMatches = matches.slice(-5);
  const firstOpt = tailMatches[0];
  const stem = raw.slice(0, firstOpt.index).trim();
  if (!stem) return null;

  const standardLetters = ['A', 'B', 'C', 'D', 'E'];
  const usedLetters = new Set<string>();
  const hasDuplicates = tailMatches.some((item) => {
    if (usedLetters.has(item.rawLetter)) return true;
    usedLetters.add(item.rawLetter);
    return false;
  });

  const choices: ParsedChoice[] = tailMatches.map((item, idx) => {
    const contentStart = item.index + item.matchLen;
    const contentEnd = idx + 1 < tailMatches.length ? tailMatches[idx + 1].index : raw.length;
    const text = raw
      .slice(contentStart, contentEnd)
      .trim()
      .replace(/[,;|\s]+$/, '');
    // If user accidentally typed "a, c, c" keep awareness of position if duplicate, or preserve uppercase letter
    const letter =
      hasDuplicates && idx < standardLetters.length ? standardLetters[idx] : item.rawLetter;
    return {
      letter,
      rawLetter: item.rawLetter,
      text,
    };
  });

  if (choices.some((c) => !c.text)) return null;
  return { stem, choices };
}

function extractMathValueFromOption(optText: string): number | null {
  const cleaned = normalizeMathInput(
    optText
      .replace(/^[xXyY]\s*=\s*/i, '')
      .replace(/\s*(cm2|cm²|m2|m²|cm|mm|dm|km|m|kg|g|lít|giờ|phút|giây|độ|tuổi|quả|cái|con|bạn)\b.*$/i, '')
      .trim()
  );
  return evalMathExpression(cleaned);
}

function trySolveMultipleChoiceDeterministically(
  rawPrompt: string,
  grade: number,
  subject: string,
  studentName: string
): SolvedBoardResult | null {
  const parsed = parseMultipleChoiceQuestion(rawPrompt);
  if (!parsed) return null;

  const { stem, choices } = parsed;

  // Try solving the stem as an arithmetic expression, algebra equation, percentage, or word problem!
  const stemSolved =
    trySolveLinearOrQuadraticEquation(stem, grade, studentName) ||
    trySolvePureArithmetic(stem, grade, studentName) ||
    trySolvePercentageExpr(stem, grade, studentName) ||
    trySolveWordProblemDeterministically(stem, grade, studentName);

  if (stemSolved && stemSolved.numericValue !== undefined) {
    const targetVal = stemSolved.numericValue;
    let winningChoice: ParsedChoice | null = null;

    for (const ch of choices) {
      const optVal = extractMathValueFromOption(ch.text);
      if (optVal !== null && Math.abs(optVal - targetVal) < 1e-6) {
        winningChoice = ch;
        break;
      }
    }

    if (winningChoice) {
      const choiceSummary = choices.map((c) => `${c.letter}. ${c.text}`).join('   |   ');
      const formattedTarget = formatExactNumber(targetVal);
      const chosenLabel = winningChoice.rawLetter || winningChoice.letter;

      const steps: SolvedBoardStep[] = [
        {
          stepNumber: 1,
          title: 'Bước 1: Phân tích câu hỏi và các phương án trắc nghiệm',
          content: `Đề bài yêu cầu xác định kết quả đúng cho câu hỏi: "${stem}" và đối chiếu với các lựa chọn.`,
          formula: choiceSummary,
        },
        ...stemSolved.result.steps.map((s, idx) => ({
          stepNumber: idx + 2,
          title: s.title.replace(/^Bước\s*\d+\s*:\s*/i, `Bước ${idx + 2}: `),
          content: s.content,
          formula: s.formula,
        })),
        {
          stepNumber: stemSolved.result.steps.length + 2,
          title: `Bước ${stemSolved.result.steps.length + 2}: Đối chiếu các đáp án và kết luận`,
          content: `Kết quả tính được là ${formattedTarget.main}, trùng khớp hoàn toàn với phương án ${chosenLabel} (${winningChoice.text}). Các phương án còn lại không khớp với kết quả.`,
          formula: `Kết quả = ${formattedTarget.main} ⇒ Chọn đáp án ${chosenLabel}`,
        },
      ];

      return {
        boardTitle: `Giải Trắc Nghiệm Lớp ${grade} • Chọn Đáp Án Chính Xác`,
        subject: subject || 'toan',
        extractedText: `${stem}\n${choices.map((c) => `${c.letter}. ${c.text}`).join('\n')}`,
        coreConcept: stemSolved.result.coreConcept,
        steps,
        finalAnswer: `Kết luận: Chọn đáp án ${chosenLabel} (${winningChoice.text})`,
        teacherAdvice: `Khi làm bài trắc nghiệm, em luôn tính ra kết quả cụ thể (${formattedTarget.main}) trước rồi mới khoanh vào chữ cái ${chosenLabel} để không bị nhầm nhé!`,
        spokenExplanation: `Chào ${studentName}! Với câu trắc nghiệm này, sau khi tính toán ta được kết quả bằng ${formattedTarget.spoken}. Đối chiếu các phương án trên bảng, kết luận đáp án đúng chính xác là đáp án ${chosenLabel}: ${winningChoice.text} nhé!`,
        isExactDeterministic: true,
      };
    }
  }

  return null;
}

// ============================================================================
// 2. PURE ARITHMETIC & PERCENTAGE SOLVER (e.g., "1 + 1", "1 + 1 = 2", "(25 + 15) * 3")
// ============================================================================

function trySolvePercentageExpr(
  rawPrompt: string,
  grade: number,
  studentName: string
): { result: SolvedBoardResult; numericValue: number } | null {
  const m = rawPrompt
    .trim()
    .match(/(?:tính\s*)?(\d+(?:[.,]\d+)?)\s*%\s*(?:của|of)\s*(\d+(?:[.,]\d+)?)/i);
  if (!m) return null;

  const pct = Number(m[1].replace(',', '.'));
  const total = Number(m[2].replace(',', '.'));
  if (!Number.isFinite(pct) || !Number.isFinite(total)) return null;

  const ans = (pct / 100) * total;
  const formatted = formatExactNumber(ans);

  return {
    numericValue: ans,
    result: {
      boardTitle: `Toán Lớp ${grade}: Tính Giá Trị Phần Trăm Của Một Số`,
      subject: 'toan',
      extractedText: rawPrompt.trim(),
      coreConcept: `Muốn tìm a% của số B, ta lấy B × a : 100`,
      steps: [
        {
          stepNumber: 1,
          title: 'Bước 1: Xác định số tổng và tỉ số phần trăm',
          content: `Ta cần tìm ${pct}% của số ${total}.`,
          formula: `${total} × ${pct} : 100`,
        },
        {
          stepNumber: 2,
          title: 'Bước 2: Thực hiện phép tính',
          content: `Lấy ${total} nhân với ${pct} được ${Number((total * pct).toFixed(4))}, sau đó chia cho 100 được ${formatted.main}.`,
          formula: `${total} × ${pct} : 100 = ${formatted.main}`,
        },
      ],
      finalAnswer: `Kết quả: ${formatted.main}`,
      teacherAdvice: 'Em nhớ chia cho 100 bằng cách dịch dấu phẩy sang bên trái 2 chữ số thật nhanh nhé!',
      spokenExplanation: `Chào ${studentName}! Để tìm ${pct} phần trăm của ${total}, ta lấy ${total} nhân ${pct} rồi chia cho 100, kết quả cuối cùng bằng ${formatted.spoken} nhé!`,
      isExactDeterministic: true,
    },
  };
}

function trySolvePureArithmetic(
  rawPrompt: string,
  grade: number,
  studentName: string
): { result: SolvedBoardResult; numericValue: number } | null {
  let cleaned = rawPrompt
    .trim()
    .replace(
      /^(?:thầy ơi\s*)?(?:hãy\s+|giúp em\s+|chỉ em\s+)?(?:tính\s+nhẩm|tính\s+giá\s+trị\s+biểu\s+thức|tính\s+nhanh|thực\s+hiện\s+phép\s+tính|kết\s+quả\s+của\s+phép\s+tính|kết\s+quả\s+của|giá\s+trị\s+của|tính|cho\s+biết|giải)\s*[:\-]?\s*/i,
      ''
    )
    .replace(
      /\s*(?:có\s+kết\s+quả\s+là|bằng\s+bao\s+nhiêu|bằng\s+mấy|là\s+bao\s+nhiêu|là\s+mấy|đúng\s+không|phải\s+không|bằng|là|\?+)\s*[:?.!,\-]*$/i,
      ''
    )
    .replace(/[:?.!,\-]+$/, '')
    .trim();

  // Check if user wrote "1 + 1 = 2" or "1 + 1 = ?" or "1 + 1 ="
  let claimedRhs: number | null = null;
  let claimedRhsRaw = '';
  if (cleaned.includes('=')) {
    const parts = cleaned.split('=');
    if (parts.length !== 2) return null;
    const leftPart = parts[0].trim();
    const rightPart = parts[1].replace(/\?/g, '').trim();
    // If variable x or y is present, delegate to algebra solver instead
    if (/[a-df-zA-DF-Z]/.test(normalizeMathInput(leftPart)) || /[a-df-zA-DF-Z]/.test(normalizeMathInput(rightPart))) {
      return null;
    }
    cleaned = leftPart;
    if (rightPart) {
      const rhsVal = evalMathExpression(normalizeMathInput(rightPart));
      if (rhsVal !== null) {
        claimedRhs = rhsVal;
        claimedRhsRaw = rightPart;
      } else {
        return null;
      }
    }
  }

  const normalized = normalizeMathInput(cleaned);
  // Must contain at least one arithmetic operator or function, and no free variables
  if (!/[+\-*/^%]|sqrt|sin|cos|tan/i.test(normalized)) {
    return null;
  }

  const val = evalMathExpression(normalized);
  if (val === null) return null;

  const formatted = formatExactNumber(val);
  const prettyExpr = cleaned
    .replace(/\*/g, '×')
    .replace(/\s+/g, ' ')
    .trim();

  // Identify operator breakdown for clear pedagogical steps
  const hasParen = /[()]/.test(normalized);
  const hasMulDiv = /[*/]/.test(normalized);
  const hasAddSub = /[+\-]/.test(normalized.replace(/^[+\-]/, ''));

  const steps: SolvedBoardStep[] = [];
  if (hasParen || (hasMulDiv && hasAddSub)) {
    steps.push({
      stepNumber: 1,
      title: 'Bước 1: Xác định thứ tự thực hiện phép tính',
      content: hasParen
        ? 'Biểu thức có dấu ngoặc nên ta thực hiện phép tính trong ngoặc trước, sau đó nhân chia trước, cộng trừ sau.'
        : 'Áp dụng quy tắc thứ tự thực hiện phép tính: Nhân và chia thực hiện trước, cộng và trừ thực hiện sau.',
      formula: `${prettyExpr}`,
    });
    steps.push({
      stepNumber: 2,
      title: 'Bước 2: Tính toán giá trị biểu thức',
      content: `Thực hiện lần lượt theo đúng thứ tự ưu tiên các phép toán, ta thu được giá trị chính xác là ${formatted.main}.`,
      formula: `${prettyExpr} = ${formatted.main}`,
    });
  } else {
    const opName = normalized.includes('+')
      ? 'phép cộng'
      : normalized.includes('-')
      ? 'phép trừ'
      : normalized.includes('*')
      ? 'phép nhân'
      : normalized.includes('/')
      ? 'phép chia'
      : 'phép tính';

    steps.push({
      stepNumber: 1,
      title: `Bước 1: Phân tích biểu thức ${opName}`,
      content: `Xác định các số và dấu phép toán trong biểu thức: ${prettyExpr}.`,
      formula: `${prettyExpr}`,
    });
    steps.push({
      stepNumber: 2,
      title: 'Bước 2: Thực hiện phép tính ra kết quả',
      content:
        claimedRhs !== null
          ? Math.abs(claimedRhs - val) < 1e-9
            ? `Thực hiện ${opName}: ${prettyExpr} = ${formatted.main}. Đối chiếu với vế phải (${claimedRhsRaw}) hoàn toàn chính xác!`
            : `Thực hiện ${opName}: ${prettyExpr} = ${formatted.main} (Lưu ý: vế phải ghi ${claimedRhsRaw} là chưa đúng, kết quả đúng phải bằng ${formatted.main}).`
          : `Thực hiện ${opName} trực tiếp trên các số đã cho, ta được kết quả bằng ${formatted.main}.`,
      formula: `${prettyExpr} = ${formatted.main}`,
    });
  }

  return {
    numericValue: val,
    result: {
      boardTitle: `Toán Lớp ${grade}: Tính Giá Trị Biểu Thức`,
      subject: 'toan',
      extractedText: claimedRhs !== null ? `${prettyExpr} = ${claimedRhsRaw}` : `${prettyExpr} = ?`,
      coreConcept:
        hasParen || (hasMulDiv && hasAddSub)
          ? 'Quy tắc: Trong ngoặc trước → Nhân chia trước → Cộng trừ sau'
          : `${prettyExpr} = ${formatted.main}`,
      steps,
      finalAnswer: `Kết quả cuối cùng: ${formatted.main}   (${prettyExpr} = ${formatted.main})`,
      teacherAdvice: 'Em luôn kiểm tra lại dấu phép tính và tính nhẩm ngược lại một lần để chắc chắn 100% điểm tối đa nhé!',
      spokenExplanation: `Chào ${studentName}! Với phép tính ${prettyExpr.replace(/×/g, ' nhân ').replace(/\//g, ' chia ').replace(/\+/g, ' cộng ').replace(/-/g, ' trừ ')}, kết quả cuối cùng bằng ${formatted.spoken} nhé!`,
      isExactDeterministic: true,
    },
  };
}

// ============================================================================
// 3. LINEAR & QUADRATIC EQUATION SOLVER ("Tìm x": e.g., 3x + 15 = 45, x^2 - 5x + 6 = 0)
// ============================================================================

function trySolveLinearOrQuadraticEquation(
  rawPrompt: string,
  grade: number,
  studentName: string
): { result: SolvedBoardResult; numericValue?: number } | null {
  // Extract equation portion containing '=' and variable x
  const cleanedPrompt = rawPrompt
    .trim()
    .replace(
      /^(?:thầy ơi\s*)?(?:chỉ\s+em\s+cách\s+giải\s+bài\s+toán\s+|giúp\s+em\s+|hãy\s+)?(?:nghiệm\s+của\s+phương\s+trình|giải\s+phương\s+trình\s+tìm\s+x|giải\s+phương\s+trình|tìm\s+số\s+tự\s+nhiên\s+x\s+biết|tìm\s+x\s*,?\s*biết|tìm\s+x\s+trong\s+phép\s+tính|tìm\s+x|giải)\s*[:\-]?\s*/i,
      ''
    )
    .replace(/\s*(?:từng\s+bước\s+ạ|từng\s+bước|là\s+bao\s+nhiêu|là|bằng|\?+)\s*[:?.!]*$/i, '')
    .replace(/[:?.!,\-]+$/, '')
    .trim();

  if (!cleanedPrompt.includes('=')) return null;
  const eqParts = cleanedPrompt.split('=');
  if (eqParts.length !== 2) return null;

  const lhsRaw = eqParts[0].trim();
  const rhsRaw = eqParts[1].trim();
  if (!lhsRaw || !rhsRaw) return null;

  // Prepare math expressions where 'x' is a variable (not multiplication)
  const prepAlg = (side: string) =>
    side
      .replace(/√\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)')
      .replace(/[×✕⋅]/g, '*')
      .replace(/÷/g, '/')
      .replace(/([\d)xXyY])\s*:\s*([\d(xXyY\-+])/g, '$1 / $2')
      .replace(/[−–—]/g, '-')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/(\d),(\d)/g, '$1.$2');

  const lhsExpr = prepAlg(lhsRaw);
  const rhsExpr = prepAlg(rhsRaw);

  if (!/\bx\b|\d\s*x/i.test(`${lhsExpr} ${rhsExpr}`)) return null;

  const evalDiff = (xVal: number): number | null => {
    const l = evalMathExpression(lhsExpr, { x: xVal });
    const r = evalMathExpression(rhsExpr, { x: xVal });
    if (l === null || r === null) return null;
    return l - r;
  };

  const h0 = evalDiff(0);
  const h1 = evalDiff(1);
  const h2 = evalDiff(2);
  const h3 = evalDiff(3);
  if (h0 === null || h1 === null || h2 === null || h3 === null) return null;

  const d1_0 = h1 - h0;
  const d1_1 = h2 - h1;
  const d1_2 = h3 - h2;

  const d2_0 = d1_1 - d1_0;
  const d2_1 = d1_2 - d1_1;

  // CASE A: Linear equation a*x + b = 0
  if (Math.abs(d2_0) < 1e-7 && Math.abs(d2_1) < 1e-7) {
    const a = d1_0;
    const b = h0;

    if (Math.abs(a) < 1e-9) {
      const infinite = Math.abs(b) < 1e-9;
      return {
        result: {
          boardTitle: `Toán Lớp ${grade}: Giải Phương Trình Tìm X`,
          subject: 'toan',
          extractedText: `${lhsRaw} = ${rhsRaw}`,
          coreConcept: 'Rút gọn hai vế đưa về dạng a·x = b',
          steps: [
            {
              stepNumber: 1,
              title: 'Bước 1: Chuyển vế và thu gọn hạng tử chứa x',
              content: 'Sau khi thu gọn các hạng tử chứa x ở hai vế, hệ số của x bằng 0.',
              formula: `0·x = ${formatExactNumber(-b).main}`,
            },
            {
              stepNumber: 2,
              title: 'Bước 2: Biện luận kết luận',
              content: infinite
                ? 'Đẳng thức 0 = 0 luôn đúng với mọi giá trị của x.'
                : 'Không có giá trị nào của x nhân với 0 khác 0.',
            },
          ],
          finalAnswer: infinite ? 'Kết luận: Phương trình có vô số nghiệm (đúng với mọi x).' : 'Kết luận: Phương trình vô nghiệm (không có giá trị x thỏa mãn).',
          teacherAdvice: 'Khi hệ số của x triệt tiêu bằng 0, em cần kiểm tra hằng số còn lại để kết luận vô nghiệm hay vô số nghiệm nhé!',
          spokenExplanation: infinite
            ? `Chào ${studentName}! Phương trình này rút gọn được không bằng không nên đúng với mọi giá trị của x nhé!`
            : `Chào ${studentName}! Phương trình này rút gọn có hệ số của x bằng không nhưng vế phải khác không, nên phương trình vô nghiệm nhé!`,
          isExactDeterministic: true,
        },
      };
    }

    const root = -b / a;
    const checkDiff = evalDiff(root);
    if (checkDiff === null || Math.abs(checkDiff) > 1e-5) return null;

    const fmtRoot = formatExactNumber(root);
    const fmtA = formatExactNumber(a);
    const fmtNegB = formatExactNumber(-b);
    const checkLhs = evalMathExpression(lhsExpr, { x: root });
    const fmtCheck = checkLhs !== null ? formatExactNumber(checkLhs).main : '';

    return {
      numericValue: root,
      result: {
        boardTitle: `Toán Lớp ${grade}: Giải Bài Toán Tìm X`,
        subject: 'toan',
        extractedText: `Tìm x, biết: ${lhsRaw} = ${rhsRaw}`,
        coreConcept: 'Quy tắc chuyển vế đổi dấu: Đưa về dạng a · x = c ⇒ x = c : a',
        steps: [
          {
            stepNumber: 1,
            title: 'Bước 1: Thu gọn và chuyển các số hạng chứa x về một vế',
            content: `Biến đổi phương trình đã cho, chuyển hạng tử chứa x sang vế trái và hằng số sang vế phải.`,
            formula: `${lhsRaw} = ${rhsRaw}  ⇔  ${fmtA.main} · x = ${fmtNegB.main}`,
          },
          {
            stepNumber: 2,
            title: 'Bước 2: Tìm giá trị của x',
            content: `Chia cả hai vế cho hệ số ${fmtA.main} để tìm x.`,
            formula: `x = ${fmtNegB.main} : ${fmtA.main} = ${fmtRoot.main}`,
          },
          {
            stepNumber: 3,
            title: 'Bước 3: Thử lại kết quả vào đề bài',
            content: `Thay x = ${fmtRoot.main} vào phương trình ban đầu${fmtCheck ? `, hai vế đều bằng ${fmtCheck}` : ''} (thỏa mãn).`,
            formula: `Vậy x = ${fmtRoot.main}`,
          },
        ],
        finalAnswer: `Kết luận: x = ${fmtRoot.main}`,
        teacherAdvice: 'Khi chuyển một số hạng từ vế này sang vế kia của dấu bằng, em nhớ luôn đổi dấu (+ thành -, - thành +) nhé!',
        spokenExplanation: `Chào ${studentName}! Bài tìm x này ta thu gọn về dạng ${fmtA.spoken} nhân x bằng ${fmtNegB.spoken}. Lấy ${fmtNegB.spoken} chia cho ${fmtA.spoken}, ta tìm được kết quả cuối cùng x bằng ${fmtRoot.spoken} nhé!`,
        isExactDeterministic: true,
      },
    };
  }

  // CASE B: Quadratic equation a*x^2 + b*x + c = 0 (3rd difference = 0)
  const h4 = evalDiff(4);
  if (h4 !== null) {
    const d1_3 = h4 - h3;
    const d2_2 = d1_3 - d1_2;
    if (Math.abs(d2_1 - d2_0) < 1e-6 && Math.abs(d2_2 - d2_1) < 1e-6 && Math.abs(d2_0) > 1e-7) {
      const a = d2_0 / 2;
      const c = h0;
      const b = h1 - a - c;
      const delta = b * b - 4 * a * c;

      const fmtA = formatExactNumber(a).main;
      const fmtB = formatExactNumber(b).main;
      const fmtC = formatExactNumber(c).main;
      const fmtDelta = formatExactNumber(delta).main;

      if (delta < -1e-9) {
        return {
          result: {
            boardTitle: `Toán Lớp ${Math.max(grade, 9)}: Giải Phương Trình Bậc Hai`,
            subject: 'toan',
            extractedText: `${lhsRaw} = ${rhsRaw}`,
            coreConcept: 'Biệt thức Δ = b² - 4ac (Nếu Δ < 0 phương trình vô nghiệm thực)',
            steps: [
              {
                stepNumber: 1,
                title: 'Bước 1: Đưa về phương trình bậc hai chuẩn ax² + bx + c = 0',
                content: `Xác định các hệ số: a = ${fmtA}, b = ${fmtB}, c = ${fmtC}.`,
              },
              {
                stepNumber: 2,
                title: 'Bước 2: Tính biệt thức Δ (Delta)',
                content: `Áp dụng công thức Δ = b² - 4ac, ta được Δ = ${fmtDelta} < 0.`,
                formula: `Δ = (${fmtB})² - 4·(${fmtA})·(${fmtC}) = ${fmtDelta} < 0`,
              },
            ],
            finalAnswer: 'Kết luận: Phương trình vô nghiệm thực (vì Δ < 0).',
            teacherAdvice: 'Luôn kiểm tra dấu của hệ số a và c cẩn thận khi tính -4ac nhé!',
            spokenExplanation: `Chào ${studentName}! Phương trình bậc hai này có biệt thức Delta bằng ${formatExactNumber(delta).spoken} nhỏ hơn 0, nên kết luận phương trình vô nghiệm thực nhé!`,
            isExactDeterministic: true,
          },
        };
      }

      if (Math.abs(delta) <= 1e-9) {
        const x0 = -b / (2 * a);
        const fmtX0 = formatExactNumber(x0);
        return {
          numericValue: x0,
          result: {
            boardTitle: `Toán Lớp ${Math.max(grade, 9)}: Giải Phương Trình Bậc Hai`,
            subject: 'toan',
            extractedText: `${lhsRaw} = ${rhsRaw}`,
            coreConcept: 'Δ = b² - 4ac = 0 ⇒ Nghiệm kép x₁ = x₂ = -b / (2a)',
            steps: [
              {
                stepNumber: 1,
                title: 'Bước 1: Xác định hệ số a, b, c',
                content: `Phương trình có hệ số a = ${fmtA}, b = ${fmtB}, c = ${fmtC}.`,
              },
              {
                stepNumber: 2,
                title: 'Bước 2: Tính biệt thức Δ = 0 và tìm nghiệm kép',
                content: `Vì Δ = 0 nên phương trình có nghiệm kép duy nhất.`,
                formula: `x₁ = x₂ = -(${fmtB}) / (2·${fmtA}) = ${fmtX0.main}`,
              },
            ],
            finalAnswer: `Kết luận: Phương trình có nghiệm kép x₁ = x₂ = ${fmtX0.main}`,
            teacherAdvice: 'Em có thể nhận ra hằng đẳng thức bình phương của một tổng/hiệu khi Δ = 0!',
            spokenExplanation: `Chào ${studentName}! Phương trình có Delta bằng 0 nên có nghiệm kép x bằng ${fmtX0.spoken} nhé!`,
            isExactDeterministic: true,
          },
        };
      }

      const sqrtDelta = Math.sqrt(delta);
      const x1 = (-b + sqrtDelta) / (2 * a);
      const x2 = (-b - sqrtDelta) / (2 * a);
      const fmtX1 = formatExactNumber(x1);
      const fmtX2 = formatExactNumber(x2);

      return {
        numericValue: x1,
        result: {
          boardTitle: `Toán Lớp ${Math.max(grade, 9)}: Giải Phương Trình Bậc Hai`,
          subject: 'toan',
          extractedText: `${lhsRaw} = ${rhsRaw}`,
          coreConcept: 'Δ = b² - 4ac > 0 ⇒ x₁,₂ = (-b ± √Δ) / (2a)',
          steps: [
            {
              stepNumber: 1,
              title: 'Bước 1: Xác định các hệ số của phương trình bậc hai',
              content: `Đưa phương trình về dạng chuẩn ax² + bx + c = 0 với: a = ${fmtA}, b = ${fmtB}, c = ${fmtC}.`,
            },
            {
              stepNumber: 2,
              title: 'Bước 2: Tính biệt thức Δ (Delta)',
              content: `Δ = (${fmtB})² - 4 · (${fmtA}) · (${fmtC}) = ${fmtDelta} > 0, suy ra √Δ = ${formatExactNumber(sqrtDelta).main}.`,
              formula: `Δ = ${fmtDelta} > 0  ⇒  Phương trình có 2 nghiệm phân biệt`,
            },
            {
              stepNumber: 3,
              title: 'Bước 3: Tính hai nghiệm x₁ và x₂',
              content: `Áp dụng công thức nghiệm phương trình bậc hai:`,
              formula: `x₁ = ${fmtX1.main}  ;  x₂ = ${fmtX2.main}`,
            },
          ],
          finalAnswer: `Kết luận: Phương trình có 2 nghiệm phân biệt: x₁ = ${fmtX1.main} ; x₂ = ${fmtX2.main}`,
          teacherAdvice: 'Sau khi giải xong, em nhẩm nhanh tổng x₁ + x₂ = -b/a và tích x₁·x₂ = c/a theo định lý Viète để kiểm tra kết quả ngay nhé!',
          spokenExplanation: `Chào ${studentName}! Phương trình bậc hai này có Delta bằng ${fmtDelta} lớn hơn 0, nên có hai nghiệm phân biệt là x một bằng ${fmtX1.spoken} và x hai bằng ${fmtX2.spoken} nhé!`,
          isExactDeterministic: true,
        },
      };
    }
  }

  return null;
}

// ============================================================================
// 4. CLASSIC WORD PROBLEMS SOLVER (Tổng - Hiệu, Hình Học, Chuyển Động)
// ============================================================================

function trySolveWordProblemDeterministically(
  rawPrompt: string,
  grade: number,
  studentName: string
): { result: SolvedBoardResult; numericValue?: number } | null {
  const lower = rawPrompt.toLowerCase();

  // Hình chữ nhật: chiều dài ... chiều rộng ...
  if (lower.includes('hình chữ nhật')) {
    const daiMatch = lower.match(/chiều\s+dài[^0-9]{1,25}(\d+(?:[.,]\d+)?)\s*(cm|m|dm|mm)?/i);
    const rongMatch = lower.match(/chiều\s+rộng[^0-9]{1,25}(\d+(?:[.,]\d+)?)\s*(cm|m|dm|mm)?/i);
    if (daiMatch && rongMatch) {
      const a = Number(daiMatch[1].replace(',', '.'));
      const b = Number(rongMatch[1].replace(',', '.'));
      const unit = daiMatch[2] || rongMatch[2] || 'cm';
      if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
        const chuVi = Number(((a + b) * 2).toFixed(4));
        const dienTich = Number((a * b).toFixed(4));
        const askAreaOnly = lower.includes('diện tích') && !lower.includes('chu vi');
        const askPerimOnly = lower.includes('chu vi') && !lower.includes('diện tích');

        const steps: SolvedBoardStep[] = [];
        if (!askAreaOnly) {
          steps.push({
            stepNumber: steps.length + 1,
            title: `Bước ${steps.length + 1}: Tính chu vi hình chữ nhật`,
            content: `Lấy chiều dài (${a} ${unit}) cộng chiều rộng (${b} ${unit}) rồi nhân với 2.`,
            formula: `P = (${a} + ${b}) × 2 = ${chuVi} (${unit})`,
          });
        }
        if (!askPerimOnly) {
          steps.push({
            stepNumber: steps.length + 1,
            title: `Bước ${steps.length + 1}: Tính diện tích hình chữ nhật`,
            content: `Lấy chiều dài (${a} ${unit}) nhân với chiều rộng (${b} ${unit}).`,
            formula: `S = ${a} × ${b} = ${dienTich} (${unit}²)`,
          });
        }

        const primaryVal = askAreaOnly ? dienTich : chuVi;
        const finalStr = askAreaOnly
          ? `Kết luận: Diện tích hình chữ nhật là ${dienTich} ${unit}²`
          : askPerimOnly
          ? `Kết luận: Chu vi hình chữ nhật là ${chuVi} ${unit}`
          : `Kết luận: Chu vi = ${chuVi} ${unit} ; Diện tích = ${dienTich} ${unit}²`;

        return {
          numericValue: primaryVal,
          result: {
            boardTitle: `Hình Học Lớp ${grade}: Hình Chữ Nhật`,
            subject: 'toan',
            extractedText: rawPrompt.trim(),
            coreConcept: 'Chu vi: P = (a + b) × 2   |   Diện tích: S = a × b',
            steps,
            finalAnswer: finalStr,
            teacherAdvice: 'Em nhớ để chiều dài và chiều rộng cùng đơn vị đo trước khi tính nhé!',
            spokenExplanation: `Chào ${studentName}! Hình chữ nhật có chiều dài ${a} ${unit} và chiều rộng ${b} ${unit}, kết quả ${
              askAreaOnly
                ? `diện tích bằng ${dienTich} ${unit} vuông`
                : askPerimOnly
                ? `chu vi bằng ${chuVi} ${unit}`
                : `chu vi bằng ${chuVi} ${unit} và diện tích bằng ${dienTich} ${unit} vuông`
            } nhé!`,
            isExactDeterministic: true,
          },
        };
      }
    }
  }

  // Tổng và Hiệu: "tổng ... là 120 ... hiệu ... là 20"
  const tongMatch = lower.match(/tổng[^0-9]{1,35}(\d+(?:[.,]\d+)?)/i);
  const hieuMatch = lower.match(/hiệu[^0-9]{1,35}(\d+(?:[.,]\d+)?)/i);
  if (tongMatch && hieuMatch) {
    const sum = Number(tongMatch[1].replace(',', '.'));
    const diff = Number(hieuMatch[1].replace(',', '.'));
    if (Number.isFinite(sum) && Number.isFinite(diff) && sum >= diff) {
      const small = (sum - diff) / 2;
      const big = (sum + diff) / 2;
      const fSmall = formatExactNumber(small);
      const fBig = formatExactNumber(big);
      return {
        numericValue: big,
        result: {
          boardTitle: `Toán Lớp ${grade}: Tìm Hai Số Khi Biết Tổng Và Hiệu`,
          subject: 'toan',
          extractedText: rawPrompt.trim(),
          coreConcept: 'Số bé = (Tổng - Hiệu) : 2   |   Số lớn = (Tổng + Hiệu) : 2',
          steps: [
            {
              stepNumber: 1,
              title: 'Bước 1: Tính số bé',
              content: `Áp dụng công thức lấy tổng (${sum}) trừ đi hiệu (${diff}) rồi chia cho 2.`,
              formula: `Số bé = (${sum} - ${diff}) : 2 = ${formatExactNumber(sum - diff).main} : 2 = ${fSmall.main}`,
            },
            {
              stepNumber: 2,
              title: 'Bước 2: Tính số lớn',
              content: `Lấy số bé cộng với hiệu (hoặc lấy tổng trừ số bé).`,
              formula: `Số lớn = ${fSmall.main} + ${diff} = ${fBig.main}`,
            },
          ],
          finalAnswer: `Kết luận: Số bé = ${fSmall.main} ; Số lớn = ${fBig.main}`,
          teacherAdvice: 'Em thử lại bằng cách cộng hai số vừa tìm được xem có đúng bằng Tổng đề bài cho không nhé!',
          spokenExplanation: `Chào ${studentName}! Với bài toán tổng hiệu này, số bé bằng ${fSmall.spoken} và số lớn bằng ${fBig.spoken} nhé!`,
          isExactDeterministic: true,
        },
      };
    }
  }

  // Hình tròn khi biết bán kính r = ...
  const circleMatch = lower.match(/(?:hình\s+tròn).*?(?:bán\s+kính|r\s*=)\s*(\d+(?:[.,]\d+)?)\s*(cm|m|dm|mm)?/i);
  if (circleMatch) {
    const r = Number(circleMatch[1].replace(',', '.'));
    const unit = circleMatch[2] || 'cm';
    if (Number.isFinite(r) && r > 0) {
      const chuVi = Number((2 * 3.14 * r).toFixed(4));
      const dienTich = Number((r * r * 3.14).toFixed(4));
      const askAreaOnly = lower.includes('diện tích') && !lower.includes('chu vi');
      const askPerimOnly = lower.includes('chu vi') && !lower.includes('diện tích');

      const steps: SolvedBoardStep[] = [];
      if (!askAreaOnly) {
        steps.push({
          stepNumber: steps.length + 1,
          title: `Bước ${steps.length + 1}: Tính chu vi hình tròn`,
          content: `Lấy bán kính r = ${r} ${unit} nhân 2 rồi nhân với 3,14.`,
          formula: `C = ${r} × 2 × 3,14 = ${chuVi} (${unit})`,
        });
      }
      if (!askPerimOnly) {
        steps.push({
          stepNumber: steps.length + 1,
          title: `Bước ${steps.length + 1}: Tính diện tích hình tròn`,
          content: `Lấy bán kính r = ${r} ${unit} nhân với chính nó rồi nhân với 3,14.`,
          formula: `S = ${r} × ${r} × 3,14 = ${dienTich} (${unit}²)`,
        });
      }

      const finalStr = askAreaOnly
        ? `Kết luận: Diện tích hình tròn S = ${dienTich} ${unit}²`
        : askPerimOnly
        ? `Kết luận: Chu vi hình tròn C = ${chuVi} ${unit}`
        : `Kết luận: Chu vi C = ${chuVi} ${unit} ; Diện tích S = ${dienTich} ${unit}²`;

      return {
        numericValue: askPerimOnly ? chuVi : dienTich,
        result: {
          boardTitle: `Hình Học Lớp ${grade}: Chu Vi & Diện Tích Hình Tròn`,
          subject: 'toan',
          extractedText: rawPrompt.trim(),
          coreConcept: 'Chu vi: C = r × 2 × 3,14   |   Diện tích: S = r × r × 3,14',
          steps,
          finalAnswer: finalStr,
          teacherAdvice: 'Em nhớ đơn vị diện tích luôn có số mũ 2 (như cm², m²) nhé!',
          spokenExplanation: `Chào ${studentName}! Với hình tròn bán kính ${r} ${unit}, ${
            askAreaOnly
              ? `diện tích bằng ${String(dienTich).replace('.', ' phẩy ')} ${unit} vuông`
              : askPerimOnly
              ? `chu vi bằng ${String(chuVi).replace('.', ' phẩy ')} ${unit}`
              : `chu vi bằng ${String(chuVi).replace('.', ' phẩy ')} ${unit} và diện tích bằng ${String(dienTich).replace('.', ' phẩy ')} ${unit} vuông`
          } nhé!`,
          isExactDeterministic: true,
        },
      };
    }
  }

  return null;
}

// ============================================================================
// 5. MULTI-PART / LONG EXAM SPLITTER & OFFLINE STRUCTURED ANALYZER
// ============================================================================

function splitMultiPartQuestions(rawPrompt: string): string[] {
  const lines = rawPrompt.trim();
  if (lines.length < 30) return [lines];

  // Split by numbered questions like "Câu 1:", "Câu 2:", "Bài 1:", "Bài 2:" and ignore non-question preamble
  const rawParts = lines
    .split(/(?=(?:^|\n)\s*(?:Câu|Bài|Question)\s*\d+\s*[:.)])/i)
    .map((p) => p.trim())
    .filter(Boolean);

  const numberedQuestions = rawParts.filter((p) =>
    /^(?:Câu|Bài|Question)\s*\d+\s*[:.)]/i.test(p)
  );

  if (numberedQuestions.length >= 2) {
    return numberedQuestions;
  }
  return [lines];
}

/**
 * Main Problem Solver Entrypoint (Client Zero-Latency Fast-Path + Offline/Server Fallback)
 * - Never returns generic "A + B = C" placeholders.
 * - Produces exact numeric answers or exact multiple-choice letters whenever solvable deterministically.
 */
export function solveProblemLocally(params: {
  prompt: string;
  grade: number;
  subject: string;
  studentName?: string;
}): SolvedBoardResult {
  const { prompt, grade, subject, studentName = 'em' } = params;
  const cleanPrompt = (prompt || '').trim();

  if (!cleanPrompt) {
    return {
      boardTitle: `Bảng Xanh Lớp ${grade} • Phân Tích Đề Bài`,
      subject,
      extractedText: 'Đề bài từ hình ảnh tài liệu đã chọn',
      coreConcept: 'Quan sát đề bài rõ nét và phân tích dữ kiện từng phần',
      steps: [
        {
          stepNumber: 1,
          title: 'Bước 1: Đọc dữ kiện trên ảnh tài liệu',
          content: 'Nếu kết nối máy chủ đang khởi động lại, em hãy gõ tóm tắt phép tính hoặc câu hỏi vào ô bên trái để Thầy tính ngay lập tức nhé!',
        },
      ],
      finalAnswer: 'Vui lòng nhập kèm nội dung phép tính/câu hỏi hoặc bấm giải lại sau vài giây.',
      teacherAdvice: 'Gõ trực tiếp phép tính hoặc câu trắc nghiệm giúp bảng tính kết quả tức thì trong 0.01 giây!',
      spokenExplanation: `Chào ${studentName}, em có thể gõ phép tính hoặc câu hỏi vào ô để thầy tính kết quả ngay lập tức lên bảng nhé!`,
      isExactDeterministic: false,
    };
  }

  // Check if multi-part exam (e.g. Câu 1 ... Câu 2 ... Câu 3 ...)
  const subQuestions = splitMultiPartQuestions(cleanPrompt);
  if (subQuestions.length >= 2) {
    const subSteps: SolvedBoardStep[] = [];
    const finalSummaries: string[] = [];
    let solvedCount = 0;

    subQuestions.forEach((subQ, idx) => {
      const labelMatch = subQ.match(/^(?:Câu|Bài|Question)\s*(\d+)/i);
      const qLabel = labelMatch ? `Câu ${labelMatch[1]}` : `Ý ${idx + 1}`;
      const bodyOnly = subQ.replace(/^(?:Câu|Bài|Question)\s*\d+\s*[:.)]\s*/i, '').trim();

      const subMcq = trySolveMultipleChoiceDeterministically(bodyOnly, grade, subject, studentName);
      const subEq = !subMcq ? trySolveLinearOrQuadraticEquation(bodyOnly, grade, studentName) : null;
      const subArith = !subMcq && !subEq ? trySolvePureArithmetic(bodyOnly, grade, studentName) : null;
      const subPct = !subMcq && !subEq && !subArith ? trySolvePercentageExpr(bodyOnly, grade, studentName) : null;
      const subWord =
        !subMcq && !subEq && !subArith && !subPct
          ? trySolveWordProblemDeterministically(bodyOnly, grade, studentName)
          : null;

      const deterministicHit = subMcq || subEq?.result || subArith?.result || subPct?.result || subWord?.result;
      if (deterministicHit) {
        solvedCount++;
        const conciseAns = deterministicHit.finalAnswer.replace(/^Kết\s*(?:luận|quả(?:\s*cuối\s*cùng)?)\s*:\s*/i, '');
        finalSummaries.push(`${qLabel}: ${conciseAns}`);
        subSteps.push({
          stepNumber: idx + 1,
          title: `${qLabel}: ${bodyOnly.slice(0, 90)}${bodyOnly.length > 90 ? '...' : ''}`,
          content: deterministicHit.steps.map((s) => s.content).join(' '),
          formula: `${conciseAns}`,
        });
      } else {
        subSteps.push({
          stepNumber: idx + 1,
          title: `${qLabel}: Phân tích yêu cầu`,
          content: bodyOnly.slice(0, 220),
        });
      }
    });

    if (solvedCount === subQuestions.length) {
      return {
        boardTitle: `Giải Đề Tổng Hợp Lớp ${grade} (${subQuestions.length} Câu)`,
        subject,
        extractedText: cleanPrompt,
        coreConcept: 'Phân tách từng câu trong đề dài và giải dứt điểm từng phần',
        steps: subSteps,
        finalAnswer: `Kết quả toàn bài: ${finalSummaries.join('  |  ')}`,
        teacherAdvice: 'Với đề dài nhiều câu, em làm chắc chắn từng câu từ dễ đến khó và kiểm tra lại đáp án mỗi câu nhé!',
        spokenExplanation: `Chào ${studentName}! Đề bài có ${subQuestions.length} câu, thầy đã giải chi tiết từng câu và tổng hợp đầy đủ đáp số ngay trên bảng cho em rồi nhé!`,
        isExactDeterministic: true,
      };
    }
  }

  // 1. Multiple-choice deterministic check
  const mcqSolved = trySolveMultipleChoiceDeterministically(cleanPrompt, grade, subject, studentName);
  if (mcqSolved) return mcqSolved;

  // 2. Linear / Quadratic equation check
  const eqSolved = trySolveLinearOrQuadraticEquation(cleanPrompt, grade, studentName);
  if (eqSolved) return eqSolved.result;

  // 3. Percentage expression check
  const pctSolved = trySolvePercentageExpr(cleanPrompt, grade, studentName);
  if (pctSolved) return pctSolved.result;

  // 4. Pure arithmetic expression check (e.g. "1 + 1", "1 + 1 = 2", "(15 + 5) * 4")
  const arithSolved = trySolvePureArithmetic(cleanPrompt, grade, studentName);
  if (arithSolved) return arithSolved.result;

  // 5. Classic word problems check
  const wordSolved = trySolveWordProblemDeterministically(cleanPrompt, grade, studentName);
  if (wordSolved) return wordSolved.result;

  // 6. Non-deterministic fallback (used ONLY if backend AI is completely unreachable offline)
  // Still inspects actual numbers or MCQ options in the prompt instead of generic "A + B = C"
  const parsedMcq = parseMultipleChoiceQuestion(cleanPrompt);
  if (parsedMcq) {
    return {
      boardTitle: `Phân Tích Câu Trắc Nghiệm Lớp ${grade}`,
      subject,
      extractedText: cleanPrompt,
      coreConcept: 'Phân tích từ khóa câu hỏi và loại trừ phương án sai',
      steps: [
        {
          stepNumber: 1,
          title: 'Bước 1: Xác định nội dung câu hỏi chính',
          content: `Câu hỏi yêu cầu: "${parsedMcq.stem}".`,
        },
        {
          stepNumber: 2,
          title: 'Bước 2: So sánh các phương án được đưa ra',
          content: `Các lựa chọn gồm: ${parsedMcq.choices.map((c) => `${c.letter}. ${c.text}`).join('; ')}. Máy chủ AI đang tạm thời khởi động lại, em hãy nhấn "Thầy Giải Bài Lên Bảng" lần nữa sau vài giây để nhận phân tích chuyên sâu cho câu lý thuyết này nhé!`,
        },
      ],
      finalAnswer: `Đang chờ máy chủ AI xác nhận phương án đúng trong (${parsedMcq.choices.map((c) => c.letter).join(', ')}) — nhấn Giải lại sau vài giây.`,
      teacherAdvice: 'Với câu hỏi lý thuyết dài, máy chủ Render có thể cần vài giây đầu tiên để thức dậy!',
      spokenExplanation: `Chào ${studentName}, máy chủ đang khởi động lại, em bấm giải lại sau vài giây để thầy chốt đáp án trắc nghiệm lý thuyết này nhé!`,
      isExactDeterministic: false,
    };
  }

  return {
    boardTitle: `Phân Tích Bài Học Lớp ${grade}`,
    subject,
    extractedText: cleanPrompt,
    coreConcept: 'Đọc kỹ dữ kiện đề bài và giải quyết từng yêu cầu cụ thể',
    steps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Tóm tắt nội dung câu hỏi của học sinh',
        content: `Yêu cầu cần giải quyết: "${cleanPrompt.slice(0, 280)}${cleanPrompt.length > 280 ? '...' : ''}".`,
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Kết nối máy chủ phân tích chuyên sâu',
        content:
          'Máy chủ đang khởi động kết nối (trên GitHub Pages lần đầu gọi có thể mất 5-15 giây). Em nhấn nút "Thầy Giải Bài Lên Bảng" thêm một lần nữa để nhận lời giải đầy đủ nhé!',
      },
    ],
    finalAnswer: 'Máy chủ đang thức dậy — vui lòng nhấn Giải lại để nhận đáp án chi tiết cho câu hỏi tự luận này.',
    teacherAdvice: 'Các phép tính Toán, tìm X và trắc nghiệm tính toán luôn có kết quả tức thì ngay lập tức!',
    spokenExplanation: `Chào ${studentName}, máy chủ đang kết nối, em nhấn giải lại một lần nữa nhé!`,
    isExactDeterministic: false,
  };
}
